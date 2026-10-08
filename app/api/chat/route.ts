import { guard } from "@/lib/guard";
import { hit, limited } from "@/lib/ratelimit";
import { after } from "next/server";
import { db } from "@/lib/supabase";
import { gemini, embed, pickModel, FAST_MODEL, LITE_THINKING } from "@/lib/gemini";
import { toPrompt, type FinRow } from "@/lib/financials";
import { buildSystemPrompt, PROFILE_EXTRACT_PROMPT, ToolMode, TOOLS } from "@/lib/persona";

export const runtime = "nodejs";
export const maxDuration = 60;

const META_SEP = "\u0000DDMETA";
const CTA_TAG = /\n?\s*\[\[CTA\]\]\s*/g;
const PAIN_RE =
  /(אין לי לקוחות|אין לקוחות|המחזור ירד|ירידה במחזור|תקוע|תקועה|במינוס|הפסדים|חובות|לסגור את העסק|נשחקתי|שחוק|ליווי|פגישה|כמה זה עולה|לעבוד איתך|לעבוד אתכם|שותף|גיוס כסף|משקיע)/;
const CTA_COOLDOWN = 4; // assistant turns between CTAs
const MAX_MSG_LEN = 4000;

type Turn = { role: "user" | "assistant"; content: string; cta: boolean };
type Attachment = { name: string; mime: string; data?: string; text?: string };

const INLINE_MIME = /^(image\/(png|jpe?g|webp|heic|heif)|application\/pdf)$/;
const MAX_INLINE_BYTES = 3_600_000; // stay under Vercel's 4.5MB body limit
const MAX_TEXT_CHARS = 40_000;

function parseAttachments(raw: unknown): Attachment[] {
  if (!Array.isArray(raw)) return [];
  let budget = MAX_INLINE_BYTES;
  const out: Attachment[] = [];
  for (const a of raw.slice(0, 5)) {
    if (!a || typeof a !== "object") continue;
    const o = a as Record<string, unknown>;
    const name = String(o.name ?? "קובץ").slice(0, 120);
    const mime = String(o.mime ?? "");
    if (typeof o.text === "string" && o.text.trim()) {
      out.push({ name, mime, text: o.text.slice(0, MAX_TEXT_CHARS) });
    } else if (typeof o.data === "string" && INLINE_MIME.test(mime)) {
      const bytes = Math.floor((o.data.length * 3) / 4);
      if (bytes > budget) continue;
      budget -= bytes;
      out.push({ name, mime, data: o.data });
    }
  }
  return out;
}

export async function POST(req: Request) {
  const gate = await guard("chat", 80, 60);
  if (gate instanceof Response) return gate;
  const userId = gate;

  const body = await req.json().catch(() => ({}));
  const attachments = parseAttachments(body.attachments);
  const voice = body.voice === true;
  const text = (String(body.message ?? "").trim() || (attachments.length ? "תסתכל על מה שצירפתי ותגיד לי מה אתה רואה." : "")).slice(0, MAX_MSG_LEN);
  const requestedMode = String(body.mode ?? "chat") as ToolMode;
  const mode: ToolMode = TOOLS.some((t) => t.id === requestedMode) ? requestedMode : "chat";
  if (!text) return new Response("empty", { status: 400 });

  // daily caps per user (protects the budget): 100 messages a day, of which up to 60 voice answers (~20 minutes of talk)
  const capKey = `u:${userId}`;
  const [dayFull, voiceFull] = await Promise.all([limited(capKey, "chat", 100, 60 * 24), voice ? limited(capKey, "voice", 60, 60 * 24) : Promise.resolve(false)]);
  if (dayFull || voiceFull) {
    return new Response(JSON.stringify({ error: "daily_cap", message: voiceFull ? "הגעת למכסת השיחות הקוליות להיום. נמשיך מחר – או בכתב בצ'אט." : "הגעת למכסת ההודעות להיום. נמשיך מחר 🙂" }), { status: 429, headers: { "Content-Type": "application/json" } });
  }
  if (voice) void hit(capKey, "voice").catch(() => {});

  const supabase = db();

  // ---- retrieval helpers (declared early so voice can start embedding right away) ----
  let knowledge: { source: string; content: string; id: number; similarity: number }[] = [];
  let golden: { question: string; answer: string }[] = [];
  let topSimilarity: number | null = null;
  const retrieve = async (query: string) => {
    try {
      const qEmb = await embed(query, "RETRIEVAL_QUERY");
      const [k, g] = await Promise.all([
        supabase.rpc("match_knowledge", { query_embedding: qEmb, match_count: voice ? 3 : 4, min_similarity: 0.45 }),
        supabase.rpc("match_golden", { query_embedding: qEmb, match_count: 2, min_similarity: 0.75 }),
      ]);
      knowledge = (k.data ?? []) as typeof knowledge;
      golden = (g.data ?? []) as typeof golden;
      topSimilarity = knowledge[0]?.similarity ?? null;
    } catch (e) {
      console.error("retrieval failed", e);
    }
  };
  // cost saver: a greeting / one-word message doesn't need a knowledge search (saves the embedding call)
  const trivial = text.replace(/[^\p{L}\p{N}]/gu, "").length < 12 && !attachments.length;
  const voiceRetrieval = voice && !trivial ? retrieve(text) : null;

  // ---- user + conversation, in parallel ----
  let conversationId: string | null = body.conversationId ?? null;
  let conv: { id: string; mode: string; cta_shown_count: number; lead_submitted: boolean } | null = null;
  const [{ data: user }, convRes, { data: finRows }] = await Promise.all([
    supabase.from("users").select("id, full_name, profile").eq("id", userId).single(),
    conversationId
      ? supabase
          .from("conversations")
          .select("id, mode, cta_shown_count, lead_submitted")
          .eq("id", conversationId)
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("financials").select("period, data").eq("user_id", userId).order("period", { ascending: false }).limit(3),
  ]);
  if (!user) return new Response("unauthorized", { status: 401 });
  conv = convRes.data;
  if (!conv) {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: userId, mode, title: text.slice(0, 60) })
      .select("id, mode, cta_shown_count, lead_submitted")
      .single();
    if (error || !data) return new Response("db error", { status: 500 });
    conv = data;
  }
  conversationId = conv.id;
  const activeMode = (body.mode ? mode : (conv.mode as ToolMode)) || "chat";

  const historyP = supabase
    .from("messages")
    .select("role, content, cta")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(voice ? 10 : 24);

  let history: Turn[];
  if (voice) {
    const [{ data: historyRows }] = await Promise.all([historyP, voiceRetrieval]);
    history = ((historyRows ?? []) as Turn[]).reverse();
  } else {
    const { data: historyRows } = await historyP;
    history = ((historyRows ?? []) as Turn[]).reverse();
    if (!trivial) await retrieve([...history.filter((h) => h.role === "user").slice(-2).map((h) => h.content), text].join("\n"));
  }

  // save user message (not awaited – the stream starts right away; awaited before the reply is saved)
  const saveUserMsg = Promise.resolve(supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: text,
    top_similarity: topSimilarity,
    attachments: attachments.map((a) => ({ name: a.name, mime: a.mime, kind: a.data ? (a.mime === "application/pdf" ? "pdf" : "image") : "doc" })),
  }));

  const systemInstruction = buildSystemPrompt({
    voice,
    hasAttachments: attachments.length > 0,
    mode: activeMode,
    userName: user.full_name,
    // a bare greeting gets no stored profile, so the bot doesn't jump to old assumptions
    profile: text.replace(/[^\p{L}]/gu, "").length < 8 ? null : ((user.profile as Record<string, unknown>) ?? null),
    knowledge: knowledge.map((k) => ({ source: k.source, content: k.content })),
    goldenAnswers: golden,
    financials: trivial ? "" : toPrompt(((finRows ?? []) as FinRow[]).slice().reverse()),
  });

  const route = pickModel({ voice, mode: activeMode, hasAttachments: attachments.length > 0, textLength: text.length });
  const contents = [
    // cost saver: shorter history, and long old answers are trimmed (the model already wrote them)
    ...history.slice(voice ? -8 : -12).map((h) => ({ role: h.role === "assistant" ? "model" : "user", parts: [{ text: h.role === "assistant" && h.content.length > 1500 ? h.content.slice(0, 1500) + "…" : h.content }] })),
    {
      role: "user",
      parts: [
        ...attachments.map((a) =>
          a.data
            ? { inlineData: { mimeType: a.mime, data: a.data } }
            : { text: `📎 קובץ מצורף: ${a.name}\n"""\n${a.text}\n"""` }
        ),
        { text: voice ? `${text}\n\n[שיחה קולית – תענה בדיבור: עד 3 משפטים קצרים, בלי רשימות, בלי כוכביות ובלי כותרות. רעיון אחד חזק ושאלה אחת.]` : text },
      ],
    },
  ];

  // ---- CTA rules (deterministic layer on top of the model's own tag) ----
  const assistantTurns = history.filter((h) => h.role === "assistant");
  const lastCtaIdx = assistantTurns.map((t) => t.cta).lastIndexOf(true);
  const turnsSinceCta = lastCtaIdx === -1 ? Infinity : assistantTurns.length - 1 - lastCtaIdx;
  const userTurns = history.filter((h) => h.role === "user").length + 1;
  const cooldownOk = turnsSinceCta >= CTA_COOLDOWN && !conv.lead_submitted;

  const encoder = new TextEncoder();
  const convRef = conv;
  let resolveDone: (trigger: string | null) => void = () => {};
  const done = new Promise<string | null>((r) => (resolveDone = r));

  // post-response work (runs after the stream finishes, kept alive by Vercel)
  after(async () => {
    const trigger = await done;
    await saveUserMsg;
    await supabase
      .from("conversations")
      .update({
        updated_at: new Date().toISOString(),
        ...(trigger ? { cta_shown_count: convRef.cta_shown_count + 1 } : {}),
      })
      .eq("id", conversationId);
    if (trigger) {
      await supabase.from("events").insert({ user_id: userId, conversation_id: conversationId, type: "cta_shown", meta: { trigger } });
    }
    await supabase.from("users").update({ last_seen_at: new Date().toISOString() }).eq("id", userId);
    // learn the business profile every 3 user turns
    // cost saver: learn the profile on the 2nd turn and then every 5th – and only when there's something concrete to learn
    const concrete = /\d/.test(text) || text.length > 80;
    if (concrete && (userTurns === 2 || userTurns % 5 === 0)) {
      await updateProfile(userId, (user.profile as Record<string, unknown>) ?? {}, [...history, { role: "user", content: text, cta: false }]);
    }
  });

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (t: string) => {
        if (closed || !t) return;
        try {
          controller.enqueue(encoder.encode(t));
        } catch {
          closed = true;
        }
      };
      let full = "";
      let usage: unknown = null;
      try {
        const response = await gemini().models.generateContentStream({
          model: route.model,
          contents,
          config: { systemInstruction, maxOutputTokens: voice ? 400 : ["workplan", "forecast", "sales_script", "feasibility", "campaign", "financials", "payslip"].includes(activeMode) ? 8192 : 2500, ...route.thinking },
        });
        let pending = "";
        for await (const chunk of response) {
          if (chunk.usageMetadata) usage = chunk.usageMetadata;
          const t = chunk.text ?? "";
          if (!t) continue;
          full += t;
          // hold back a small tail so a split "[[CTA]]" tag never reaches the client
          pending = (pending + t).replace(CTA_TAG, "");
          let cut = pending.length - 10;
          if (cut > 0) {
            // never split a surrogate pair (emoji) – that turns into "��" on the client
            const c = pending.charCodeAt(cut - 1);
            if (c >= 0xd800 && c <= 0xdbff) cut--;
            send(pending.slice(0, cut));
            pending = pending.slice(cut);
          }
        }
        send(pending.replace(CTA_TAG, ""));
      } catch (e) {
        console.error("gemini error", e);
        const fallback = full ? "\n\n(נקטעתי באמצע – תכתוב לי \"תמשיך\" ואמשיך מאיפה שעצרתי.)" : "משהו נתקע אצלי רגע. תנסה לשלוח שוב.";
        full += fallback;
        send(fallback);
      }

      const modelWantsCta = /\[\[CTA\]\]/.test(full);
      const clean = full.replace(CTA_TAG, "").trim();
      let trigger: string | null = null;
      if (cooldownOk && !voice) {
        // not on the first answer – earn the right to offer a meeting first
        if (modelWantsCta && userTurns >= 3) trigger = "model";
        else if (PAIN_RE.test(text) && userTurns >= 3) trigger = "pain_keyword";
        else if (userTurns >= 6 && convRef.cta_shown_count === 0) trigger = "depth";
      }

      await saveUserMsg;
      const { data: saved, error: saveErr } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          role: "assistant",
          content: clean,
          cta: !!trigger,
          model: route.model,
          usage,
          sources: knowledge.map((k) => ({ id: k.id, source: k.source, similarity: Number(k.similarity.toFixed(3)) })),
        })
        .select("id")
        .single();
      if (saveErr) console.error("assistant save failed", saveErr.message);

      send(META_SEP + JSON.stringify({ conversationId, messageId: saved?.id ?? null, cta: trigger }));
      if (!closed) {
        try {
          controller.close();
        } catch {}
      }

      resolveDone(trigger);
    },
    cancel() {
      resolveDone(null);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Conversation-Id": conversationId,
    },
  });
}

async function updateProfile(userId: string, current: Record<string, unknown>, turns: Turn[]) {
  try {
    const transcript = turns
      .filter((t) => t.role === "user")
      .slice(-12)
      .map((t) => `משתמש: ${t.content}`)
      .join("\n");
    const res = await gemini().models.generateContent({
      model: FAST_MODEL,
      contents: [{ role: "user", parts: [{ text: `${PROFILE_EXTRACT_PROMPT}\n\nפרופיל קיים: ${JSON.stringify(current)}\n\n${transcript}` }] }],
      config: { responseMimeType: "application/json", ...LITE_THINKING },
    });
    const raw = JSON.parse(res.text ?? "{}") as Record<string, unknown>;
    const KEYS = ["business_type", "business_name", "years_active", "monthly_revenue", "employees", "main_channel", "avg_deal_price", "main_pain", "goal", "city"];
    const extracted: Record<string, string> = {};
    for (const k of KEYS) {
      const v = raw?.[k];
      if ((typeof v === "string" || typeof v === "number") && String(v).trim()) extracted[k] = String(v).trim().slice(0, 160);
    }
    if (Object.keys(extracted).length) {
      await db().from("users").update({ profile: { ...current, ...extracted } }).eq("id", userId);
    }
  } catch (e) {
    console.error("profile update failed", e);
  }
}

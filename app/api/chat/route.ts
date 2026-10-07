import { after } from "next/server";
import { db } from "@/lib/supabase";
import { getSessionUserId } from "@/lib/session";
import { gemini, CHAT_MODEL, embed, FAST_THINKING } from "@/lib/gemini";
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
  const userId = await getSessionUserId();
  if (!userId) return new Response("unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const attachments = parseAttachments(body.attachments);
  const voice = body.voice === true;
  const text = (String(body.message ?? "").trim() || (attachments.length ? "תסתכל על מה שצירפתי ותגיד לי מה אתה רואה." : "")).slice(0, MAX_MSG_LEN);
  const requestedMode = String(body.mode ?? "chat") as ToolMode;
  const mode: ToolMode = TOOLS.some((t) => t.id === requestedMode) ? requestedMode : "chat";
  if (!text) return new Response("empty", { status: 400 });

  const supabase = db();
  const { data: user } = await supabase.from("users").select("id, full_name, profile").eq("id", userId).single();
  if (!user) return new Response("unauthorized", { status: 401 });

  // ---- conversation ----
  let conversationId: string | null = body.conversationId ?? null;
  let conv: { id: string; mode: string; cta_shown_count: number; lead_submitted: boolean } | null = null;
  if (conversationId) {
    const { data } = await supabase
      .from("conversations")
      .select("id, mode, cta_shown_count, lead_submitted")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    conv = data;
  }
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

  const { data: historyRows } = await supabase
    .from("messages")
    .select("role, content, cta")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(40);
  const history: Turn[] = (historyRows ?? []) as Turn[];

  // ---- retrieval ----
  let knowledge: { source: string; content: string; id: number; similarity: number }[] = [];
  let golden: { question: string; answer: string }[] = [];
  let topSimilarity: number | null = null;
  try {
    const retrievalQuery = [...history.filter((h) => h.role === "user").slice(-2).map((h) => h.content), text].join("\n");
    const qEmb = await embed(retrievalQuery, "RETRIEVAL_QUERY");
    const [k, g] = await Promise.all([
      supabase.rpc("match_knowledge", { query_embedding: qEmb, match_count: 6, min_similarity: 0.45 }),
      supabase.rpc("match_golden", { query_embedding: qEmb, match_count: 2, min_similarity: 0.75 }),
    ]);
    knowledge = (k.data ?? []) as typeof knowledge;
    golden = (g.data ?? []) as typeof golden;
    topSimilarity = knowledge[0]?.similarity ?? null;
  } catch (e) {
    console.error("retrieval failed", e);
  }

  // save user message
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: text,
    top_similarity: topSimilarity,
    attachments: attachments.map((a) => ({ name: a.name, mime: a.mime, kind: a.data ? (a.mime === "application/pdf" ? "pdf" : "image") : "doc" })),
  });

  const systemInstruction = buildSystemPrompt({
    voice,
    hasAttachments: attachments.length > 0,
    mode: activeMode,
    userName: user.full_name,
    profile: (user.profile as Record<string, unknown>) ?? null,
    knowledge: knowledge.map((k) => ({ source: k.source, content: k.content })),
    goldenAnswers: golden,
  });

  const contents = [
    ...history.slice(-20).map((h) => ({ role: h.role === "assistant" ? "model" : "user", parts: [{ text: h.content }] })),
    {
      role: "user",
      parts: [
        ...attachments.map((a) =>
          a.data
            ? { inlineData: { mimeType: a.mime, data: a.data } }
            : { text: `📎 קובץ מצורף: ${a.name}\n"""\n${a.text}\n"""` }
        ),
        { text },
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
    if (userTurns % 3 === 1) {
      await updateProfile(userId, (user.profile as Record<string, unknown>) ?? {}, [...history, { role: "user", content: text, cta: false }]);
    }
  });

  const stream = new ReadableStream({
    async start(controller) {
      let full = "";
      try {
        const response = await gemini().models.generateContentStream({
          model: CHAT_MODEL,
          contents,
          config: { systemInstruction, maxOutputTokens: voice ? 1500 : 8192, ...FAST_THINKING },
        });
        let pending = "";
        for await (const chunk of response) {
          const t = chunk.text ?? "";
          if (!t) continue;
          full += t;
          // hold back a small tail so a split "[[CTA]]" tag never reaches the client
          pending += t;
          const safe = pending.length > 10 ? pending.slice(0, -10) : "";
          if (safe) {
            controller.enqueue(encoder.encode(safe.replace(CTA_TAG, "")));
            pending = pending.slice(safe.length);
          }
        }
        controller.enqueue(encoder.encode(pending.replace(CTA_TAG, "")));
      } catch (e) {
        console.error("gemini error", e);
        const fallback = "משהו נתקע אצלי רגע 🙈 תנסה לשלוח שוב.";
        full = fallback;
        controller.enqueue(encoder.encode(fallback));
      }

      const modelWantsCta = /\[\[CTA\]\]/.test(full);
      const clean = full.replace(CTA_TAG, "").trim();
      let trigger: string | null = null;
      if (cooldownOk && !voice) {
        if (modelWantsCta) trigger = "model";
        else if (PAIN_RE.test(text)) trigger = "pain_keyword";
        else if (userTurns >= 6 && convRef.cta_shown_count === 0) trigger = "depth";
      }

      const { data: saved } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          role: "assistant",
          content: clean,
          cta: !!trigger,
          sources: knowledge.map((k) => ({ id: k.id, source: k.source, similarity: Number(k.similarity.toFixed(3)) })),
        })
        .select("id")
        .single();

      controller.enqueue(
        encoder.encode(META_SEP + JSON.stringify({ conversationId, messageId: saved?.id ?? null, cta: trigger }))
      );
      controller.close();

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
      model: CHAT_MODEL,
      contents: [{ role: "user", parts: [{ text: `${PROFILE_EXTRACT_PROMPT}\n\nפרופיל קיים: ${JSON.stringify(current)}\n\n${transcript}` }] }],
      config: { responseMimeType: "application/json", ...FAST_THINKING },
    });
    const extracted = JSON.parse(res.text ?? "{}");
    if (extracted && typeof extracted === "object" && Object.keys(extracted).length) {
      await db().from("users").update({ profile: { ...current, ...extracted } }).eq("id", userId);
    }
  } catch (e) {
    console.error("profile update failed", e);
  }
}

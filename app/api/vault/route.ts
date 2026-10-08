import { guard } from "@/lib/guard";
import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { gemini, FAST_MODEL, LITE_THINKING } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 30;

const EXTRACT = `קיבלת תוצר שדובדבוט (יועץ עסקי) כתב לבעל עסק. החזר JSON בלבד:
{"title": "כותרת קצרה ותיאורית לתוצר, עד 6 מילים", "tasks": [{"text": "משימה אחת, פעולה ברורה, עד 14 מילים", "priority": "urgent" | "important"}]}
משימות: רק פעולות ביצוע קונקרטיות שמופיעות בתוצר (למשל מטבלת ביצוע, תוכנית 90 יום או צעדים הבאים). עד 10 משימות. "urgent" רק למה שמסומן דחוף/מיידי/שבוע ראשון. אם אין משימות – רשימה ריקה.`;

/** Pulls tasks out of a markdown action table ("מה אני הולך לעשות" / "משימה" column). No AI call. */
function tableTasks(md: string): { text: string; priority: string }[] {
  const lines = md.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("|"));
  const out: { text: string; priority: string }[] = [];
  let col = -1;
  let urgentCol = -1;
  for (const l of lines) {
    const cells = l.replace(/^\||\|$/g, "").split("|").map((c) => c.replace(/[*_`]/g, "").trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c) || !c)) continue;
    if (col < 0) {
      col = cells.findIndex((c) => /מה אני הולך לעשות|משימה|פעולה|מה עושים/.test(c));
      urgentCol = cells.findIndex((c) => /דחוף/.test(c));
      if (col < 0) return [];
      continue;
    }
    const text = cells[col];
    if (!text || text.length < 4) continue;
    const urgent = urgentCol >= 0 && /✓|✔|כן|x|v|דחוף|●|🔥/i.test(cells[urgentCol] ?? "");
    out.push({ text: text.slice(0, 200), priority: urgent ? "urgent" : "important" });
    if (out.length >= 10) break;
  }
  return out;
}

/** Save an assistant message to the user's business vault, and pull its action items into tasks. */
export async function POST(req: Request) {
  const gate = await guard("vault", 40, 60);
  if (gate instanceof Response) return gate;
  const userId = gate;
  const { messageId } = await req.json().catch(() => ({}));
  if (typeof messageId !== "string") return NextResponse.json({ error: "bad id" }, { status: 400 });

  const supabase = db();
  const { data: msg } = await supabase
    .from("messages")
    .select("id, content, role, conversation_id, conversations!inner(user_id, mode)")
    .eq("id", messageId)
    .maybeSingle();
  const conv = msg?.conversations as unknown as { user_id: string; mode: string } | undefined;
  if (!msg || msg.role !== "assistant" || conv?.user_id !== userId) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data: existing } = await supabase.from("deliverables").select("id, title").eq("user_id", userId).eq("message_id", messageId).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, id: existing.id, title: existing.title, tasks: 0, already: true });

  let title = msg.content.split("\n").find((l: string) => l.trim())?.replace(/[#*]/g, "").trim().slice(0, 60) || "תוצר מדובדבוט";
  // cost saver: a work plan already has an action table – read the tasks from it without calling the AI
  let tasks: { text: string; priority: string }[] = tableTasks(msg.content);
  if (!tasks.length && msg.content.length > 300) try {
    const res = await gemini().models.generateContent({
      model: FAST_MODEL,
      contents: [{ role: "user", parts: [{ text: `${EXTRACT}\n\nהתוצר:\n${msg.content.slice(0, 14000)}` }] }],
      config: { responseMimeType: "application/json", maxOutputTokens: 2000, ...LITE_THINKING },
    });
    const j = JSON.parse(res.text ?? "{}");
    if (typeof j.title === "string" && j.title.trim()) title = j.title.trim().slice(0, 80);
    if (Array.isArray(j.tasks)) {
      tasks = j.tasks
        .filter((t: { text?: unknown }) => typeof t?.text === "string" && t.text.trim())
        .slice(0, 10)
        .map((t: { text: string; priority?: string }) => ({ text: t.text.trim().slice(0, 200), priority: t.priority === "urgent" ? "urgent" : "important" }));
    }
  } catch (e) {
    console.error("vault extract failed", e);
  }

  const { data: d, error } = await supabase
    .from("deliverables")
    .insert({ user_id: userId, message_id: messageId, kind: conv?.mode ?? "chat", title, content: msg.content })
    .select("id")
    .single();
  if (error || !d) return NextResponse.json({ error: "db" }, { status: 500 });
  if (tasks.length) {
    await supabase.from("tasks").insert(tasks.map((t, i) => ({ user_id: userId, deliverable_id: d.id, text: t.text, priority: t.priority, position: i })));
  }
  await supabase.from("events").insert({ user_id: userId, conversation_id: msg.conversation_id, type: "deliverable_saved", meta: { kind: conv?.mode, tasks: tasks.length } });
  return NextResponse.json({ ok: true, id: d.id, title, tasks: tasks.length });
}

export async function DELETE(req: Request) {
  const gate = await guard("vault", 40, 60);
  if (gate instanceof Response) return gate;
  const userId = gate;
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string") return NextResponse.json({ error: "bad id" }, { status: 400 });
  await db().from("deliverables").delete().eq("id", id).eq("user_id", userId);
  return NextResponse.json({ ok: true });
}

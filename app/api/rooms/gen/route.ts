import { NextResponse } from "next/server";
import { Type } from "@google/genai";
import { guard } from "@/lib/guard";
import { db } from "@/lib/supabase";
import { gemini, FAST_MODEL, LITE_THINKING } from "@/lib/gemini";
import { BudgetExceeded } from "@/lib/budget";

export const runtime = "nodejs";
export const maxDuration = 60;

const str = { type: Type.STRING };
const strs = { type: Type.ARRAY, items: str };
const obj = (properties: Record<string, unknown>) => ({ type: Type.OBJECT, properties, required: Object.keys(properties) });

export type SalesScript = { opening: string; discovery: string[]; pitch: string; close: string; objections: { q: string; a: string }[]; tip: string };
export type SocialWeek = { days: { day: string; format: string; topic: string; hook: string; cta: string }[]; tip: string };

const VOICE = `אתה ניר דובדבני, יועץ עסקי עם 22 שנות ניסיון. כתוב בעברית פשוטה, ישירה ואנושית, משפטים קצרים, כמו שבעל עסק מדבר. בלי מקפים ארוכים. בלי "מובטח" ובלי סכומים מובטחים. בלי להמציא נתונים, ביקורות או לקוחות.`;

const TOOLS = {
  sales_script: {
    kind: "sales_script",
    schema: obj({ opening: str, discovery: strs, pitch: str, close: str, objections: { type: Type.ARRAY, items: obj({ q: str, a: str }) }, tip: str }),
    prompt: (f: Record<string, string>, biz: string) => `${VOICE}
בנה תסריט לשיחת מכירה בטלפון לבעל עסק קטן.
העסק: ${biz || "לא נאמר"}
מה מוכרים: ${f.product}
מי הלקוח שמתקשרים אליו: ${f.customer || "לא נאמר, תניח ליד שהשאיר פרטים"}
מחיר: ${f.price || "לא נאמר"}
תחזיר: opening (פתיחה של 2 עד 3 משפטים, מילה במילה), discovery (5 שאלות בירור קצרות), pitch (הצגת הפתרון בהתאם לתשובות, 3 עד 4 משפטים), close (משפט סגירה ברור עם צעד הבא), objections (בדיוק 5 התנגדויות נפוצות לעסק הזה: q במילים של הלקוח, a תשובה של 2 עד 3 משפטים), tip (טיפ אחד לשיחה).`,
    title: (f: Record<string, string>) => `תסריט מכירה: ${f.product.slice(0, 50)}`,
    md: (r: SalesScript) => [`## פתיחה`, r.opening, `## שאלות בירור`, ...r.discovery.map((q, i) => `${i + 1}. ${q}`), `## הצגת הפתרון`, r.pitch, `## סגירה`, r.close, `## התנגדויות`, ...r.objections.flatMap((o) => [`**"${o.q}"**`, o.a]), `טיפ: ${r.tip}`].join("\n\n"),
    ok: (r: SalesScript) => !!r?.opening && r.objections?.length > 0,
  },
  social_week: {
    kind: "social_week",
    schema: obj({ days: { type: Type.ARRAY, items: obj({ day: str, format: str, topic: str, hook: str, cta: str }) }, tip: str }),
    prompt: (f: Record<string, string>, biz: string) => `${VOICE}
בנה לוח תוכן לשבוע לרשתות (אינסטגרם ופייסבוק) לבעל עסק קטן שאין לו זמן.
העסק: ${f.business || biz || "לא נאמר"}
הקהל: ${f.audience || "לא נאמר, תניח את הלקוחות הטבעיים של העסק"}
המטרה השבוע: ${f.goal || "יותר פניות"}
תחזיר days: בדיוק 7 ימים, ראשון עד שבת (day: שם היום). בשבת format "מנוחה" ונושא קליל. לכל יום: format (סטורי / ריל / פוסט), topic (נושא במשפט), hook (שורה ראשונה או משפט פתיחה למצלמה, עד 12 מילים), cta (קריאה לפעולה קצרה). לפחות 3 סטוריז בשבוע. tip: טיפ אחד שיעזור להתמיד.`,
    title: () => `לוח תוכן לשבוע`,
    md: (r: SocialWeek) => [`## לוח תוכן לשבוע`, ...r.days.map((d) => `**${d.day} · ${d.format}:** ${d.topic}\n> ${d.hook}\n👉 ${d.cta}`), `טיפ: ${r.tip}`].join("\n\n"),
    ok: (r: SocialWeek) => r?.days?.length > 0,
  },
} as const;

const clean = (v: unknown, max: number) => String(v ?? "").replace(/[–—]/g, ",").trim().slice(0, max);
const deep = (v: unknown): unknown => (typeof v === "string" ? clean(v, 1500) : Array.isArray(v) ? v.map(deep) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)])) : v);

export async function POST(req: Request) {
  const gate = await guard("room_gen", 20, 60);
  if (gate instanceof Response) return gate;
  const body = await req.json().catch(() => ({}));
  const tool = TOOLS[body.tool as keyof typeof TOOLS];
  if (!tool) return NextResponse.json({ error: "כלי לא מוכר" }, { status: 400 });
  const f: Record<string, string> = {};
  for (const [k, v] of Object.entries((body.fields ?? {}) as Record<string, unknown>)) f[k] = clean(v, 500);
  const main = body.tool === "sales_script" ? f.product : f.business;
  if (body.tool === "sales_script" && (!main || main.length < 3)) return NextResponse.json({ error: "כתבו בכמה מילים מה אתם מוכרים." }, { status: 400 });

  const supabase = db();
  const { data: u } = await supabase.from("users").select("profile").eq("id", gate).maybeSingle();
  const p = (u?.profile ?? {}) as Record<string, unknown>;
  const biz = [p.business_name, p.business_type].filter(Boolean).map(String).join(", ");

  let r: unknown;
  try {
    const res = await gemini().models.generateContent({
      model: FAST_MODEL,
      contents: [{ role: "user", parts: [{ text: tool.prompt(f, biz) }] }],
      config: { responseMimeType: "application/json", responseSchema: tool.schema, maxOutputTokens: 2400, ...LITE_THINKING },
    });
    r = deep(JSON.parse(res.text ?? "{}"));
    if (!(tool.ok as (x: unknown) => boolean)(r)) throw new Error("incomplete");
  } catch (e) {
    if (e instanceof BudgetExceeded) return NextResponse.json({ error: "המערכת עמוסה כרגע. נסו שוב מאוחר יותר." }, { status: 503 });
    console.error("room gen failed", body.tool, (e as Error).message);
    return NextResponse.json({ error: "לא הצלחנו לבנות את זה. נסו שוב." }, { status: 502 });
  }
  await supabase.from("deliverables").insert({ user_id: gate, kind: tool.kind, title: tool.title(f), content: (tool.md as (x: unknown) => string)(r) });
  return NextResponse.json({ ok: true, result: r });
}

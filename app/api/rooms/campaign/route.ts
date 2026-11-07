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
const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    audience: {
      type: Type.OBJECT,
      properties: { who: str, pains: strs, desires: strs, objections: strs, targeting: strs, angle: str },
      required: ["who", "pains", "desires", "objections", "targeting", "angle"],
    },
    ads: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: { name: str, hook: str, body: str, cta: str, headline: str, sub: str }, required: ["name", "hook", "body", "cta", "headline", "sub"] },
    },
    script: {
      type: Type.OBJECT,
      properties: {
        title: str,
        shots: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { t: str, see: str, say: str, text: str }, required: ["t", "see", "say", "text"] } },
        tip: str,
      },
      required: ["title", "shots", "tip"],
    },
  },
  required: ["audience", "ads", "script"],
};

export type Campaign = {
  audience: { who: string; pains: string[]; desires: string[]; objections: string[]; targeting: string[]; angle: string };
  ads: { name: string; hook: string; body: string; cta: string; headline: string; sub: string }[];
  script: { title: string; shots: { t: string; see: string; say: string; text: string }[]; tip: string };
};

const clean = (v: unknown, max: number) => String(v ?? "").replace(/[–—]/g, ",").trim().slice(0, max);

function prompt(product: string, audience: string, offer: string, biz: string) {
  return `אתה ניר דובדבני, יועץ עסקי עם 22 שנות ניסיון, ובונה עכשיו קמפיין ממומן (פייסבוק ואינסטגרם) לבעל עסק קטן בישראל.
כתוב בעברית פשוטה, ישירה ואנושית, כמו שבעל עסק מדבר. משפטים קצרים. בלי מקפים ארוכים. בלי הבטחות של "מובטח" או סכומים מובטחים. בלי להמציא נתונים, ביקורות או לקוחות.

העסק: ${biz || "לא נאמר"}
מה מוכרים: ${product}
הלקוח האידיאלי (לפי בעל העסק): ${audience || "לא נאמר, תציע אתה"}
ההצעה או המבצע: ${offer || "לא נאמר, תציע הצעה פשוטה שמורידה סיכון ללקוח"}

תחזיר:
1. audience: מי הלקוח במשפט אחד (who), 3 כאבים במילים של הלקוח (pains), 3 רצונות (desires), 3 התנגדויות שהוא יגיד לפני שיקנה (objections), 4 עד 6 תחומי עניין או קהלים לטירגוט במטא (targeting), והזווית המרכזית של הקמפיין במשפט (angle).
2. ads: בדיוק 3 מודעות, כל אחת בזווית אחרת: כאב, תוצאה, סיפור. לכל אחת: name (שם הזווית במילה או שתיים), hook (שורה ראשונה שעוצרת גלילה, עד 12 מילים), body (3 עד 5 שורות קצרות), cta (קריאה לפעולה אחת ברורה), headline (כותרת למודעה הגרפית, עד 6 מילים), sub (שורת משנה לגרפיקה, עד 10 מילים).
3. script: תסריט לסרטון ריל של 30 שניות שבעל העסק מצלם לבד בטלפון. title, ו-5 שוטים: t (טווח שניות, למשל 0-3), see (מה רואים בצילום), say (מה אומרים למצלמה, מילה במילה), text (כיתוב על המסך, עד 5 מילים). tip: טיפ צילום אחד.`;
}

export async function POST(req: Request) {
  const gate = await guard("room_campaign", 12, 60);
  if (gate instanceof Response) return gate;
  const body = await req.json().catch(() => ({}));
  const product = clean(body.product, 600);
  const audience = clean(body.audience, 400);
  const offer = clean(body.offer, 300);
  if (product.length < 3) return NextResponse.json({ error: "כתבו בכמה מילים מה אתם מוכרים." }, { status: 400 });

  const supabase = db();
  const { data: u } = await supabase.from("users").select("profile").eq("id", gate).maybeSingle();
  const p = (u?.profile ?? {}) as Record<string, unknown>;
  const biz = [p.business_name, p.business_type].filter(Boolean).map(String).join(", ");

  let c: Campaign;
  try {
    const res = await gemini().models.generateContent({
      model: FAST_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt(product, audience, offer, biz) }] }],
      config: { responseMimeType: "application/json", responseSchema: SCHEMA, maxOutputTokens: 2600, ...LITE_THINKING },
    });
    c = JSON.parse(res.text ?? "{}") as Campaign;
    if (!c?.ads?.length || !c?.script?.shots?.length || !c?.audience?.who) throw new Error("incomplete");
  } catch (e) {
    if (e instanceof BudgetExceeded) return NextResponse.json({ error: "המערכת עמוסה כרגע. נסו שוב מאוחר יותר." }, { status: 503 });
    console.error("room campaign failed", (e as Error).message);
    return NextResponse.json({ error: "לא הצלחנו לבנות את הקמפיין. נסו שוב." }, { status: 502 });
  }
  const fix = (s: string) => clean(s, 1200);
  c = {
    audience: { who: fix(c.audience.who), pains: c.audience.pains.slice(0, 3).map(fix), desires: c.audience.desires.slice(0, 3).map(fix), objections: c.audience.objections.slice(0, 3).map(fix), targeting: c.audience.targeting.slice(0, 6).map(fix), angle: fix(c.audience.angle) },
    ads: c.ads.slice(0, 3).map((a) => ({ name: fix(a.name), hook: fix(a.hook), body: fix(a.body), cta: fix(a.cta), headline: fix(a.headline), sub: fix(a.sub) })),
    script: { title: fix(c.script.title), tip: fix(c.script.tip), shots: c.script.shots.slice(0, 6).map((s) => ({ t: fix(s.t), see: fix(s.see), say: fix(s.say), text: fix(s.text) })) },
  };

  const md = [
    `# קמפיין: ${product.slice(0, 60)}`,
    `## הקהל`, `**מי:** ${c.audience.who}`, `**הזווית:** ${c.audience.angle}`,
    `**כאבים:**`, ...c.audience.pains.map((x) => `- ${x}`), `**רצונות:**`, ...c.audience.desires.map((x) => `- ${x}`),
    `**התנגדויות:**`, ...c.audience.objections.map((x) => `- ${x}`), `**טירגוט:** ${c.audience.targeting.join(", ")}`,
    `## המודעות`, ...c.ads.flatMap((a) => [`### ${a.name}`, `**${a.hook}**`, a.body, `👉 ${a.cta}`]),
    `## תסריט צילום: ${c.script.title}`, ...c.script.shots.map((s) => `- **${s.t} שנ׳** · רואים: ${s.see} · אומרים: "${s.say}" · כיתוב: ${s.text}`), `טיפ: ${c.script.tip}`,
  ].join("\n\n");
  const { data: saved } = await supabase.from("deliverables").insert({ user_id: gate, kind: "campaign", title: `קמפיין: ${product.slice(0, 50)}`, content: md }).select("id").single();
  return NextResponse.json({ ok: true, campaign: c, savedId: saved?.id ?? null });
}

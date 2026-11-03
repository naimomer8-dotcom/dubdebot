import { db } from "./supabase";

/** Nir's own lines (from his quotes sheet + his lexicon). One per day, same for everyone that day. */
export const NIR_QUOTES = [
  "אסטרטגיה מנצחת טקטיקה. היום תעבוד שעה על העסק, לא בתוכו.",
  "הצלחה היא תיאום ציפיות בינך לבין עצמך.",
  "כדי להצליח שם, צריך להתחיל כאן.",
  "פסימי חוקר כישלונות. אופטימי חוקר הצלחות.",
  "צניעות זה 2012.",
  "אם אתה כבר חושב, תחשוב בגדול.",
  "אין דבר ענק שהושג אי פעם בלי התלהבות.",
  "יש אנשים שמחשבים סיכונים, ויש כאלה שמדמיינים סיכויים.",
];

export function quoteOfDay(now = Date.now()) {
  const day = Math.floor((now + 2 * 3600_000) / 86400_000);
  return NIR_QUOTES[day % NIR_QUOTES.length];
}

export type StepKey = "question" | "xray" | "money" | "events" | "vault" | "wa";
export type Step = { key: StepKey; short: string; title: string; sub: string; href?: string; done: boolean };

/** The member's first six moves in the platform, from what they actually did (events). */
export async function homeState(userId: string) {
  const { data } = await db()
    .from("events")
    .select("type, meta, created_at")
    .eq("user_id", userId)
    .in("type", ["auto:first_question", "xray_completed", "money_check", "deliverable_saved", "reg:workshop", "reg:webinar", "wa_group_clicked"])
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = data ?? [];
  const has = (t: string) => rows.some((r) => r.type === t);
  const xray = rows.find((r) => r.type === "xray_completed");
  const steps: Step[] = [
    { key: "question", short: "שאלה", title: "שאלה ראשונה לניר", sub: "על כל אתגר בעסק, בכתב או בקול", href: "/chat?new=1", done: has("auto:first_question") },
    { key: "xray", short: "רנטגן", title: "רנטגן לעסק", sub: "12 שאלות · 4 דקות · ציון על 6 צירים", href: "/xray", done: has("xray_completed") },
    { key: "money", short: "כסף", title: "בדיקת הכסף", sub: "כמה נשאר אצלך באמת בסוף החודש", href: "/money", done: has("money_check") },
    { key: "events", short: "סדנה", title: "סדנת המכירות והוובינר", sub: "שומרים לך מקום בלחיצה אחת", done: has("reg:workshop") || has("reg:webinar") },
    { key: "vault", short: "תיק", title: "התוצר הראשון בתיק העסקי", sub: "תוכנית, תחזית או תסריט שבנית עם ניר", href: "/chat?new=1", done: has("deliverable_saved") },
    { key: "wa", short: "קבוצה", title: "קבוצת העדכונים בוואטסאפ", sub: "קישורים, תזכורות וחומרים", done: has("wa_group_clicked") },
  ];
  const total = Number((xray?.meta as { total?: number } | null)?.total);
  return { steps, xrayScore: Number.isFinite(total) ? total : null };
}

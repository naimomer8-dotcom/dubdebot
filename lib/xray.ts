/** רנטגן עסקי – 12 questions over 6 axes (based on Nir's Alpha map: strategy, marketing, sales, pricing, management, money). */

export type AxisId = "strategy" | "marketing" | "sales" | "pricing" | "systems" | "money";

export const AXES: { id: AxisId; label: string; short: string }[] = [
  { id: "strategy", label: "אסטרטגיה וחזון", short: "אסטרטגיה" },
  { id: "marketing", label: "שיווק ולידים", short: "שיווק" },
  { id: "sales", label: "מכירות וסגירה", short: "מכירות" },
  { id: "pricing", label: "תמחור ורווחיות", short: "תמחור" },
  { id: "systems", label: "ניהול ומערכות", short: "ניהול" },
  { id: "money", label: "כסף ותזרים", short: "כסף" },
];

export type Question = { id: string; axis: AxisId; q: string; hint?: string; options: string[] };

export const QUESTIONS: Question[] = [
  { id: "q1", axis: "strategy", q: "איפה העסק שלך יהיה בעוד 3 שנים?", hint: "תענה בכנות. אף אחד לא רואה.", options: ["אין לי מושג, אני שורד את החודש", "יש לי כיוון כללי בראש", "יש יעד כתוב, בלי תוכנית", "יעד כתוב + תוכנית רבעונית שאני בודק"] },
  { id: "q2", axis: "strategy", q: "כמה זמן בשבוע אתה עובד על העסק, ולא בתוכו?", options: ["כמעט אפס", "שעה-שעתיים", "חצי יום", "יום שלם ויותר"] },
  { id: "q3", axis: "marketing", q: "מאיפה מגיעים הלקוחות החדשים שלך?", options: ["רק מפה לאוזן, כשיש", "קצת רשתות, לא קבוע", "ערוץ אחד שעובד קבוע", "כמה ערוצים מדודים. אני יודע כמה עולה ליד"] },
  { id: "q4", axis: "marketing", q: "אם מחר תרצה עוד 30 פניות בחודש, אתה יודע על מה ללחוץ?", options: ["לא", "יש לי ניחוש", "בערך, אם אשים תקציב", "כן. זה חישוב, לא תקווה"] },
  { id: "q5", axis: "sales", q: "מתוך 10 פניות רציניות, כמה נסגרות?", options: ["פחות מ-2", "2–3", "4–5", "6 ומעלה"] },
  { id: "q6", axis: "sales", q: "יש לך תסריט שיחה ותהליך פולואפ?", options: ["מאלתר כל פעם", "יש בראש, לא כתוב", "כתוב, לא תמיד מבוצע", "כתוב, מתורגל ונמדד"] },
  { id: "q7", axis: "pricing", q: "מתי העלית מחיר בפעם האחרונה?", options: ["אף פעם / לא זוכר", "לפני יותר משנתיים", "בשנה-שנתיים האחרונות", "אני מעדכן כל שנה לפי הערך"] },
  { id: "q8", axis: "pricing", q: "אתה יודע מה הרווח הגולמי על כל מוצר או שירות?", options: ["לא", "בערך, בראש", "על העיקריים", "על הכל, עד השקל"] },
  { id: "q9", axis: "systems", q: "אם תיעלם לשבועיים, מה קורה לעסק?", options: ["נעצר", "נפגע קשה", "מתפקד חלקית", "ממשיך לרוץ"] },
  { id: "q10", axis: "systems", q: "התהליכים בעסק (שירות, מכירה, קליטת לקוח) כתובים?", options: ["הכל אצלי בראש", "חלק", "רובם, לא מעודכנים", "כתובים, מעודכנים, עם אחראים"] },
  { id: "q11", axis: "money", q: "אתה יודע מה המצב בבנק בעוד 90 יום?", options: ["מגלה כשזה מגיע", "יש לי תחושה", "אקסל, לפעמים", "תזרים מעודכן כל שבוע"] },
  { id: "q12", axis: "money", q: "אתה מושך לעצמך משכורת קבועה?", options: ["לא מושך / לא קבוע", "מה שנשאר בסוף החודש", "קבוע, אבל נמוך מהשוק", "קבוע ומלא, ורווח נשאר בעסק"] },
];

export type Scores = Record<AxisId, number>;

export function score(answers: Record<string, number>): { scores: Scores; total: number } {
  const sums = Object.fromEntries(AXES.map((a) => [a.id, 0])) as Scores;
  const counts = Object.fromEntries(AXES.map((a) => [a.id, 0])) as Scores;
  for (const q of QUESTIONS) {
    const v = answers[q.id];
    if (typeof v !== "number") continue;
    sums[q.axis] += Math.max(0, Math.min(3, v));
    counts[q.axis] += 1;
  }
  const scores = Object.fromEntries(
    AXES.map((a) => [a.id, counts[a.id] ? Math.round((sums[a.id] / (counts[a.id] * 3)) * 100) : 0])
  ) as Scores;
  const total = Math.round(AXES.reduce((s, a) => s + scores[a.id], 0) / AXES.length);
  return { scores, total };
}

export const ARCHETYPES = [
  { min: 0, id: "firefighter", name: "מכבה השריפות", line: "העסק מנהל אותך. כל בוקר מתחיל בשריפה." },
  { min: 35, id: "technician", name: "הטכנאי העייף", line: "אתה מעולה במקצוע. העסק עדיין לא." },
  { min: 55, id: "builder", name: "מכונה בבנייה", line: "יש בסיס. חסר מנוע שעובד בלעדיך." },
  { min: 75, id: "alpha", name: "אלפא", line: "אתה משחק במגרש של הגדולים. עכשיו סקייל." },
];

export function archetype(total: number) {
  return [...ARCHETYPES].reverse().find((a) => total >= a.min)!;
}

const WEAK: Record<AxisId, string> = {
  strategy: "אין לך מפה. אתה עובד קשה, אבל לא יודע לאן. אסטרטגיה מנצחת טקטיקה – תמיד.",
  marketing: "הלקוחות מגיעים במקרה. עסק שתלוי במזל הוא לא עסק, הוא הימור.",
  sales: "אתה מייצר פניות ושורף אותן. כל ליד שלא נסגר הוא כסף ששילמת עליו פעמיים.",
  pricing: "אתה כנראה זול מדי. מחיר נמוך לא מביא לקוחות טובים, הוא מביא לקוחות זולים.",
  systems: "העסק זה אתה. ברגע שאתה עוצר, הכל עוצר. זה לא עסק, זו משרה עם סיכון.",
  money: "אתה טס בלי מכשירים. מי שלא רואה את התזרים מגלה את הבעיה כשכבר מאוחר.",
};
const STRONG: Record<AxisId, string> = {
  strategy: "יש לך כיוון ברור",
  marketing: "יש לך מנוע לידים",
  sales: "אתה יודע לסגור",
  pricing: "אתה מתמחר נכון",
  systems: "העסק יודע לרוץ בלעדיך",
  money: "יש לך שליטה בכסף",
};

export function insights(scores: Scores) {
  const sorted = [...AXES].sort((a, b) => scores[a.id] - scores[b.id]);
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];
  return {
    weakest,
    strongest,
    weakLine: WEAK[weakest.id],
    strongLine: STRONG[strongest.id],
  };
}

export function toPrompt(answers: Record<string, number>) {
  const { scores, total } = score(answers);
  const a = archetype(total);
  const lines = QUESTIONS.map((q) => `- ${q.q} → ${q.options[answers[q.id]] ?? "לא ענה"}`).join("\n");
  const axes = AXES.map((x) => `${x.label}: ${scores[x.id]}/100`).join(" | ");
  return `עשיתי עכשיו רנטגן עסקי. ציון כולל: ${total}/100 (פרופיל: ${a.name}).
ציונים לפי תחום: ${axes}

התשובות שלי:
${lines}

תפרק לי את התוצאה: מה הצוואר בקבוק הכי מסוכן, מה 3 הפעולות הראשונות שלי ל-30 הימים הקרובים, ומה ייחשב הצלחה.`;
}

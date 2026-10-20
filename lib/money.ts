/**
 * Money as a first-class parameter of the platform.
 * The quarterly workshop for members + a short self-check of the member's relationship with money.
 * Pure data and functions – shared by the money page, the API, the bot context and the admin business file.
 */

/** The workshop Nir runs for members, once a quarter. */
export const WORKSHOP = {
  name: "להעיר את הכסף שבך",
  subtitle: "קורס מקצוען בכסף",
  cadence: "אחת לרבעון",
  perYear: 4,
  hours: 4,
  /** ISO date of the next meeting, or null until it is published. */
  nextDate: null as string | null,
  nextPlaceholder: "התאריך הבא יפורסם בקרוב",
  about:
    "סדנה פיזית של 4 שעות עם ניר, פעם ברבעון, לחברי הפלטפורמה. מדברים על כסף בלי לייפות: כמה העסק באמת מרוויח, כמה אתה מושך לעצמך, איך מתמחרים בביטחון, ואיך כסף שנכנס הופך לנכס ולא נעלם.",
  topics: [
    "תמחור בביטחון: להפסיק להתנצל על המחיר",
    "לשלם קודם לעצמך: משכורת קבועה לבעלים",
    "תזרים: לדעת היום מה יהיה בבנק בעוד 90 יום",
    "מרווח: מה נשאר אחרי כל ההוצאות",
    "מרווח לנכסים: חיסכון והשקעה מתוך העסק",
    "אמונות על כסף שעוצרות אותך",
  ],
};

/** Full display title, e.g. for lists: "להעיר את הכסף שבך · קורס מקצוען בכסף". */
export const WORKSHOP_TITLE = `${WORKSHOP.name} · ${WORKSHOP.subtitle}`;

export function workshopDateLabel(): string {
  if (!WORKSHOP.nextDate) return WORKSHOP.nextPlaceholder;
  const d = new Date(WORKSHOP.nextDate);
  if (Number.isNaN(d.getTime())) return WORKSHOP.nextPlaceholder;
  return d.toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jerusalem" });
}

export type MoneyDim = "pricing" | "pay" | "cash" | "margin" | "assets" | "beliefs";

export const MONEY_DIMS: { id: MoneyDim; label: string }[] = [
  { id: "pricing", label: "ביטחון בתמחור" },
  { id: "pay", label: "לשלם לעצמך" },
  { id: "cash", label: "שליטה בתזרים" },
  { id: "margin", label: "רווחיות" },
  { id: "assets", label: "חיסכון והשקעה" },
  { id: "beliefs", label: "אמונות על כסף" },
];

export type MoneyQuestion = { id: string; dim: MoneyDim; q: string; options: string[] };

/** 8 questions, 4 options each, scored 0..3 (the last option is the strongest). */
export const MONEY_QUESTIONS: MoneyQuestion[] = [
  { id: "m1", dim: "pricing", q: "כשאתה אומר ללקוח את המחיר, מה קורה לך?", options: ["מתנצל או נותן הנחה עוד לפני שביקש", "אומר, ומקווה שלא יתווכח", "אומר בביטחון, לפעמים מתקפל", "אומר ושותק. המחיר משקף את הערך"] },
  { id: "m2", dim: "pricing", q: "מתי בדקת לאחרונה שהמחיר שלך מכסה את כל העלויות ומשאיר רווח?", options: ["אף פעם", "לפני כמה שנים", "בשנה האחרונה", "אני בודק כל רבעון"] },
  { id: "m3", dim: "pay", q: "איך אתה משלם לעצמך מהעסק?", options: ["לא מושך בכלל", "מה שנשאר בסוף החודש", "סכום קבוע, נמוך ממה שמגיע לי", "משכורת קבועה ומלאה, כמו לעובד בכיר"] },
  { id: "m4", dim: "cash", q: "אתה יודע כמה כסף יהיה בבנק בעוד 90 יום?", options: ["מגלה כשזה מגיע", "יש לי תחושה כללית", "יש אקסל, לא תמיד מעודכן", "תזרים מעודכן כל שבוע"] },
  { id: "m5", dim: "cash", q: "כסף של העסק וכסף פרטי:", options: ["הכל באותו חשבון", "חשבונות נפרדים, אבל מערבב", "נפרד, עם משיכות לפי הצורך", "נפרד לגמרי, עם משיכה קבועה"] },
  { id: "m6", dim: "margin", q: "אתה יודע כמה רווח נקי נשאר מכל 100 ₪ שנכנסים?", options: ["אין לי מושג", "ניחוש", "בערך, מהדוח השנתי", "כן, ואני עוקב חודש בחודשו"] },
  { id: "m7", dim: "assets", q: "מה קורה לכסף שנשאר בסוף שנה טובה?", options: ["לא נשאר", "נעלם על הוצאות", "נשאר בעו״ש", "הולך לחיסכון או להשקעה לפי תוכנית"] },
  { id: "m8", dim: "beliefs", q: "איזה משפט הכי קרוב אליך?", options: ["כסף זה לא בשבילי, העיקר לשרוד", "לא נעים לי לדבר על כסף", "כסף חשוב, אבל אני לא מבין בו מספיק", "כסף הוא כלי, ואני מנהל אותו"] },
];

export type MoneyLevel = { id: "asleep" | "waking" | "awake" | "pro"; label: string; line: string };

export const MONEY_LEVELS: (MoneyLevel & { min: number })[] = [
  { id: "asleep", min: 0, label: "הכסף ישן", line: "העסק מכניס, אבל הכסף לא עובד בשבילך. יש פה מקום גדול להתחיל ממנו." },
  { id: "waking", min: 35, label: "הכסף מתעורר", line: "יש בסיס. חסרים הרגלים קבועים שיהפכו הכנסה לרווח שנשאר." },
  { id: "awake", min: 60, label: "הכסף ער", line: "אתה מנהל כסף ולא רק מוציא. עכשיו מחדדים תמחור ונכסים." },
  { id: "pro", min: 85, label: "מקצוען בכסף", line: "שליטה טובה. השלב הבא: להגדיל את המרווח ולבנות נכסים מהעסק." },
];

export type MoneyResult = {
  score: number; // 0..100
  level: MoneyLevel["id"];
  levelLabel: string;
  dims: Record<MoneyDim, number>; // 0..100 per dimension
  weakest: MoneyDim;
  answers: Record<string, number>;
  at: string;
};

export function cleanMoneyAnswers(raw: unknown): Record<string, number> | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const out: Record<string, number> = {};
  for (const q of MONEY_QUESTIONS) {
    const v = Number(r[q.id]);
    if (!Number.isInteger(v) || v < 0 || v > 3) return null;
    out[q.id] = v;
  }
  return out;
}

export function scoreMoney(answers: Record<string, number>, at = new Date().toISOString()): MoneyResult {
  const sums = {} as Record<MoneyDim, number>;
  const counts = {} as Record<MoneyDim, number>;
  for (const d of MONEY_DIMS) { sums[d.id] = 0; counts[d.id] = 0; }
  let total = 0;
  for (const q of MONEY_QUESTIONS) {
    const v = Math.max(0, Math.min(3, Number(answers[q.id] ?? 0)));
    sums[q.dim] += v;
    counts[q.dim] += 1;
    total += v;
  }
  const dims = {} as Record<MoneyDim, number>;
  for (const d of MONEY_DIMS) dims[d.id] = counts[d.id] ? Math.round((sums[d.id] / (counts[d.id] * 3)) * 100) : 0;
  const score = Math.round((total / (MONEY_QUESTIONS.length * 3)) * 100);
  const lvl = [...MONEY_LEVELS].reverse().find((l) => score >= l.min) ?? MONEY_LEVELS[0];
  const weakest = MONEY_DIMS.reduce((a, b) => (dims[b.id] < dims[a.id] ? b : a)).id;
  return { score, level: lvl.id, levelLabel: lvl.label, dims, weakest, answers, at };
}

export const levelOf = (id: string | undefined) => MONEY_LEVELS.find((l) => l.id === id) ?? null;
export const dimLabel = (id: string) => MONEY_DIMS.find((d) => d.id === id)?.label ?? id;

/** Read a stored result from users.profile.money (tolerant of missing / old data). */
export function moneyFromProfile(profile: Record<string, unknown> | null | undefined): MoneyResult | null {
  const m = (profile?.money ?? null) as MoneyResult | null;
  if (!m || typeof m.score !== "number" || !m.dims) return null;
  return m;
}

/** A compact block for the bot's context. */
export function moneyContext(m: MoneyResult | null): string {
  const lines: string[] = [];
  if (m) {
    lines.push(`בדיקת כסף אחרונה (${new Date(m.at).toLocaleDateString("he-IL")}): ${m.score}/100, רמה: ${m.levelLabel}.`);
    lines.push("לפי צירים: " + MONEY_DIMS.map((d) => `${d.label} ${m.dims[d.id] ?? 0}`).join(", ") + ".");
    lines.push(`הציר הכי חלש: ${dimLabel(m.weakest)}.`);
    const picked = MONEY_QUESTIONS.map((q) => `${q.q} → ${q.options[m.answers?.[q.id] ?? 0] ?? ""}`).join("\n");
    lines.push(`מה ענה:\n${picked}`);
  } else {
    lines.push("המשתמש עוד לא עשה את בדיקת הכסף (בעמוד \"כסף\" בתפריט). כשהשיחה נוגעת בכסף, מותר להציע לו אותה במשפט אחד.");
  }
  return lines.join("\n");
}

/** Starter questions about money for the chat. */
export const MONEY_STARTERS = [
  { b: "כמה לשלם לעצמי", s: "משכורת קבועה מהעסק, בלי לחנוק אותו", t: "כמה אני צריך למשוך לעצמי מהעסק כל חודש, ואיך עושים את זה בלי לחנוק את התזרים?" },
  { b: "למה אין כסף בבנק", s: "יש הכנסות, אין רווח שנשאר", t: "יש לי הכנסות יפות אבל בסוף החודש אין כסף בבנק. איפה הכסף בורח?" },
  { b: "תזרים ל-90 יום", s: "לדעת היום מה יהיה בבנק", t: "תבנה איתי תזרים מזומנים פשוט ל-90 הימים הקרובים." },
  { b: "מה עושים עם הרווח", s: "חיסכון, השקעה או חזרה לעסק", t: "נשאר לי רווח השנה. איך אני מחליט כמה להשאיר בעסק, כמה לחסוך וכמה להשקיע?" },
];

/**
 * הצ'קאפ העסקי של ניר דובדבני · 2027.
 * 24 questions across 10 stations of Nir's method (Alpha map + money + capital), scored 1–10,
 * plus a short business profile. The report (feedback + a 2027 business plan) is written by Gemini
 * from these scores; buildFallbackReport() covers the case where the model is unavailable.
 */

export type StationId = "vision" | "brand" | "products" | "marketing" | "digital" | "sales" | "system" | "team" | "money" | "capital";

export type Station = { id: StationId; n: number; label: string; tag: string; icon: string; pose: string; line: string; video?: string };

/** pose = Nir cutout in /public/nir; line = what Nir says when you arrive; video = optional clip in /public/checkup. */
export const STATIONS: Station[] = [
  { id: "vision", n: 1, label: "חזון ויעד", tag: "לאן העסק הולך", icon: "target", pose: "wheel", line: "בלי יעד כתוב, כל החלטה נעשית מהבטן. בוא נבדוק לאן אתה הולך." },
  { id: "brand", n: 2, label: "ערכים ובידול", tag: "למה דווקא אתה", icon: "gem", pose: "suit-point", line: "אם אין לך תשובה ל״למה אתה״, נשאר לך רק להתחרות על מחיר." },
  { id: "products", n: 3, label: "מוצרים ותמחור", tag: "מה אתה מוכר ובכמה", icon: "layers", pose: "box", line: "עסק שמוכר רק את המוצר הגדול משאיר כסף על השולחן." },
  { id: "marketing", n: 4, label: "שיווק ולידים", tag: "איך מגיעים לקוחות", icon: "spark", pose: "leads", line: "שיווק בלי מדידה הוא הימור. בוא נראה מה המספרים אומרים." },
  { id: "digital", n: 5, label: "נוכחות דיגיטלית", tag: "איך רואים אותך ברשת", icon: "image", pose: "point-down", line: "הלקוח בודק אותך בנייד לפני שהוא מתקשר. מה הוא רואה?" },
  { id: "sales", n: 6, label: "מכירות", tag: "איך פנייה הופכת לכסף", icon: "phone", pose: "alarm", line: "כל פנייה שלא נסגרה, כבר שילמת עליה בשיווק." },
  { id: "system", n: 7, label: "שיטה ותהליכים", tag: "SOP, SLA ומדדים", icon: "check", pose: "book", line: "כשהכל בראש שלך, העסק לא יכול לגדול." },
  { id: "team", n: 8, label: "צוות ומנהיגות", tag: "מי מחזיק את העסק", icon: "user", pose: "welcome", line: "אם העסק נעצר כשאתה לא שם, אין לך עסק. יש לך עבודה." },
  { id: "money", n: 9, label: "כסף ותזרים", tag: "רווח והפסד ומזומנים", icon: "coin", pose: "hourglass", line: "עסקים לא נסגרים בגלל הפסד. הם נסגרים בגלל תזרים." },
  { id: "capital", n: 10, label: "נדל״ן והון", tag: "מה נשאר לך ביד", icon: "vault", pose: "celebrate", line: "עסק שלא בונה הון משאיר אותך במשוואת זמן = כסף." },
];

/** How a question is answered. Every kind resolves to a score 1–10. */
export type Kind =
  | { kind: "choice"; options: [string, string, string, string] } // → 1 / 4 / 7 / 10
  | { kind: "slider"; low: string; high: string } // drag 1–10
  | { kind: "swipe"; yes: string; no: string } // swipe/tap: yes 9 · partly 5 · no 2
  | { kind: "dial"; unit: string; max: number; scale: number[] }; // pick a number, mapped by scale thresholds

export type Q = { id: string; station: StationId; param: string; q: string; hint?: string } & Kind;

/** Option index 0..3 → score 1 / 4 / 7 / 10. */
export const OPTION_SCORE = [1, 4, 7, 10] as const;

/** dial value → score: scale = [t1,t2,...,t9] ascending thresholds; value >= t_k gives score k+1. */
export function dialScore(v: number, scale: number[]) {
  let s = 1;
  scale.forEach((t, i) => { if (v >= t) s = i + 2; });
  return Math.min(10, s);
}

export const QUESTIONS: Q[] = [
  { id: "v1", station: "vision", param: "יעד כתוב ל-2027", kind: "choice", q: "יש לך יעד כתוב לשנה הקרובה, במספרים?", hint: "הכנסות, רווח, לקוחות. משהו שאפשר למדוד.", options: ["אין, אני חי מחודש לחודש", "יש תחושה בראש", "יש יעד כתוב, בלי תוכנית", "יעד כתוב + תוכנית רבעונית"] },
  { id: "v2", station: "vision", param: "עבודה על העסק", kind: "slider", q: "כמה מהשבוע שלך הולך לעבודה על העסק, ולא בתוכו?", low: "כמעט כלום", high: "יום שלם ויותר" },
  { id: "b1", station: "brand", param: "בידול", kind: "choice", q: "לקוח שואל: למה דווקא אתה? מה התשובה?", options: ["אני הכי זול / הכי זמין", "מתלבט כל פעם מחדש", "יש משפט, לא תמיד חד", "משפט חד שכל הצוות אומר"] },
  { id: "b2", station: "brand", param: "ערכים", kind: "swipe", q: "הערכים של העסק כתובים, והעובדים חיים לפיהם.", yes: "נכון אצלי", no: "ממש לא" },
  { id: "p1", station: "products", param: "מוצר חדירה", kind: "swipe", q: "יש לי מוצר חדירה קטן שמכניס לקוחות חדשים בקלות.", hint: "בדיקה, ייעוץ קצר, מוצר היכרות.", yes: "יש", no: "אין" },
  { id: "p2", station: "products", param: "מוצר תוכן", kind: "choice", q: "מוצר תוכן (קורס, סדנה, הרצאה, ספר) שמוכר אותך גם כשאתה ישן?", options: ["אין", "יש רעיון", "יש, לא נמכר קבוע", "יש, ומכניס כל חודש"] },
  { id: "p3", station: "products", param: "רווח גולמי ותמחור", kind: "slider", q: "כמה טוב אתה מכיר את הרווח הגולמי על כל מוצר?", low: "לא יודע בכלל", high: "עד השקל" },
  { id: "m1", station: "marketing", param: "קמפיינים", kind: "choice", q: "איך נראה השיווק שלך היום?", options: ["רק מפה לאוזן", "פוסטים פה ושם", "קמפיין קבוע בערוץ אחד", "כמה ערוצים, מדודים, תקציב קבוע"] },
  { id: "m2", station: "marketing", param: "לידים", kind: "swipe", q: "אני יודע כמה לידים נכנסים בחודש, ומה עולה כל ליד.", yes: "יודע", no: "לא יודע" },
  { id: "m3", station: "marketing", param: "החזר על פרסום (ROAS)", kind: "dial", q: "על כל ₪1 בפרסום, כמה חוזר אליך?", hint: "לא מפרסם או לא יודע? תשאיר על 0.", unit: "₪", max: 10, scale: [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 7] },
  { id: "d1", station: "digital", param: "אתר ודף נחיתה", kind: "choice", q: "האתר שלך היום:", options: ["אין אתר", "ישן, לא מותאם לנייד", "מותאם לנייד, לא מביא פניות", "מהיר ומביא פניות"] },
  { id: "d2", station: "digital", param: "תוכן ברשתות", kind: "dial", q: "כמה פוסטים / סרטונים אתה מעלה בשבוע?", unit: "בשבוע", max: 14, scale: [1, 1, 2, 2, 3, 4, 5, 7, 10] },
  { id: "s1", station: "sales", param: "אחוז סגירה", kind: "dial", q: "מתוך 10 פניות רציניות, כמה נסגרות?", unit: "מתוך 10", max: 10, scale: [1, 2, 3, 3, 4, 5, 6, 7, 8] },
  { id: "s2", station: "sales", param: "תסריט ופולואפ", kind: "choice", q: "יש תסריט שיחה ותהליך פולואפ קבוע?", options: ["מאלתר כל פעם", "בראש, לא כתוב", "כתוב, לא תמיד מבוצע", "כתוב, מתורגל ונמדד"] },
  { id: "y1", station: "system", param: "נהלי עבודה (SOP)", kind: "slider", q: "כמה מהתהליכים בעסק כתובים, עם אחראים?", low: "הכל בראש שלי", high: "הכל כתוב" },
  { id: "y2", station: "system", param: "זמני שירות (SLA)", kind: "swipe", q: "יש זמני תגובה ושירות מוגדרים ללקוח, ואני מודד אותם.", hint: "תוך כמה זמן עונים לפנייה, מתי מספקים.", yes: "יש", no: "אין" },
  { id: "y3", station: "system", param: "מדדים (KPI)", kind: "choice", q: "יש לוח מדדים שאתה מסתכל עליו כל שבוע?", options: ["אין", "מסתכל על הבנק", "כמה מספרים, לא קבוע", "לוח קבוע, כל שבוע"] },
  { id: "t1", station: "team", param: "תלות בך", kind: "slider", q: "אם תיעלם לשבועיים, כמה מהעסק ממשיך לרוץ?", low: "הכל נעצר", high: "רץ בלעדיי" },
  { id: "t2", station: "team", param: "תגמול ויעדים", kind: "swipe", q: "הצוות (או אני, אם אני לבד) עובד עם יעדים כתובים ותגמול לפי ביצוע.", yes: "נכון", no: "לא" },
  { id: "f1", station: "money", param: "רווח והפסד (P&L)", kind: "choice", q: "אתה רואה דוח רווח והפסד?", options: ["רק כשרואה החשבון שולח", "פעם בשנה", "מדי פעם", "כל חודש, מבין כל שורה"] },
  { id: "f2", station: "money", param: "תזרים מזומנים", kind: "slider", q: "כמה ברור לך מה יהיה בבנק בעוד 90 יום?", low: "מגלה כשזה מגיע", high: "תזרים שבועי מעודכן" },
  { id: "f3", station: "money", param: "משכורת לבעלים", kind: "swipe", q: "אני מושך לעצמי משכורת קבועה ומלאה, ורווח נשאר בעסק.", yes: "נכון", no: "לא" },
  { id: "c1", station: "capital", param: "תוכנית נדל״ן", kind: "choice", q: "תוכנית נדל״ן להכנסה פסיבית ל-10 השנים הקרובות?", options: ["אין, לא חשבתי", "חולם על זה", "יש כיוון, בלי תוכנית", "תוכנית כתובה, מתקדם"] },
  { id: "c2", station: "capital", param: "רווח שהופך לנכסים", kind: "dial", q: "כמה אחוז מהרווח החודשי הופך לנכסים?", hint: "חיסכון, השקעות, נדל״ן.", unit: "%", max: 50, scale: [1, 3, 5, 8, 10, 15, 20, 25, 30] },
];

/** The 1–10 score of one raw answer (answers store choice index / slider value / swipe score / dial value). */
export function answerScore(q: Q, raw: number): number | null {
  if (!Number.isFinite(raw)) return null;
  if (q.kind === "choice") return Number.isInteger(raw) && raw >= 0 && raw <= 3 ? OPTION_SCORE[raw] : null;
  if (q.kind === "slider") return raw >= 1 && raw <= 10 ? Math.round(raw) : null;
  if (q.kind === "swipe") return [2, 5, 9].includes(raw) ? raw : null;
  return raw >= 0 && raw <= q.max ? dialScore(raw, q.scale) : null;
}

export type ProfileField = { id: keyof Profile; q: string; options?: string[]; text?: boolean; placeholder?: string };
export type Profile = { business?: string; field?: string; years?: string; team?: string; revenue?: string; goal?: string };

export const PROFILE: ProfileField[] = [
  { id: "business", q: "איך קוראים לעסק שלך?", text: true, placeholder: "לדוגמה: מספרת רונית" },
  { id: "field", q: "באיזה תחום?", options: ["שירותים / קליניקה", "מקצוען עצמאי", "מסחר / חנות", "מסעדנות ואוכל", "נדל״ן / פיננסים", "דיגיטל / אונליין", "תעשייה / קבלנות", "אחר"] },
  { id: "years", q: "כמה זמן העסק קיים?", options: ["פחות משנה", "1–3 שנים", "3–10 שנים", "יותר מ-10 שנים"] },
  { id: "team", q: "כמה אנשים עובדים בעסק?", options: ["רק אני", "2–5", "6–20", "יותר מ-20"] },
  { id: "revenue", q: "מחזור חודשי, בערך:", options: ["עד ₪30 אלף", "₪30–100 אלף", "₪100–300 אלף", "יותר מ-₪300 אלף"] },
  { id: "goal", q: "מה הדבר הכי חשוב לך ב-2027?", options: ["להכפיל הכנסות", "יותר רווח מאותו מחזור", "פחות שעות, יותר שקט", "לגדול: צוות וסניפים", "לעבור את השנה בשלום"] },
];

export type Scores = Record<StationId, number>;
export type ParamScore = { id: string; station: StationId; param: string; score: number };

const r1 = (n: number) => Math.round(n * 10) / 10;

export function scoreCheckup(answers: Record<string, number>): { scores: Scores; params: ParamScore[]; total: number } {
  const params: ParamScore[] = [];
  const sum: Record<string, number> = {};
  const cnt: Record<string, number> = {};
  for (const q of QUESTIONS) {
    const sc = answerScore(q, Number(answers[q.id]));
    if (sc === null) continue;
    params.push({ id: q.id, station: q.station, param: q.param, score: sc });
    sum[q.station] = (sum[q.station] ?? 0) + sc;
    cnt[q.station] = (cnt[q.station] ?? 0) + 1;
  }
  const scores = Object.fromEntries(STATIONS.map((st) => [st.id, cnt[st.id] ? r1(sum[st.id] / cnt[st.id]) : 0])) as Scores;
  const total = r1(STATIONS.reduce((s, st) => s + scores[st.id], 0) / STATIONS.length);
  return { scores, params, total };
}

export function grade(total: number) {
  if (total >= 8) return { word: "מוכן ל-2027", line: "העסק בנוי נכון. עכשיו הזמן להאיץ.", tone: "ok" as const };
  if (total >= 6) return { word: "יציב, עם דליפות", line: "יש בסיס חזק, ויש כמה ברזים פתוחים שעולים לך כסף.", tone: "mid" as const };
  if (total >= 4) return { word: "בסיכון", line: "העסק עובד בזכותך, לא בזכות שיטה. 2027 תדרוש יותר.", tone: "warn" as const };
  return { word: "מצב חירום", line: "העסק מנהל אותך. חייבים לעצור ולבנות מחדש, עכשיו.", tone: "bad" as const };
}

export const scoreTone = (s: number) => (s >= 8 ? "ok" : s >= 6 ? "mid" : s >= 4 ? "warn" : "bad");

export type Report = {
  headline: string;
  nir_note: string;
  top3: { title: string; why: string; action: string }[];
  feedback: Record<StationId, { good: string; fix: string }>;
  plan: {
    goal: string;
    north_star: { label: string; value: string }[];
    quarters: { q: string; theme: string; actions: string[] }[];
    first90: { when: string; task: string }[];
    kpis: { name: string; now: string; target: string }[];
    capital: { verdict: string; steps: string[] };
  };
};

const ACTION: Record<StationId, { good: string; fix: string; move: string }> = {
  vision: { good: "יש לך כיוון, ואתה יודע לאן אתה רוצה להגיע.", fix: "בלי יעד כתוב במספרים, כל החלטה נעשית מהבטן. כותבים יעד ל-2027 ומפרקים לרבעונים.", move: "לכתוב יעד ל-2027 במספרים ולפרק אותו ל-4 רבעונים" },
  brand: { good: "הלקוחות מבינים למה לבחור בך.", fix: "בלי בידול חד, נשאר רק להתחרות על מחיר. מנסחים משפט אחד שאומר למה דווקא אתה.", move: "לנסח משפט בידול אחד ולהטמיע אותו בכל מגע עם לקוח" },
  products: { good: "סל המוצרים שלך בנוי לרווח.", fix: "חסר מוצר חדירה שמכניס לקוחות בקלות, ומוצר תוכן שמוכר אותך גם כשאתה לא שם. ובודקים רווח גולמי על כל מוצר.", move: "לבנות מוצר חדירה ולבדוק רווח גולמי לכל מוצר" },
  marketing: { good: "יש לך מנוע לידים שעובד.", fix: "שיווק בלי מדידה הוא הימור. מגדירים ערוץ אחד, תקציב קבוע, ומודדים עלות ליד והחזר על כל שקל.", move: "להגדיר ערוץ שיווק אחד עם תקציב קבוע ומדידת עלות ליד" },
  digital: { good: "רואים אותך ברשת, והנוכחות עובדת בשבילך.", fix: "הלקוח בודק אותך בנייד לפני שהוא מתקשר. אתר מהיר שמביא פניות ותוכן קבוע הם תנאי בסיס ב-2027.", move: "לשדרג אתר / דף נחיתה לנייד ולהתחייב לקצב תוכן שבועי" },
  sales: { good: "אתה סוגר טוב, ויש לך תהליך.", fix: "כל פנייה שלא נסגרה היא כסף ששילמת עליו בשיווק. כותבים תסריט, מתרגלים ומוסיפים פולואפ קבוע.", move: "לכתוב תסריט מכירה ותהליך פולואפ של 3 נגיעות" },
  system: { good: "העסק רץ על נהלים ומדדים.", fix: "כשהכל בראש שלך, העסק לא יכול לגדול. כותבים נהלים, מגדירים זמני שירות ולוח מדדים שבועי.", move: "לכתוב 3 נהלים קריטיים ולוח מדדים שבועי" },
  team: { good: "העסק לא תלוי רק בך.", fix: "אם העסק נעצר כשאתה לא שם, אין לך עסק, יש לך עבודה. מעבירים אחריות עם יעדים ותגמול.", move: "להעביר תחום אחד לאחריות מלאה של מישהו אחר, עם יעד ותגמול" },
  money: { good: "אתה שולט במספרים.", fix: "רוב העסקים לא נסגרים בגלל הפסד, אלא בגלל תזרים. דוח רווח והפסד חודשי ותזרים ל-90 יום, ומשכורת קבועה לבעלים.", move: "לבנות תזרים ל-90 יום ולקבוע לעצמך משכורת קבועה" },
  capital: { good: "הרווח הופך אצלך לנכסים.", fix: "עסק שלא בונה הון משאיר אותך במשוואת זמן = כסף. קובעים אחוז קבוע מהרווח לנכסים, ותוכנית נדל״ן ל-10 שנים.", move: "לקבוע אחוז קבוע מהרווח לנכסים ולבנות תוכנית נדל״ן ל-10 שנים" },
};

/** Deterministic report, used when Gemini is unavailable (budget, outage). */
export function buildFallbackReport(profile: Profile, scores: Scores, total: number): Report {
  const sorted = [...STATIONS].sort((a, b) => scores[a.id] - scores[b.id]);
  const weak = sorted.slice(0, 3);
  const g = grade(total);
  const name = profile.business || "העסק שלך";
  return {
    headline: `${name}: ${g.word}. ${g.line}`,
    nir_note: "תקשיב לי טוב: 2027 לא תסלח לעסקים שעובדים מהבטן. תעבוד על החולשה הכי גדולה קודם, ורק אחר כך תאיץ. אסטרטגיה מנצחת טקטיקה.",
    top3: weak.map((s) => ({ title: s.label, why: ACTION[s.id].fix, action: ACTION[s.id].move })),
    feedback: Object.fromEntries(STATIONS.map((s) => [s.id, { good: scores[s.id] >= 6 ? ACTION[s.id].good : "יש פה בסיס לעבוד איתו.", fix: scores[s.id] >= 8 ? "לשמור על הקצב, ולבדוק פעם ברבעון." : ACTION[s.id].fix }])) as Report["feedback"],
    plan: {
      goal: profile.goal ? `המטרה של ${name} ל-2027: ${profile.goal}.` : `לבנות את ${name} לשנה יציבה ורווחית יותר.`,
      north_star: [
        { label: "ציון יעד בצ'קאפ", value: `${Math.min(10, Math.round((total + 2) * 10) / 10)}/10` },
        { label: "החולשה לתיקון", value: weak[0].label },
        { label: "קצב בדיקה", value: "פעם בשבוע" },
      ],
      quarters: [
        { q: "רבעון 1", theme: "יסודות", actions: [ACTION[weak[0].id].move, "יעד שנתי כתוב ולוח מדדים שבועי"] },
        { q: "רבעון 2", theme: "מנוע הכנסה", actions: [ACTION[weak[1].id].move, "ערוץ שיווק אחד מדוד, ותסריט מכירה"] },
        { q: "רבעון 3", theme: "שיטה", actions: [ACTION[weak[2].id].move, "נהלים כתובים והעברת אחריות"] },
        { q: "רבעון 4", theme: "צמיחה והון", actions: ["העלאת מחיר לפי ערך", "אחוז קבוע מהרווח לנכסים"] },
      ],
      first90: [
        { when: "שבועות 1–2", task: ACTION[weak[0].id].move },
        { when: "שבועות 3–6", task: ACTION[weak[1].id].move },
        { when: "שבועות 7–12", task: ACTION[weak[2].id].move },
      ],
      kpis: weak.map((s) => ({ name: s.label, now: `${scores[s.id]}/10`, target: `${Math.min(10, scores[s.id] + 3)}/10` })),
      capital: { verdict: ACTION.capital.fix, steps: ["לקבוע אחוז קבוע מהרווח לנכסים", "לבנות תוכנית נדל״ן ל-10 שנים", "לבדוק כל עסקה לפני שחותמים"] },
    },
  };
}

/** Prompt for the report. Kept short: the model gets only the profile and the scores. */
export function reportPrompt(profile: Profile, params: ParamScore[], scores: Scores, total: number) {
  const st = STATIONS.map((s) => `${s.label}: ${scores[s.id]}/10 (${params.filter((p) => p.station === s.id).map((p) => `${p.param} ${p.score}`).join(", ")})`).join("\n");
  return `אתה ניר דובדבני, מלווה עסקים 22 שנה. כתוב לבעל העסק את תוצאות הצ'קאפ העסקי שלו ותוכנית עסקית לשנת 2027.
הקול: גוף ראשון, ישיר, חם, חד, משפטים קצרים. עברית. בלי "מובטח", בלי הבטחות הכנסה, בלי המילה "כיס", בלי אימוג'י.
התוכנית חייבת להיות ספציפית לתחום ולגודל העסק, מעשית, עם צעדים שאפשר לבצע. אם הציון בתחנה גבוה (8+), אל תמציא בעיה.

פרופיל העסק:
שם: ${profile.business || "לא צוין"} · תחום: ${profile.field || "-"} · ותק: ${profile.years || "-"} · צוות: ${profile.team || "-"} · מחזור חודשי: ${profile.revenue || "-"} · המטרה ל-2027: ${profile.goal || "-"}

ציון כולל: ${total}/10
ציונים לפי תחנה (1–10):
${st}

החזר JSON בלבד במבנה הזה:
{"headline": "משפט אחד: האבחנה שלי על העסק",
 "nir_note": "2–3 משפטים אישיים ממני לבעל העסק",
 "top3": [{"title": "שם המהלך", "why": "למה זה הכי חשוב עכשיו", "action": "מה עושים, צעד ראשון"}] (בדיוק 3, לפי החולשות),
 "feedback": {"vision": {"good": "מה טוב", "fix": "מה לתקן ואיך"}, ...לכל 10 התחנות: vision, brand, products, marketing, digital, sales, system, team, money, capital},
 "plan": {"goal": "המטרה ל-2027 במשפט, עם מספר אם אפשר",
   "north_star": [{"label": "...", "value": "..."}] (3 מדדי צפון),
   "quarters": [{"q": "רבעון 1", "theme": "...", "actions": ["...", "...", "..."]}] (4 רבעונים, 3 פעולות בכל אחד),
   "first90": [{"when": "שבועות 1–2", "task": "..."}] (6 צעדים ל-90 הימים הראשונים),
   "kpis": [{"name": "...", "now": "...", "target": "..."}] (5 מדדים),
   "capital": {"verdict": "משפט על ההון והנדל״ן", "steps": ["...", "...", "..."]}}}`;
}

/** Keep only well-formed fields from the model; fill gaps from the fallback. */
export function sanitizeReport(raw: unknown, fallback: Report): Report {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const s = (v: unknown, d: string, max = 400) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : d);
  const arr = <T,>(v: unknown, f: (x: Record<string, unknown>) => T | null, d: T[], max: number) => {
    const out = Array.isArray(v) ? v.map((x) => (x && typeof x === "object" ? f(x as Record<string, unknown>) : null)).filter((x): x is T => !!x) : [];
    return out.length ? out.slice(0, max) : d;
  };
  const fb = (o.feedback && typeof o.feedback === "object" ? o.feedback : {}) as Record<string, Record<string, unknown>>;
  const p = (o.plan && typeof o.plan === "object" ? o.plan : {}) as Record<string, unknown>;
  const cap = (p.capital && typeof p.capital === "object" ? p.capital : {}) as Record<string, unknown>;
  return {
    headline: s(o.headline, fallback.headline, 240),
    nir_note: s(o.nir_note, fallback.nir_note, 600),
    top3: arr(o.top3, (x) => (x.title ? { title: s(x.title, "", 80), why: s(x.why, "", 300), action: s(x.action, "", 300) } : null), fallback.top3, 3),
    feedback: Object.fromEntries(STATIONS.map((st) => [st.id, { good: s(fb[st.id]?.good, fallback.feedback[st.id].good, 260), fix: s(fb[st.id]?.fix, fallback.feedback[st.id].fix, 320) }])) as Report["feedback"],
    plan: {
      goal: s(p.goal, fallback.plan.goal, 240),
      north_star: arr(p.north_star, (x) => (x.label ? { label: s(x.label, "", 60), value: s(x.value, "", 60) } : null), fallback.plan.north_star, 3),
      quarters: arr(p.quarters, (x) => (x.q ? { q: s(x.q, "", 20), theme: s(x.theme, "", 60), actions: Array.isArray(x.actions) ? (x.actions as unknown[]).filter((a): a is string => typeof a === "string").slice(0, 4).map((a) => a.slice(0, 200)) : [] } : null), fallback.plan.quarters, 4),
      first90: arr(p.first90, (x) => (x.task ? { when: s(x.when, "", 30), task: s(x.task, "", 220) } : null), fallback.plan.first90, 6),
      kpis: arr(p.kpis, (x) => (x.name ? { name: s(x.name, "", 60), now: s(x.now, "-", 40), target: s(x.target, "-", 40) } : null), fallback.plan.kpis, 5),
      capital: { verdict: s(cap.verdict, fallback.plan.capital.verdict, 300), steps: Array.isArray(cap.steps) ? (cap.steps as unknown[]).filter((a): a is string => typeof a === "string").slice(0, 4).map((a) => a.slice(0, 200)) : fallback.plan.capital.steps },
    },
  };
}

/* ---------------- money: what each weakness costs (an estimate from the stated revenue) ---------------- */
const REVENUE_MID: Record<string, number> = { "עד ₪30 אלף": 20000, "₪30–100 אלף": 60000, "₪100–300 אלף": 180000, "יותר מ-₪300 אלף": 400000 };
/** Share of monthly revenue a station leaks at score 1 (scales down linearly to 0 at score 10). */
const LEAK_RATE: Record<StationId, number> = { vision: 0.04, brand: 0.05, products: 0.06, marketing: 0.07, digital: 0.04, sales: 0.08, system: 0.04, team: 0.05, money: 0.05, capital: 0.03 };

export function monthlyRevenue(p: Profile) { return p.revenue ? REVENUE_MID[p.revenue] ?? 0 : 0; }

/** Estimated monthly ₪ leak per station + total. 0 when the revenue bracket is unknown. */
export function leaks(p: Profile, scores: Partial<Record<StationId, number>>) {
  const rev = monthlyRevenue(p);
  const per = Object.fromEntries(STATIONS.map((s) => {
    const sc = scores[s.id];
    const v = rev && sc ? Math.round((rev * LEAK_RATE[s.id] * (10 - sc)) / 9 / 100) * 100 : 0;
    return [s.id, v];
  })) as Record<StationId, number>;
  const total = Object.values(per).reduce((a, b) => a + b, 0);
  return { per, total, rev };
}
export const nis = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;

/* ---------------- Nir reacts to every answer ---------------- */
const REACT: Record<StationId, [string, string, string]> = {
  vision: ["בלי יעד אתה רץ מהר לשום מקום. נתקן את זה בתוכנית.", "יש כיוון. עכשיו צריך להפוך אותו למספרים.", "זה כבר עסק שיודע לאן הוא הולך. יפה."],
  brand: ["אם אתה לא יודע למה אתה, גם הלקוח לא יודע.", "יש בסיס. צריך לחדד אותו עד שהוא חותך.", "בידול חד. זה מה שמאפשר לך לגבות יותר."],
  products: ["פה יש כסף שנשאר על השולחן. נבנה את זה.", "חצי דרך. עוד מוצר אחד נכון ישנה את התמונה.", "סל מוצרים של עסק שמרוויח. כל הכבוד."],
  marketing: ["שיווק בלי מספרים זה הימור. נמדוד.", "יש תנועה. עכשיו צריך לדעת מה באמת מביא כסף.", "מנוע לידים מדוד. זה נכס."],
  digital: ["הלקוח בודק אותך בנייד. כרגע הוא לא מתרשם.", "נוכחות סבירה. אפשר להפוך אותה למכונת פניות.", "רואים אותך ברשת, וזה עובד בשבילך."],
  sales: ["כל פנייה שלא נסגרת, שילמת עליה פעמיים.", "סוגר, אבל משאיר כסף. תסריט ופולואפ יעשו הבדל.", "אחוז סגירה של מקצוענים. תשמור על זה."],
  system: ["הכל בראש שלך? אז העסק מוגבל לגודל של הראש שלך.", "יש התחלה של שיטה. צריך לסגור אותה.", "עסק שרץ על שיטה. ככה גדלים."],
  team: ["אם תיעלם, העסק נעצר. זו עבודה, לא עסק.", "יש מי שמחזיק, חלקית. נעביר עוד אחריות.", "העסק לא תלוי רק בך. זה החופש האמיתי."],
  money: ["עסקים נסגרים בגלל תזרים, לא בגלל הפסד. זה דחוף.", "אתה מכיר את המספרים, בערך. בערך זה יקר.", "שליטה במספרים. ככה מנהלים עסק."],
  capital: ["כל הכסף נבלע? אז אתה עדיין במשוואת זמן = כסף.", "יש כוונה. צריך תוכנית הון כתובה.", "הרווח הופך לנכסים. ככה בונים עושר."],
};
export function reaction(st: StationId, score: number) { return REACT[st][score >= 8 ? 2 : score >= 5 ? 1 : 0]; }

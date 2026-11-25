/**
 * הצ'קאפ העסקי של ניר דובדבני · 2027.
 * 24 questions across 10 stations of Nir's method (Alpha map + money + capital), scored 1–10,
 * plus a short business profile. The report (feedback + a 2027 business plan) is written by Gemini
 * from these scores; buildFallbackReport() covers the case where the model is unavailable.
 */

export type StationId = "vision" | "brand" | "products" | "marketing" | "digital" | "sales" | "system" | "team" | "money" | "capital";

export type Station = { id: StationId; n: number; label: string; tag: string; icon: string };

export const STATIONS: Station[] = [
  { id: "vision", n: 1, label: "חזון ויעד", tag: "לאן העסק הולך", icon: "target" },
  { id: "brand", n: 2, label: "ערכים ובידול", tag: "למה דווקא אתה", icon: "star" },
  { id: "products", n: 3, label: "מוצרים ותמחור", tag: "מה אתה מוכר ובכמה", icon: "coin" },
  { id: "marketing", n: 4, label: "שיווק ולידים", tag: "איך מגיעים לקוחות", icon: "spark" },
  { id: "digital", n: 5, label: "נוכחות דיגיטלית", tag: "איך רואים אותך ברשת", icon: "image" },
  { id: "sales", n: 6, label: "מכירות", tag: "איך פנייה הופכת לכסף", icon: "phone" },
  { id: "system", n: 7, label: "שיטה ותהליכים", tag: "SOP, SLA ומדדים", icon: "check" },
  { id: "team", n: 8, label: "צוות ומנהיגות", tag: "מי מחזיק את העסק", icon: "users" },
  { id: "money", n: 9, label: "כסף ותזרים", tag: "רווח והפסד ומזומנים", icon: "coin" },
  { id: "capital", n: 10, label: "נדל״ן והון", tag: "מה נשאר לך ביד", icon: "vault" },
];

export type Q = { id: string; station: StationId; param: string; q: string; hint?: string; options: [string, string, string, string] };

/** Option index 0..3 → score 1 / 4 / 7 / 10. */
export const OPTION_SCORE = [1, 4, 7, 10] as const;

export const QUESTIONS: Q[] = [
  { id: "v1", station: "vision", param: "יעד כתוב ל-2027", q: "יש לך יעד כתוב לשנה הקרובה, במספרים?", hint: "הכנסות, רווח, לקוחות. משהו שאפשר למדוד.", options: ["אין, אני חי מחודש לחודש", "יש תחושה בראש", "יש יעד כתוב, בלי תוכנית", "יעד כתוב, ותוכנית רבעונית שאני בודק"] },
  { id: "v2", station: "vision", param: "עבודה על העסק", q: "כמה זמן בשבוע אתה עובד על העסק, ולא בתוכו?", options: ["כמעט אפס", "שעה-שעתיים", "חצי יום", "יום שלם ויותר"] },
  { id: "b1", station: "brand", param: "בידול", q: "לקוח שואל: למה דווקא אתה? יש לך תשובה בשורה אחת?", options: ["אני הכי זול / הכי זמין", "אני מתלבט כל פעם מחדש", "יש משפט, לא תמיד חד", "משפט חד שכל הצוות אומר"] },
  { id: "b2", station: "brand", param: "ערכים", q: "הערכים של העסק כתובים, והעובדים חיים לפיהם?", options: ["לא חשבתי על זה", "בראש שלי בלבד", "כתובים, לא מיושמים", "כתובים, מדוברים ומתוגמלים"] },
  { id: "p1", station: "products", param: "מוצר חדירה", q: "יש לך מוצר חדירה: משהו קטן שמכניס לקוח חדש בקלות?", hint: "בדיקה, ייעוץ קצר, מוצר היכרות.", options: ["אין, רק המוצר הגדול", "יש, לא מתומחר נכון", "יש ועובד חלקית", "יש, והוא מזין את המוצר הגדול"] },
  { id: "p2", station: "products", param: "מוצר תוכן", q: "יש לך מוצר תוכן (קורס, סדנה, הרצאה, ספר) שמוכר אותך גם כשאתה ישן?", options: ["אין", "יש רעיון", "יש, לא נמכר קבוע", "יש, ומכניס כסף כל חודש"] },
  { id: "p3", station: "products", param: "רווח גולמי ותמחור", q: "אתה יודע מה הרווח הגולמי על כל מוצר, ומתי העלית מחיר לאחרונה?", options: ["לא יודע, ולא העליתי שנים", "בערך, בראש", "על העיקריים, העליתי לאחרונה", "עד השקל, ואני מעדכן כל שנה"] },
  { id: "m1", station: "marketing", param: "קמפיינים", q: "איך נראה השיווק שלך היום?", options: ["רק מפה לאוזן", "פוסטים פה ושם", "קמפיין קבוע בערוץ אחד", "כמה ערוצים, מדודים, עם תקציב קבוע"] },
  { id: "m2", station: "marketing", param: "לידים", q: "אתה יודע כמה לידים נכנסים בחודש, ומה עולה ליד?", options: ["לא יודע", "בערך כמה", "יודע כמה, לא כמה עולה", "יודע כמה, כמה עולה ומאיפה"] },
  { id: "m3", station: "marketing", param: "החזר על פרסום (ROAS)", q: "על כל שקל בפרסום, אתה יודע כמה חוזר?", options: ["לא מפרסם / לא יודע", "יש לי ניחוש", "מודד לפעמים", "מודד קבוע, ומגדיל את מה שעובד"] },
  { id: "d1", station: "digital", param: "אתר ודף נחיתה", q: "האתר שלך היום:", options: ["אין אתר", "יש, ישן ולא מותאם לנייד", "מותאם לנייד, לא מביא פניות", "מהיר, מותאם לנייד ומביא פניות"] },
  { id: "d2", station: "digital", param: "תוכן ברשתות", q: "כמה תוכן אתה מעלה לרשתות?", options: ["כמעט כלום", "פעם בכמה שבועות", "כל שבוע", "כמה פעמים בשבוע, לפי תוכנית"] },
  { id: "s1", station: "sales", param: "אחוז סגירה", q: "מתוך 10 פניות רציניות, כמה נסגרות?", options: ["פחות מ-2", "2–3", "4–5", "6 ומעלה"] },
  { id: "s2", station: "sales", param: "תסריט ופולואפ", q: "יש תסריט שיחה ותהליך פולואפ קבוע?", options: ["מאלתר כל פעם", "בראש, לא כתוב", "כתוב, לא תמיד מבוצע", "כתוב, מתורגל ונמדד"] },
  { id: "y1", station: "system", param: "נהלי עבודה (SOP)", q: "התהליכים בעסק כתובים: שירות, מכירה, קליטת לקוח?", options: ["הכל אצלי בראש", "חלק קטן", "רובם, לא מעודכנים", "כתובים, מעודכנים, עם אחראים"] },
  { id: "y2", station: "system", param: "זמני שירות (SLA)", q: "יש זמני תגובה ושירות מוגדרים ללקוח?", hint: "תוך כמה זמן עונים לפנייה, מתי מספקים, מה מבטיחים.", options: ["אין", "לפי הזמן הפנוי", "יש, לא נמדד", "מוגדר, נמדד ונאכף"] },
  { id: "y3", station: "system", param: "מדדים (KPI)", q: "יש לוח מדדים שאתה מסתכל עליו כל שבוע?", options: ["אין", "מסתכל על הבנק", "כמה מספרים, לא קבוע", "לוח קבוע, כל שבוע"] },
  { id: "t1", station: "team", param: "תלות בך", q: "אם תיעלם לשבועיים, מה קורה לעסק?", options: ["נעצר", "נפגע קשה", "מתפקד חלקית", "ממשיך לרוץ"] },
  { id: "t2", station: "team", param: "תגמול ויעדים", q: "הצוות (או אתה, אם אתה לבד) עובד עם יעדים ותגמול?", options: ["אין יעדים", "יעדים בעל פה", "יעדים כתובים, בלי תגמול", "יעדים כתובים ותגמול לפי ביצוע"] },
  { id: "f1", station: "money", param: "רווח והפסד (P&L)", q: "אתה רואה דוח רווח והפסד כל חודש?", options: ["רק כשרואה החשבון שולח", "פעם בשנה", "מדי פעם", "כל חודש, ואני מבין כל שורה"] },
  { id: "f2", station: "money", param: "תזרים מזומנים", q: "אתה יודע מה יהיה המצב בבנק בעוד 90 יום?", options: ["מגלה כשזה מגיע", "יש לי תחושה", "אקסל, לפעמים", "תזרים מעודכן כל שבוע"] },
  { id: "f3", station: "money", param: "משכורת לבעלים", q: "אתה מושך לעצמך משכורת קבועה?", options: ["לא / לא קבוע", "מה שנשאר בסוף החודש", "קבועה, נמוכה מהשוק", "קבועה ומלאה, ורווח נשאר בעסק"] },
  { id: "c1", station: "capital", param: "תוכנית נדל״ן", q: "יש לך תוכנית נדל״ן להכנסה פסיבית ל-10 השנים הקרובות?", options: ["אין, לא חשבתי", "חולם על זה", "יש כיוון, בלי תוכנית", "תוכנית כתובה, ואני מתקדם בה"] },
  { id: "c2", station: "capital", param: "רווח שהופך לנכסים", q: "כמה מהרווח של העסק הופך לנכסים (חיסכון, השקעות, נדל״ן)?", options: ["כלום, הכל נבלע", "מעט ולא קבוע", "סכום קבוע, קטן", "אחוז קבוע מכל חודש"] },
];

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
    const v = answers[q.id];
    if (!Number.isInteger(v) || v < 0 || v > 3) continue;
    const s = OPTION_SCORE[v];
    params.push({ id: q.id, station: q.station, param: q.param, score: s });
    sum[q.station] = (sum[q.station] ?? 0) + s;
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

/**
 * Lead & member journeys. A daily cron (app/api/cron/journeys) computes which stage each person is due for,
 * records it in journey_sends (each stage is sent once per person) and pushes it to Make, which sends the
 * WhatsApp template (ManyChat) and the email. `wa` is the WhatsApp template name to approve at Meta.
 */
export type Stage = {
  key: string;
  track: "trial" | "lost" | "member" | "renewal" | "cancelled" | "checkout";
  wa: string; // WhatsApp template name (ManyChat / Meta)
  subject: string; // email subject
  text: string; // message body ({{first_name}}, {{plans_url}}, {{app_url}}, {{days_left}})
  transactional?: boolean; // sent even to people who opted out of marketing
};

export const STAGES: Stage[] = [
  // ---------- trial (30 days) ----------
  { key: "t_d1_noq", track: "trial", wa: "dp_t_d1_noq", subject: "עוד לא שאלת אותי כלום 🙂", text: "{{first_name}}, לא צריך שאלה חכמה. \"איך אני מביא יותר לקוחות?\" זה מספיק. 30 שניות: {{app_url}}" },
  { key: "t_d3_xray", track: "trial", wa: "dp_t_d3_xray", subject: "12 השאלות שאני שואל כל בעל עסק", text: "שמתי אותן ב\"רנטגן עסקי\". 3 דקות, ציון על 6 צירים, והמקום הכי חלש בעסק שלך: {{app_url}}/xray" },
  { key: "t_d7_week", track: "trial", wa: "dp_t_d7_week", subject: "שבוע ראשון מאחוריך 🔥", text: "{{first_name}}, מה הדבר הכי שימושי שקיבלת עד עכשיו? תענה לי במילה או שתיים." },
  { key: "t_d10_numbers", track: "trial", wa: "dp_t_d10_numbers", subject: "רוצה תשובות עם המספרים שלך?", text: "תכניס את הנתונים של החודש בתיק העסקי. 2 דקות, ומשם אני עונה לך עם המספרים שלך: {{app_url}}/vault" },
  { key: "t_d14_half", track: "trial", wa: "dp_t_d14_half", subject: "עברו 14 יום. נשארו 16", text: "עוד לא ביקשת תוכנית עבודה ל-90 יום? זה מה שלקוחות משלמים לי עליו אלפים. ומי שכבר החליט: המסלולים כאן, וימי המתנה לא הולכים לאיבוד: {{plans_url}}" },
  { key: "t_d21_plans", track: "trial", wa: "dp_t_d21_plans", subject: "מה קורה אחרי ה-30 יום?", text: "Alpha Basic: כל 9 הקורסים שלי, כל הספרים, כנס רבעוני וזום איתי פעם בשבועיים. מ-₪229 לחודש. {{plans_url}}" },
  { key: "t_d25_offer", track: "trial", wa: "dp_t_d25_offer", subject: "עוד 5 ימים נגמרת המתנה", text: "{{first_name}}, רוצה להמשיך? בוחרים מסלול בשתי דקות, או שנציג חוזר אליך: {{plans_url}}" },
  { key: "t_d28_last", track: "trial", wa: "dp_t_d28_last", subject: "יומיים", text: "אחרי זה הגישה נסגרת והשאלות חוזרות לחכות לפגישה. כל מה שבנינו נשמר: {{plans_url}}" },
  { key: "t_d30_closed", track: "trial", wa: "dp_t_d30_closed", subject: "הגישה במתנה הסתיימה", text: "{{first_name}}, חודש המתנה הסתיים. השיחות והתיק העסקי שלך שמורים, ומחכים לך במסלול: {{plans_url}}", transactional: true },
  // ---------- didn't buy: win-back (after day 30) ----------
  { key: "l_d33_rep", track: "lost", wa: "dp_l_d33_rep", subject: "ניסינו לתפוס אותך", text: "השאלות ששאלת שמורות בתיק שלך. ברגע שתבחר מסלול, הכל ממשיך מאיפה שעצרת: {{plans_url}}" },
  { key: "l_d45", track: "lost", wa: "dp_l_d45", subject: "מה עצר אותך?", text: "{{first_name}}, שאלה כנה: מה עצר אותך מלהמשיך? מחיר, זמן, או שלא קיבלת מה שחיפשת? תענה לי, אני קורא הכל." },
  { key: "l_d60", track: "lost", wa: "dp_l_d60", subject: "הכנס הרבעוני הבא בדרך", text: "הכנס הבא של בעלי העסקים מתקרב. חברי Alpha נכנסים חינם, יחד עם כל הקורסים והזום איתי: {{plans_url}}" },
  { key: "l_d90", track: "lost", wa: "dp_l_d90", subject: "3 חודשים. מה השתנה בעסק?", text: "{{first_name}}, עברו 3 חודשים. אם המספרים לא זזו, זה הזמן לחזור לתוכנית: {{plans_url}}" },
  { key: "l_d180", track: "lost", wa: "dp_l_d180", subject: "חצי שנה", text: "חצי שנה מאז שהתחלנו. הפלטפורמה התחזקה מאז: קורסים, כלים ומחשבונים חדשים. בוא לראות: {{plans_url}}" },
  // ---------- members ----------
  { key: "p_d2_courses", track: "member", wa: "dp_p_d2_courses", subject: "הקורסים שלך פתוחים", text: "{{first_name}}, כל 9 הקורסים נפתחו לך במערכת הקורסים עם המייל שלך. תתחיל מ\"פשוט להיות עסק אלפא\"." },
  { key: "p_d7_zoom", track: "member", wa: "dp_p_d7_zoom", subject: "הזום הבא איתי", text: "פעם בשבועיים אני בזום עם חברי Alpha: שאלות, תשובות ואסטרטגיה. הקישור בתוך הפלטפורמה: {{app_url}}" },
  { key: "p_d30_upsell", track: "member", wa: "dp_p_d30_upsell", subject: "חודש ראשון. רוצה עזרה בביצוע?", text: "ב-Alpha Private יועץ בכיר יושב איתך 4 שעות ומטמיע הכל על העסק שלך. משלמים רק את ההפרש: {{plans_url}}" },
  { key: "p_d90_upsell", track: "member", wa: "dp_p_d90_upsell", subject: "רבעון ראשון מאחוריך", text: "רוצה לשבת איתי אחד על אחד? ב-Alpha Upgrade יש פגישה אישית איתי. ב-Alpha Pro גם פרק פודקאסט על העסק שלך: {{plans_url}}" },
  { key: "p_d180_check", track: "member", wa: "dp_p_d180_check", subject: "חצי שנה ביחד 🔥", text: "{{first_name}}, חצי שנה. מה המספר האחד שזז הכי הרבה בעסק? תענה לי, אני רוצה לשמוע." },
  { key: "p_d335_notice", track: "renewal", wa: "dp_p_d335_notice", subject: "בעוד 30 יום: המנוי ממשיך ב-₪69 לחודש", text: "השנה שלך מסתיימת ב-{{year_end}}. מהיום שאחריו המנוי ממשיך אוטומטית ב-₪69 + מע״מ לחודש, עם כל מה שיש לך היום. לא צריך לעשות כלום. אפשר לבטל בכל רגע.", transactional: true },
  { key: "p_d365_renewed", track: "renewal", wa: "dp_p_d365_renewed", subject: "ממשיכים: ₪69 לחודש", text: "{{first_name}}, השנה הראשונה הסתיימה והמנוי ממשיך ב-₪69 + מע״מ לחודש. תודה שאתה איתי 🍒", transactional: true },
  // ---------- abandoned checkout (stage key is c_abandon:<order id>) ----------
  { key: "c_abandon", track: "checkout", wa: "dp_c_abandon", subject: "עצרת באמצע ההרשמה למסלול", text: "{{first_name}}, ראיתי שהתחלת להירשם למסלול ועצרת. משהו לא ברור? נציג יכול לחזור אליך ולסגור הכל בטלפון. או להמשיך כאן: {{plans_url}}" },
  // ---------- cancelled after the year ----------
  { key: "x_d7", track: "cancelled", wa: "dp_x_d7", subject: "חבל שהלכת", text: "{{first_name}}, המנוי בוטל. אם משהו לא עבד, תגיד לי מה. ואם תרצה לחזור, הכל שמור: {{plans_url}}" },
  { key: "x_d30", track: "cancelled", wa: "dp_x_d30", subject: "הכנס הבא בדרך", text: "הכנס הרבעוני הבא מתקרב. חוזרים ל-Alpha וממשיכים מאיפה שעצרת: {{plans_url}}" },
  { key: "x_d90", track: "cancelled", wa: "dp_x_d90", subject: "3 חודשים בלי הפלטפורמה", text: "{{first_name}}, מה השתנה בעסק ב-3 החודשים האחרונים? הקורסים והכלים מחכים: {{plans_url}}" },
];

const D = 86400_000;
export type JourneyUser = {
  id: string;
  plan: string | null;
  created_at: string;
  access_until: string | null;
  subscribed_at: string | null;
  year_ends_at: string | null;
  renewal_mode: string | null;
  questions_count: number;
  marketing_opt_out: boolean;
  has_financials: boolean;
};

/** The single most relevant stage that is due for this person today (null = nothing to send). */
export function dueStage(u: JourneyUser, sent: Set<string>, now = Date.now()): Stage | null {
  const by = (k: string) => STAGES.find((s) => s.key === k)!;
  const age = (now - new Date(u.created_at).getTime()) / D;
  const until = u.access_until ? new Date(u.access_until).getTime() : now;
  const candidates: string[] = [];

  if (u.plan === "paid") {
    const subAge = u.subscribed_at ? (now - new Date(u.subscribed_at).getTime()) / D : 0;
    const toYear = u.year_ends_at ? (new Date(u.year_ends_at).getTime() - now) / D : 999;
    if (u.renewal_mode === "cancelled") {
      const since = -toYear;
      if (since >= 90) candidates.push("x_d90");
      else if (since >= 30) candidates.push("x_d30");
      else if (since >= 7) candidates.push("x_d7");
    } else {
      if (toYear <= 0) candidates.push("p_d365_renewed");
      else if (toYear <= 30) candidates.push("p_d335_notice");
      else if (subAge >= 180) candidates.push("p_d180_check");
      else if (subAge >= 90) candidates.push("p_d90_upsell");
      else if (subAge >= 30) candidates.push("p_d30_upsell");
      else if (subAge >= 7) candidates.push("p_d7_zoom");
      else if (subAge >= 2) candidates.push("p_d2_courses");
    }
  } else if (until > now) {
    // in the gift month: the latest due stage wins, earlier ones are skipped
    if (age >= 28) candidates.push("t_d28_last");
    else if (age >= 25) candidates.push("t_d25_offer");
    else if (age >= 21) candidates.push("t_d21_plans");
    else if (age >= 14) candidates.push("t_d14_half");
    else if (age >= 10 && !u.has_financials) candidates.push("t_d10_numbers");
    else if (age >= 7 && u.questions_count > 0) candidates.push("t_d7_week");
    else if (age >= 3) candidates.push("t_d3_xray");
    else if (age >= 1 && u.questions_count === 0) candidates.push("t_d1_noq");
  } else {
    const since = (now - until) / D;
    if (since >= 180) candidates.push("l_d180");
    else if (since >= 90) candidates.push("l_d90");
    else if (since >= 60) candidates.push("l_d60");
    else if (since >= 45) candidates.push("l_d45");
    else if (since >= 3) candidates.push("l_d33_rep");
    else candidates.push("t_d30_closed");
  }

  for (const k of candidates) {
    const s = by(k);
    if (sent.has(k)) continue;
    if (u.marketing_opt_out && !s.transactional) continue;
    return s;
  }
  return null;
}

export function render(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

/**
 * Journey v2 (DP2, 23.11.2026, after Nir's call): the offer is "30 יום ייעוץ עסקי במתנה" plus a free 15-minute
 * personal explanation call (morning / noon / evening). Self-checkout comes FIRST in every message; the call is
 * the second option. No webinar. Spec: the "פלואו אוטומציות · Duvdevani Platform" doc.
 *
 * WhatsApp goes out as ManyChat flows ("DP2 | dp2_*") through the Make scenario "Duvdevani Platform –
 * DP2 Journeys" (DP2_WEBHOOK_URL); emails ride the same scenario into Rav Messer (no emojis there).
 * `wa` is the WhatsApp template (null = email only); `email` is the email body (null = WhatsApp only).
 */
export type Stage2 = {
  key: string;
  kind: "service" | "marketing";
  wa: string | null;
  subject: string;
  email: string | null;
};

const SIGN = "\n\nניר דובדבני";

export const STAGES2: Stage2[] = [
  { key: "welcome", kind: "marketing", wa: "dp3_welcome", subject: "30 יום ייעוץ עסקי במתנה. מתחילים", email: "{{first_name}}, ניר כאן.\nנרשמת ל-30 יום ייעוץ עסקי במתנה. מהרגע הזה השיטה שלי זמינה לך 24/6: הבוט שעובד כמו שאני עובד, הרנטגן העסקי שמראה איפה העסק חלש, והתיק העסקי שמחזיק את המספרים שלך.\nמי שרוצה לעבוד איתי ברצינות, בלי הפסקה אחרי 30 הימים, מצטרף כבר עכשיו בכמה קליקים:\n{{plans_url}}\nומגיעה לך גם רבע שעה של הסבר אישי במתנה: מישהו מהצוות שלי יראה לך הכל בלייב, על העסק שלך. בחר מתי נוח שנתקשר:\n{{app_url}}/home" + SIGN },
  { key: "no_answer", kind: "marketing", wa: "dp3_no_answer", subject: "", email: null },
  { key: "h24", kind: "marketing", wa: "dp3_24h", subject: "", email: null },
  { key: "h72", kind: "marketing", wa: "dp3_72h_nir", subject: "למה בניתי את הייעוץ הזה", email: "{{first_name}}, ניר כאן.\n22 שנה אני פוגש בעלי עסקים, והבעיה כמעט אף פעם היא לא ידע. היא בהירות: מה הצעד הבא, ואיפה הכסף בורח.\nבשביל זה בניתי את הייעוץ הזה: הבוט שעובד לפי השיטה שלי, רנטגן שמראה איפה העסק חלש, ותיק שמחזיק את המספרים שלך.\nמי שרציני מצטרף לבד, בשתי דקות:\n{{plans_url}}\nמעדיף לדבר קודם? בחר כאן מתי נוח שנתקשר:\n{{app_url}}/home" + SIGN },
  { key: "meeting_set", kind: "marketing", wa: "dp3_meeting_set", subject: "נקבע: {{meeting_when}}", email: "{{first_name}}, נקבע.\nרבע שעה של הסבר אישי: {{meeting_when}}, עם {{rep_name}}.\nתגיע עם שאלה אחת שבוערת לך בעסק. יוצאים משם עם צעד ברור.\nלא רוצה לחכות לשיחה? מצטרפים כבר עכשיו, בכמה קליקים:\n{{plans_url}}" + SIGN },
  { key: "reminder", kind: "service", wa: "dp3_reminder", subject: "", email: null },
  { key: "no_show", kind: "marketing", wa: "dp3_no_show", subject: "", email: null },
  { key: "after_meeting", kind: "marketing", wa: "dp3_after_meeting", subject: "עכשיו מתחיל החלק החשוב", email: "{{first_name}}, ניר כאן.\nדיברת עם {{rep_name}}, ועכשיו מתחיל החלק שמבדיל בין מי שמדבר למי שעושה: ביצוע.\nהצעד הראשון שלך לשבוע הקרוב: {{next_step}}\nממשיכים לעבוד איתי גם אחרי 30 הימים? מצטרפים כאן:\n{{plans_url}}\nרוצה לבנות את זה לעומק, אחד על אחד? השב למייל הזה ונקבע פגישת אסטרטגיה." + SIGN },
  { key: "d1", kind: "marketing", wa: "dp3_d1", subject: "", email: null },
  { key: "d3_xray", kind: "marketing", wa: "dp3_d3_xray", subject: "12 השאלות שאני שואל כשאני נכנס לעסק", email: "{{first_name}}, ניר כאן.\nכשאני נכנס לעסק, אני שואל 12 שאלות. שמתי אותן ב\"רנטגן העסקי\": 3 דקות, ואתה רואה בדיוק איפה העסק שלך חלש:\n{{app_url}}/xray\nמי שכבר יודע שהוא ממשיך איתי, מצטרף כאן:\n{{plans_url}}" + SIGN },
  { key: "d7_active", kind: "marketing", wa: "dp3_d7_active", subject: "", email: null },
  { key: "d7_quiet", kind: "marketing", wa: "dp3_d7_quiet", subject: "", email: null },
  { key: "d10_vault", kind: "marketing", wa: "dp3_d10_vault", subject: "תשובה כללית או תשובה עם המספרים שלך", email: "{{first_name}}, ניר כאן.\nשאלה כללית מקבלת תשובה כללית. מי שמכניס את המספרים שלו מקבל תשובה שמזיזה כסף.\n2 דקות בתיק העסקי:\n{{app_url}}/vault\nולהמשך איתי אחרי 30 הימים, כל המסלולים כאן:\n{{plans_url}}" + SIGN },
  { key: "d14", kind: "marketing", wa: "dp3_d14", subject: "שבועיים. מה עכשיו", email: "{{first_name}}, שבועיים של ייעוץ.\nעד עכשיו בנית: {{built_summary}}.\nעכשיו החלק שמבדיל בין מי שמדבר למי שעושה: לבחור דבר אחד ולהביא אותו לביצוע.\nממשיכים איתי גם אחרי 30 הימים? מצטרפים כאן:\n{{plans_url}}\nרוצה לבנות את זה אחד על אחד בפגישת אסטרטגיה? השב למייל הזה." + SIGN },
  { key: "d21", kind: "marketing", wa: "dp3_d21", subject: "שלושה שבועות. מה ממשיך כשממשיכים", email: "{{first_name}}, ניר כאן.\nשלושה שבועות. בנית: {{built_summary}}.\nמי שממשיך איתי לא מתחיל מאפס: הבוט זוכר את העסק שלך, התכניות נשמרות, וכל חודש נכנסים כלים ותכנים חדשים שלי.\nמצטרפים בכמה קליקים:\n{{plans_url}}\nשאלה לפני? השב למייל הזה ומישהו מהצוות שלי יחזור אליך." + SIGN },
  { key: "d25", kind: "marketing", wa: "dp3_d25", subject: "", email: null },
  { key: "d27_faq", kind: "marketing", wa: null, subject: "4 שאלות ששואלים אותי לפני שמחליטים", email: "{{first_name}}, ניר כאן. ריכזתי את השאלות ששואלים אותי הכי הרבה בשלב הזה.\nכמה זה עולה? כל המסלולים והמחירים בעמוד המסלולים, עם מה שכלול בכל אחד.\nמה ההבדל בין המסלולים? כולם כוללים את הבוט, התיק העסקי והתכנים. הגבוהים מוסיפים פגישות אחד על אחד עם הצוות שלי, או איתי.\nמה קורה לנתונים? הכל נשמר. מי שמצטרף ממשיך מאותה נקודה.\nאיך מבטלים? בלחיצה, מעמוד המסלולים.\nמצטרפים כאן:\n{{plans_url}}\nרוצה לדבר עם מישהו מהצוות? השב למייל הזה." + SIGN },
  { key: "d29", kind: "service", wa: "dp3_d29", subject: "", email: null },
  { key: "d30", kind: "marketing", wa: "dp3_d30", subject: "30 ימי הייעוץ הסתיימו. הכל שמור", email: "{{first_name}}, ניר כאן.\n30 ימי הייעוץ הסתיימו. השיחות, התכניות והתיק שמורים ומחכים לך.\nחוזרים בכמה קליקים:\n{{plans_url}}\nמשהו היה חסר לך? השב למייל הזה ותגיד לי." + SIGN },
  { key: "lost_d3", kind: "marketing", wa: "dp3_lost_d3", subject: "כל מה שבנית שמור", email: "{{first_name}}, ניר כאן.\nכל מה שבנית אצלי שמור. העסק שלך לא מחכה, והייעוץ שלך לא צריך לחכות.\nחוזרים מאותה נקודה, בכמה קליקים:\n{{plans_url}}" + SIGN },
  { key: "lost_d10", kind: "marketing", wa: null, subject: "אסטרטגיה מנצחת טקטיקה", email: "{{first_name}}, ניר כאן.\nרוב בעלי העסקים מחפשים את הטקטיקה הבאה: עוד קמפיין, עוד כלי, עוד הנחה. העסקים שגדלים באמת מתחילים מהשאלה האסטרטגית: איפה הכסף בורח, ומה הדבר האחד שאם תשנה אותו, כל השאר יזוז.\nהשבוע, תכתוב במשפט אחד מה הדבר הזה אצלך. זה כבר חצי מהדרך.\nרוצה לעבוד על זה איתי, עם המספרים שלך? חוזרים כאן:\n{{plans_url}}" + SIGN },
  { key: "lost_d30", kind: "marketing", wa: "dp3_lost_d30", subject: "", email: null },
  { key: "lost_d60", kind: "marketing", wa: null, subject: "הדלת פתוחה", email: "{{first_name}}, ניר כאן. זו ההודעה האחרונה שלי בנושא.\nהייעוץ ממשיך לגדול, כל חודש נכנסים כלים ותכנים חדשים, וכל מה שבנית אצלי עדיין שמור.\nכשתרצה לחזור, הכל ממשיך מאותה נקודה:\n{{plans_url}}" + SIGN },
];

export const stage2 = (key: string) => STAGES2.find((s) => s.key === key) ?? null;

const D = 86400_000;
export type Person2 = {
  createdAt: number;
  accessUntil: number | null;
  paid: boolean;
  questions: number;
  hasFinancials: boolean;
  hasXray: boolean;
  leadStatus: string | null; // onboarding lead status
  meetingAt: number | null;
  /** the person picked a time for the 15-minute call (WhatsApp button or the home card) */
  callPicked?: boolean;
};

/**
 * The trial / lost day stage due now (the latest one wins, earlier ones are skipped; each is sent once).
 * Marketing day messages are skipped while a meeting is scheduled (the rep is on it). 24h goes to people who have
 * not picked a call time yet, 72h to people who have not had the call yet. A paid member leaves this journey.
 */
export function dueDayStage(p: Person2, sent: Set<string>, now = Date.now()): string | null {
  if (p.paid) return null;
  if (p.leadStatus === "not_relevant") return null;
  const age = (now - p.createdAt) / D;
  const until = p.accessUntil ?? p.createdAt + 30 * D;
  const meetingPending = p.leadStatus === "scheduled" && (p.meetingAt ?? 0) > now - 3600_000;
  const noMeetingYet = !p.leadStatus || ["new", "no_answer", "callback"].includes(p.leadStatus);
  const cands: string[] = [];
  if (now < until) {
    const left = (until - now) / D;
    if (left <= 1.2) cands.push("d29");
    else if (age >= 27) cands.push("d27_faq");
    else if (age >= 25) cands.push("d25");
    else if (age >= 21) cands.push("d21");
    else if (age >= 14) cands.push("d14");
    else if (age >= 10) { if (!p.hasFinancials) cands.push("d10_vault"); }
    else if (age >= 7) cands.push(p.questions > 0 ? "d7_active" : "d7_quiet");
    else if (age >= 3) {
      if (noMeetingYet && age < 4) cands.push("h72");
      if (!p.hasXray) cands.push("d3_xray");
    } else if (age >= 1) {
      // "pick a time for your call": only to people who have not picked one and were not reached yet
      if (noMeetingYet && !p.callPicked && age < 2) cands.push("h24");
      if (p.questions === 0) cands.push("d1");
    }
  } else {
    const since = (now - until) / D;
    if (since >= 60) cands.push("lost_d60");
    else if (since >= 30) cands.push("lost_d30");
    else if (since >= 10) cands.push("lost_d10");
    else if (since >= 3) cands.push("lost_d3");
    else cands.push("d30");
  }
  for (const k of cands) {
    if (sent.has(`dp2:${k}`)) continue;
    const s = stage2(k)!;
    // while a meeting is on the calendar, only service messages (d29) go out
    if (meetingPending && s.kind === "marketing") continue;
    return k;
  }
  return null;
}

/** Israel clock helpers: quiet hours 21:00–08:30, Shabbat Fri 14:00 – Sat 20:00. */
export function ilParts(t = Date.now()) {
  const f = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(t));
  const g = (k: string) => f.find((p) => p.type === k)?.value ?? "";
  const h = Number(g("hour")) % 24;
  return { day: g("weekday"), min: h * 60 + Number(g("minute")) };
}
export function isShabbat(t = Date.now()) {
  const { day, min } = ilParts(t);
  return (day === "Fri" && min >= 14 * 60) || (day === "Sat" && min < 20 * 60);
}
export function isQuiet(t = Date.now()) {
  const { min } = ilParts(t);
  return min >= 21 * 60 || min < 8 * 60 + 30;
}
/** The next moment a customer message may go out (10-minute steps, good enough for the tick). */
export function nextSendable(t = Date.now()) {
  let x = t;
  for (let i = 0; i < 24 * 6 * 3 && (isShabbat(x) || isQuiet(x)); i++) x += 10 * 60_000;
  return x;
}

export function render2(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

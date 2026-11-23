/**
 * Journey v2 (DP2, 23.11.2026): value-first messages, self-checkout first and a rep as the second option,
 * no webinar. Spec: the "פלואו אוטומציות · Duvdevani Platform" doc.
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

const SIGN = "\n\nצוות Duvdevani Platform";

export const STAGES2: Stage2[] = [
  // Track 1 · from signup to the onboarding meeting
  { key: "welcome", kind: "service", wa: "dp2_welcome", subject: "ברוך הבא לפלטפורמה של ניר דובדבני", email: "{{first_name}}, ברוך הבא לפלטפורמה של ניר דובדבני.\nב-30 הימים הקרובים יש לך גישה מלאה לכל הכלים: הבוט שמכיר את השיטה של ניר, הרנטגן העסקי והתיק העסקי.\nכדי שתתחיל נכון, שמרנו לך גם פגישת הטמעה אישית, בלי עלות. נציג מהצוות ייצור איתך קשר תוך 24 שעות לתיאום.\nרוצה להתחיל כבר עכשיו? כתוב לבוט במשפט אחד מה הכי מעסיק אותך בעסק, ותקבל צעד ראשון:\n{{app_url}}" + SIGN },
  { key: "no_answer", kind: "service", wa: "dp2_no_answer", subject: "", email: null },
  { key: "h24", kind: "service", wa: "dp2_24h", subject: "", email: null },
  { key: "h72", kind: "marketing", wa: "dp2_72h_nir", subject: "למה בניתי את פגישת ההטמעה", email: "{{first_name}}, ניר כאן.\nרציתי להסביר למה בניתי את פגישת ההטמעה. 22 שנה אני רואה שבעלי עסקים לא נתקעים מחוסר ידע, אלא מחוסר בהירות: לא ברור מה הצעד הבא ואיפה הכסף בורח.\nבפגישה הצוות שלי עושה איתך שלושה דברים: מאתר את צוואר הבקבוק המרכזי בעסק, מכניס את המספרים שלך למערכת, ובונה איתך תכנית ל-30 הימים הקרובים.\nרוצה? השב למייל הזה ונתאם מועד שנוח לך.\n\nניר" },
  { key: "meeting_set", kind: "service", wa: "dp2_meeting_set", subject: "הפגישה נקבעה: {{meeting_when}}", email: "{{first_name}}, הפגישה נקבעה.\nפגישת הטמעה והדרכה: {{meeting_when}}, עם {{rep_name}}.\nכדי להפיק ממנה את המקסימום, כדאי להגיע עם: מחזור חודשי משוער, האתגר הכי גדול שלך עכשיו, וחצי שעה שקטה." + SIGN },
  { key: "reminder", kind: "service", wa: "dp2_reminder", subject: "", email: null },
  { key: "no_show", kind: "service", wa: "dp2_no_show", subject: "", email: null },
  { key: "after_meeting", kind: "marketing", wa: "dp2_after_meeting", subject: "תודה על הפגישה. הנה הצעד הבא", email: "{{first_name}}, תודה על הפגישה.\nהסיכום והתכנית שבנית עם {{rep_name}} שמורים בתיק העסקי שלך:\n{{app_url}}/vault\nהצעד הראשון לשבוע הקרוב: {{next_step}}\nואם כבר עכשיו ברור לך שאתה רוצה להמשיך אחרי הניסיון, אפשר לבחור מסלול כאן:\n{{plans_url}}" + SIGN },
  // Track 2 · the 30-day trial
  { key: "d1", kind: "marketing", wa: "dp2_d1", subject: "", email: null },
  { key: "d3_xray", kind: "marketing", wa: "dp2_d3_xray", subject: "12 השאלות שניר שואל כשהוא נכנס לעסק", email: "{{first_name}}, יש בפלטפורמה כלי שנקרא \"רנטגן עסקי\".\nאלה 12 השאלות שניר שואל כשהוא נכנס לעסק חדש. 3 דקות של מענה, ואתה מקבל תמונה ברורה של החוזקות שלך ושל הנקודה שהכי שווה לטפל בה ראשונה:\n{{app_url}}/xray" + SIGN },
  { key: "d7_active", kind: "marketing", wa: "dp2_d7_active", subject: "", email: null },
  { key: "d7_quiet", kind: "marketing", wa: "dp2_d7_quiet", subject: "", email: null },
  { key: "d10_vault", kind: "marketing", wa: "dp2_d10_vault", subject: "תשובות על המספרים שלך, לא תשובות כלליות", email: "{{first_name}}, ככל שהבוט מכיר את העסק שלך טוב יותר, התשובות שלו מדויקות יותר.\nבתיק העסקי מכניסים כמה נתונים בסיסיים (מחזור, הוצאות, לקוחות), וזה לוקח בערך 2 דקות. מאותו רגע כל תשובה מותאמת למספרים שלך:\n{{app_url}}/vault" + SIGN },
  { key: "d14", kind: "marketing", wa: "dp2_d14", subject: "שבועיים בפלטפורמה: מה בנית ועל מה להתמקד", email: "{{first_name}}, עברו שבועיים. עד עכשיו בנית: {{built_summary}}.\nבשבועיים הבאים כדאי לבחור דבר אחד מתוך התכנית ולהביא אותו לביצוע. זה מה שמייצר את התוצאה הראשונה.\nאם תרצה ליווי בזה, פגישת ההטמעה עדיין שמורה לך. השב למייל הזה ונתאם." + SIGN },
  // Track 3 · the decision: self-checkout first, a rep for whoever prefers to talk
  { key: "d21", kind: "marketing", wa: "dp2_d21", subject: "מה כבר בנית, ומה ממשיך בחברות", email: "{{first_name}}, עברו שלושה שבועות מאז שהצטרפת. רצינו לעצור רגע ולהראות מה כבר בנית: {{built_summary}}.\nהחברות בפלטפורמה ממשיכה בדיוק מאותה נקודה: הבוט זוכר את העסק שלך, התכניות נשמרות, ומדי חודש נוספים כלים ותכנים חדשים של ניר.\nכאן אפשר לראות את המסלולים ולהצטרף בכמה קליקים:\n{{plans_url}}\nיש שאלה לפני? השב למייל הזה ונחזור אליך." + SIGN },
  { key: "d25", kind: "marketing", wa: "dp2_d25", subject: "", email: null },
  { key: "d27_faq", kind: "marketing", wa: null, subject: "שאלות נפוצות לפני שמחליטים", email: "{{first_name}}, ריכזנו את השאלות שהכי שואלים אותנו לקראת סוף הניסיון.\nכמה זה עולה? כל המסלולים והמחירים מופיעים בעמוד המסלולים, עם מה שכלול בכל אחד.\nמה ההבדל בין המסלולים? כולם כוללים את הבוט, התיק העסקי והתכנים. המסלולים הגבוהים מוסיפים ליווי אישי של יועץ מהצוות או של ניר.\nמה קורה לנתונים בסוף הניסיון? הכל נשמר: השיחות, התכניות והתיק. כשמצטרפים, ממשיכים מאותה נקודה.\nאיך מבטלים? בלחיצה, מעמוד המסלולים.\nלכל המסלולים:\n{{plans_url}}\nרוצה לדבר עם נציג? השב למייל הזה." + SIGN },
  { key: "d29", kind: "service", wa: "dp2_d29", subject: "", email: null },
  { key: "d30", kind: "marketing", wa: "dp2_d30", subject: "תקופת הניסיון הסתיימה. הכל שמור", email: "{{first_name}}, תקופת הניסיון הסתיימה.\nהשיחות, התכניות והתיק העסקי שמורים אצלנו, ואפשר לחזור אליהם בכל רגע דרך הצטרפות:\n{{plans_url}}\nאם משהו לא היה ברור או חסר לך, נשמח לשמוע. השב למייל הזה." + SIGN },
  // Track 4 · the trial ended without joining
  { key: "lost_d3", kind: "marketing", wa: "dp2_lost_d3", subject: "כל מה שבנית שמור", email: "{{first_name}}, רק רצינו שתדע: כל מה שבנית בפלטפורמה שמור, התכניות, השיחות והתיק העסקי.\nאם תרצה לחזור, הכל ממשיך מאותה נקודה:\n{{plans_url}}\nואם יש משהו שחסר לך, השב למייל הזה ונשמח לשמוע." + SIGN },
  { key: "lost_d10", kind: "marketing", wa: null, subject: "תובנה אחת מניר: אסטרטגיה מנצחת טקטיקה", email: "{{first_name}}, תובנה אחת מ-22 שנה של ליווי עסקים.\nרוב בעלי העסקים מחפשים את הטקטיקה הבאה: עוד קמפיין, עוד כלי, עוד הנחה. אבל העסקים שגדלים באמת מתחילים מהשאלה האסטרטגית: איפה הכסף בורח, ומה הדבר האחד שאם נשנה אותו, כל השאר יזוז.\nהשבוע, נסה לכתוב במשפט אחד מה הדבר הזה אצלך. זה כבר חצי מהדרך.\nואם תרצה שהבוט יעזור לך לחשוב על זה עם המספרים שלך, הכל מחכה לך כאן:\n{{plans_url}}" + SIGN },
  { key: "lost_d30", kind: "marketing", wa: "dp2_lost_d30", subject: "", email: null },
  { key: "lost_d60", kind: "marketing", wa: null, subject: "הדלת פתוחה", email: "{{first_name}}, זו ההודעה האחרונה שלנו בנושא.\nהפלטפורמה ממשיכה לגדול: כלים חדשים ותכנים חדשים של ניר נוספים כל חודש, וכל מה שבנית אצלנו עדיין שמור.\nאם תרצה לחזור בעתיד, הכל ממשיך מאותה נקודה:\n{{plans_url}}\nמכאן תמשיך לקבל רק את הדיוור הכללי, אם אישרת אותו." + SIGN },
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
};

/**
 * The trial / lost day stage due now (the latest one wins, earlier ones are skipped; each is sent once).
 * Marketing day messages are skipped while a meeting is scheduled (the rep is on it). 24h / 72h only go to
 * people with no meeting yet. A paid member leaves this journey.
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
      if (noMeetingYet && age < 2) cands.push("h24");
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

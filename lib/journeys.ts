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
  text: string; // message body ({{first_name}}, {{plans_url}}, {{app_url}}, {{days_left}}, {{trial_end}}, {{offer_end}}, {{plan_name}}, {{year_end}})
  transactional?: boolean; // sent even to people who opted out of marketing
};

export const STAGES: Stage[] = [
  { key: "t_d1_noq", track: "trial", wa: "dp_t_d1_noq", subject: "עוד לא שאלת אותי כלום. בוא נתקן את זה 🙂", text: "{{first_name}}, בוקר טוב.\nנרשמת ועוד לא שאלת אותי כלום. אני מכיר את זה: רוב בעלי העסקים מחכים לשאלה ה\"נכונה\". אין דבר כזה.\n\nתכתוב לי עכשיו את הדבר שהכי מציק לך בעסק. \"אין לי מספיק לקוחות\". \"אני עובד 14 שעות ולא נשאר כסף\". \"לא יודע כמה לגבות\". משפט אחד מספיק.\n\nתוך 30 שניות תקבל ממני תשובה עם צעד ראשון שאפשר לעשות כבר היום.\n\nנשארו לך {{days_left}} ימים איתי בכיס. כל יום בלי שאלה הוא יום שהולך לפח 👇\n{{app_url}}" },
  { key: "t_d3_xray", track: "trial", wa: "dp_t_d3_xray", subject: "איפה הכסף שלך הולך לאיבוד?", text: "{{first_name}}, שאלה: אם הייתי נכנס לעסק שלך מחר בבוקר, איפה הייתי מוצא את הכסף שהולך לאיבוד?\n\nאחרי 22 שנה אני יודע לשאול 12 שאלות ולדעת. שמתי אותן ב\"רנטגן עסקי\": 3 דקות, ציון על 6 צירים, והמקום הכי חלש בעסק שלך, שחור על גבי לבן.\n\nבפגישה אצלי זה החלק הראשון שעושים. פה זה כלול בחודש המתנה שלך, שנגמר בעוד {{days_left}} ימים.\n\nתעשה את זה עכשיו, לפני הקפה 🔥\n👇 {{app_url}}/xray" },
  { key: "t_d7_week", track: "trial", wa: "dp_t_d7_week", subject: "שבוע ראשון מאחוריך 🔥", text: "{{first_name}}, שבוע ראשון מאחוריך 🔥\n\nאני רוצה לשאול אותך משהו, ואני באמת קורא את התשובות: מה הדבר האחד הכי שימושי שקיבלת עד עכשיו?\n\nואם עוד לא קיבלת משהו שהזיז לך, תגיד לי גם את זה. זה אומר שעוד לא שאלת את השאלה הנכונה, ואני רוצה לעזור לך למצוא אותה.\n\nטיפ לשבוע השני: תבקש ממני \"תוכנית עבודה ל-90 יום\". זה מה שלקוחות משלמים לי עליו אלפי שקלים, ואצלך זה כלול.\n\nנשארו לך {{days_left}} ימים. תנצל אותם עד הסוף." },
  { key: "t_d10_numbers", track: "trial", wa: "dp_t_d10_numbers", subject: "תשובה כללית או תשובה עם המספרים שלך?", text: "{{first_name}}, רוב האנשים שואלים אותי שאלות כלליות ומקבלים תשובות כלליות.\n\nמי שמכניס את המספרים שלו מקבל משהו אחר לגמרי: תשובה שמבוססת על ההכנסות, ההוצאות והרווח האמיתי של העסק. לא \"כדאי לשפר את השיווק\", אלא \"פה בדיוק אתה מפסיד כסף כל חודש, וזה מה שעושים\".\n\n2 דקות בתיק העסקי, ומשם כל תשובה שלי מגיעה עם המספרים שלך.\n👇 {{app_url}}/vault\n\nנשארו לך {{days_left}} ימים במתנה." },
  { key: "t_d14_half", track: "trial", wa: "dp_t_d14_half", subject: "חצי חודש עבר. ובונוס שלא יחזור", text: "{{first_name}}, חצי מהחודש עבר.\n\nבוא נעשה חשבון פשוט: פגישה אישית אחת איתי עולה ₪2,500 + מע״מ. ב-Alpha Basic אתה מקבל אותי בכיס 24/6 לשנה שלמה, 9 קורסים, כל הספרים, זום איתי פעם בשבועיים ו-4 כנסים בשנה. מ-₪229 לחודש + מע״מ.\n\nולמי שמצטרף לפני שחודש המתנה נגמר יש בונוס שלא יחזור:\n🎁 שדרוג ל-Alpha Private בחצי מחיר: ₪295 במקום ₪590. זה 4 שעות 1:1 עם יועץ בכיר שמטמיע הכל על העסק שלך.\n\nוהימים שנשארו לך מתווספים לשנה, אז לא מפסידים אף יום.\n\nהבונוס נגמר ב-{{trial_end}} 👇 {{plans_url}}" },
  { key: "t_d21_plans", track: "trial", wa: "dp_t_d21_plans", subject: "מה מחכה לך אחרי ה-30 יום", text: "{{first_name}}, עוד {{days_left}} ימים חודש המתנה נגמר. הנה בדיוק מה מחכה לך אם תמשיך:\n\n✅ ניר בכיס 24/6, עם הזיכרון של כל מה שבנינו עד עכשיו\n✅ 9 קורסים: נדל״ן, כספים, AI, אסטרטגיית הון, מכירות ועוד\n✅ כל הספרים שלי\n✅ זום איתי פעם בשבועיים\n✅ 4 כנסי מינגלינג בשנה עם בעלי עסקים\n\nמ-₪229 לחודש + מע״מ.\n\nומי שמצטרף עד {{trial_end}} מקבל שדרוג ל-Private בחצי מחיר: יועץ בכיר שיושב איתך 4 שעות ומטמיע הכל על העסק שלך.\n👇 {{plans_url}}" },
  { key: "t_d25_offer", track: "trial", wa: "dp_t_d25_offer", subject: "5 ימים", text: "{{first_name}}, 5 ימים.\n\nבעוד 5 ימים הגישה שלך נסגרת. השיחות שלנו, התוכניות והתיק העסקי נשמרים, אבל ננעלים.\n\nיש שני סוגים של בעלי עסקים: אלה שאומרים \"אחשוב על זה\", ואלה שמחליטים. 22 שנה אני רואה מי מהם עושה כסף.\n\nמה מקבלים אם מחליטים היום:\n🔥 שנה מלאה של Alpha, ועוד הימים שנשארו לך\n🔥 שדרוג ל-Private בחצי מחיר (₪295 במקום ₪590), רק עד {{trial_end}}\n\nלבד בשתי דקות, או שנציג שלי חוזר אליך ומסדר הכל בטלפון:\n👇 {{plans_url}}" },
  { key: "t_d28_last", track: "trial", wa: "dp_t_d28_last", subject: "יומיים. ואז זה נסגר", text: "{{first_name}}, יומיים.\n\nב-{{trial_end}} נגמרים שני דברים:\n1️⃣ הגישה שלך לפלטפורמה\n2️⃣ הבונוס של Private בחצי מחיר. הוא לא חוזר.\n\nזו התזכורת האחרונה לפני שזה נסגר.\n\nאם הפלטפורמה נתנה לך משהו החודש, אפילו תשובה אחת שהזיזה לך, תחשוב מה שנה שלמה כזאת תעשה לעסק.\n👇 {{plans_url}}" },
  { key: "t_d30_closed", track: "trial", wa: "dp_t_d30_closed", subject: "חודש המתנה הסתיים. הכל שמור", text: "{{first_name}}, חודש המתנה שלך הסתיים היום.\n\nכל מה שבנינו שמור: השיחות, התוכניות והתיק העסקי. שום דבר לא נמחק.\n\nברגע שתבחר מסלול, הכל נפתח מחדש בדיוק מאיפה שעצרת:\n👇 {{plans_url}}", transactional: true },
  { key: "l_d33_rep", track: "lost", wa: "dp_l_d33_rep", subject: "הצעה ל-72 שעות בלבד", text: "{{first_name}}, ניר כאן.\n\n3 ימים בלי הפלטפורמה. השאלות שלך שמורות, התוכנית שלך שמורה, ואני מחכה.\n\nאני רוצה להקל עליך את ההחלטה, אז הנה משהו שאני לא מציע בדרך כלל:\n🔥 12 תשלומים במחיר של תשלום אחד. ₪229 לחודש + מע״מ במקום ₪299. חיסכון של ₪840 בשנה.\n\nההצעה פתוחה 72 שעות בלבד, עד {{offer_end}}.\n\nנציג שלי גם ינסה לתפוס אותך בטלפון. אם נוח לך יותר, תסגור לבד:\n👇 {{plans_url}}" },
  { key: "l_d45", track: "lost", wa: "dp_l_d45", subject: "שאלה כנה: מה עצר אותך?", text: "{{first_name}}, שאלה כנה, ואני באמת רוצה תשובה: מה עצר אותך?\n\n1️⃣ המחיר\n2️⃣ אין לי זמן עכשיו\n3️⃣ לא קיבלתי מה שחיפשתי\n4️⃣ משהו אחר\n\nתענה לי רק במספר. אני קורא כל תשובה, וכל אחת משנה את מה שאני בונה.\n\nואם זה המחיר, תענה 1 ונראה מה אפשר לעשות." },
  { key: "l_d60", track: "lost", wa: "dp_l_d60", subject: "הכנס הבא בדרך. אתה בפנים?", text: "{{first_name}}, הכנס הרבעוני הבא של בעלי העסקים מתקרב.\n\nחדר מלא בבעלי עסקים שעושים ולא רק מדברים. נטוורקינג, עסקאות, ואני על הבמה עם האסטרטגיה לרבעון הבא.\n\nחברי Alpha נכנסים כחלק מהמנוי, יחד עם 9 הקורסים, הספרים והזום הדו-שבועי. מי שמצטרף עכשיו כבר בפנים בכנס הקרוב.\n👇 {{plans_url}}" },
  { key: "l_d90", track: "lost", wa: "dp_l_d90", subject: "3 חודשים. מה זז?", text: "{{first_name}}, עברו 3 חודשים מאז שעבדנו ביחד.\n\nבדיקה של 10 שניות: ההכנסות שלך היום גבוהות יותר משהיו לפני 3 חודשים? אתה עובד פחות שעות?\n\nאם כן, אני באמת שמח בשבילך.\n\nאם לא, זה בדיוק הזמן לחזור. אותו עסק, אותן החלטות, אותן תוצאות. משהו צריך להשתנות, ועדיף עכשיו ולא בעוד 3 חודשים.\n\nהכל שמור לך, ממשיכים מאיפה שעצרת:\n👇 {{plans_url}}" },
  { key: "l_d180", track: "lost", wa: "dp_l_d180", subject: "חצי שנה", text: "{{first_name}}, חצי שנה.\n\nמאז שהיית פה הפלטפורמה גדלה: כלים חדשים, מחשבונים חדשים ותוכן חדש כל שבוע. וכל מה ששאלת עדיין שמור בתיק שלך.\n\nאם חצי השנה האחרונה הייתה של \"עוד לא\", בוא נדאג שחצי השנה הבאה תיראה אחרת.\n👇 {{plans_url}}" },
  { key: "p_d2_courses", track: "member", wa: "dp_p_d2_courses", subject: "ברוך הבא ל-Alpha. הקורסים שלך פתוחים 🔥", text: "{{first_name}}, ברוך הבא ל-Alpha 🔥\n\nכל 9 הקורסים והספרים שלי נפתחו לך במערכת הקורסים, עם המייל שאיתו נרשמת. לא קיבלת את פרטי הכניסה? תבדוק בספאם, או תענה לי פה.\n\nאיפה מתחילים? ב\"(לא) פשוט להיות עסק אלפא\". זה הבסיס לכל השאר.\n\nוטיפ: אחרי כל שיעור תשאל אותי בפלטפורמה \"איך אני מיישם את זה בעסק שלי?\". ככה הופכים קורס לכסף." },
  { key: "p_d7_zoom", track: "member", wa: "dp_p_d7_zoom", subject: "הזום הבא איתי. תבוא עם שאלה", text: "{{first_name}}, פעם בשבועיים אני עולה לזום עם חברי Alpha.\n\nשאלות פתוחות, ניתוח עסקים בלייב ואסטרטגיה למה שקורה עכשיו בשוק.\n\nהטיפ שלי: תבוא עם שאלה אחת על העסק שלך. מי שמגיע עם שאלה יוצא עם תשובה. מי שמגיע רק לשמוע יוצא עם השראה. שתיהן טובות, אבל רק אחת מזיזה כסף.\n\nהמועד והקישור מחכים לך בפלטפורמה 👇\n{{app_url}}" },
  { key: "p_d30_upsell", track: "member", wa: "dp_p_d30_upsell", subject: "ידע זה לא הבעיה. ביצוע כן", text: "{{first_name}}, חודש ראשון ב-Alpha.\n\nעכשיו אתה יודע מה צריך לעשות. השאלה היא אם זה קורה.\n\nמ-22 שנה של ניסיון: רוב בעלי העסקים לא נתקעים על ידע, הם נתקעים על ביצוע. בשביל זה יש Alpha Private: יועץ בכיר מהצוות שלי יושב איתך 4 שעות, אחד על אחד, ומטמיע הכל על העסק שלך. תוכנית, מספרים, מכירות.\n\nמשלמים רק את ההפרש: ₪590 + מע״מ.\n\nהשעות של היועצים מתמלאות לפי סדר ההרשמה 👇 {{plans_url}}" },
  { key: "p_d90_upsell", track: "member", wa: "dp_p_d90_upsell", subject: "יש החלטות שלא מקבלים לבד", text: "{{first_name}}, רבעון ראשון מאחוריך.\n\nיש החלטות שלא מקבלים לבד: התרחבות, גיוס, העלאת מחירים, כניסה לשוק חדש.\n\nב-Alpha Upgrade אנחנו יושבים אחד על אחד, אני ואתה, על העסק שלך.\nב-Alpha Pro מקבלים גם פרק פודקאסט שלם על העסק שלך. חשיפה וסמכות שאי אפשר לקנות במודעה.\n\nיש רק ניר אחד, ומספר הפגישות שאני פותח מוגבל. משלמים רק את ההפרש:\n👇 {{plans_url}}" },
  { key: "p_d180_check", track: "member", wa: "dp_p_d180_check", subject: "חצי שנה ביחד 🔥", text: "{{first_name}}, חצי שנה ביחד 🔥\n\nאני רוצה לשמוע ממך: מה המספר האחד שזז הכי הרבה בעסק מאז שהצטרפת? הכנסות, לקוחות, שעות עבודה, רווח.\n\nתענה לי פה במשפט. הסיפורים שלכם הם הדבר שהכי מניע אותי.\n\nואם משהו עדיין תקוע, תכתוב לי גם את זה. זה בדיוק מה שנעשה בחצי השנה הבאה." },
  { key: "p_d335_notice", track: "renewal", wa: "dp_p_d335_notice", subject: "עדכון חשוב לגבי המנוי שלך", text: "{{first_name}}, עדכון חשוב לגבי המנוי שלך.\n\nהשנה הראשונה שלך ב-Alpha מסתיימת ב-{{year_end}}.\n\nמהיום שאחריו המנוי ממשיך אוטומטית ב-₪69 + מע״מ לחודש (₪81.42), עם כל מה שיש לך היום: הפלטפורמה, הקורסים, הזום והקהילה. החיוב יתבצע בכרטיס ששמור במערכת.\n\nלא צריך לעשות כלום כדי להמשיך. אם אתה לא רוצה להמשיך, אפשר לבטל בלחיצה בעמוד המסלולים:\n{{plans_url}}", transactional: true },
  { key: "p_d365_renewed", track: "renewal", wa: "dp_p_d365_renewed", subject: "ממשיכים ביחד: ₪69 לחודש", text: "{{first_name}}, השנה הראשונה שלך ב-Alpha הסתיימה, והמנוי ממשיך ב-₪69 + מע״מ לחודש.\n\nהכל נשאר פתוח: הפלטפורמה, הקורסים, הזום והקהילה.\n\nתודה שאתה איתי 🍒 השנה השנייה היא השנה שבה רואים את התוצאות הגדולות.", transactional: true },
  { key: "c_abandon", track: "checkout", wa: "dp_c_abandon", subject: "עצרת באמצע. שמרתי לך את ההזמנה", text: "{{first_name}}, ראיתי שהתחלת להצטרף ל-{{plan_name}} ועצרת באמצע.\n\nקורה. לפעמים זה טלפון שצלצל, לפעמים זו שאלה שלא קיבלה תשובה.\n\nשמרתי לך את ההזמנה בדיוק כמו שהשארת אותה. שתי אפשרויות:\n👉 להמשיך מאיפה שעצרת: {{plans_url}}\n👉 לענות \"נציג\", ונציג שלי יחזור אליך ויסגור הכל בטלפון\n\nוהבונוסים שהיו פתוחים לך כשהתחלת עדיין בתוקף, אבל לא לעוד הרבה זמן." },
  { key: "x_d7", track: "cancelled", wa: "dp_x_d7", subject: "חבל שהלכת. הדלת פתוחה 30 יום", text: "{{first_name}}, ראיתי שביטלת את המנוי.\n\nבלי לחץ, באמת. אבל אני רוצה לדעת: מה לא עבד? תענה לי במשפט, זה עוזר לי לבנות את זה טוב יותר.\n\nודבר אחד שחשוב שתדע: כל מה שבנית שמור. ואם תחזור עד {{return_end}}, אתה ממשיך ב-₪69 לחודש בלי לשלם על שנה מחדש.\n👇 {{plans_url}}" },
  { key: "x_d30", track: "cancelled", wa: "dp_x_d30", subject: "היום נסגר החלון", text: "{{first_name}}, היום נסגר החלון.\n\nעד היום אפשר לחזור ל-Alpha ב-₪69 לחודש, בלי לשלם על שנה. מחר זו כבר הצטרפות מלאה מחדש.\n\nהכנס הרבעוני הבא מתקרב, והזום הבא בעוד כמה ימים. אם אתה רוצה להיות שם:\n👇 {{plans_url}}" },
  { key: "x_d90", track: "cancelled", wa: "dp_x_d90", subject: "3 חודשים בלי הפלטפורמה", text: "{{first_name}}, 3 חודשים בלי הפלטפורמה.\n\nמה השתנה בעסק? אם התשובה היא \"לא הרבה\", אתה יודע מה לעשות.\n\nהקורסים, הכלים והתיק העסקי שלך מחכים. חוזרים ל-Alpha וממשיכים מאיפה שעצרת:\n👇 {{plans_url}}" },
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

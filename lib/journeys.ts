/**
 * Lead & member journeys. A daily cron (app/api/cron/journeys) computes which stage each person is due for,
 * records it in journey_sends (each stage is sent once per person) and pushes it to Make, which sends the
 * WhatsApp template (ManyChat) and the email. `wa` is the WhatsApp template name to approve at Meta.
 */
export type Stage = {
  key: string;
  track: "trial" | "lost" | "member" | "renewal" | "cancelled" | "checkout" | "webinar";
  wa: string; // WhatsApp template name (ManyChat / Meta)
  subject: string; // email subject
  text: string; // message body ({{first_name}}, {{plans_url}}, {{app_url}}, {{days_left}}, {{trial_end}}, {{offer_end}}, {{plan_name}}, {{year_end}}, {{ref_link}}, {{webinar}}, {{webinar_time}}, {{webinar_url}}, {{webinar_next}}, {{top_tool}})
  transactional?: boolean; // sent even to people who opted out of marketing
};

export const STAGES: Stage[] = [
  { key: "t_d1_noq", track: "trial", wa: "dp_t_d1_noq", subject: "מתנה ראשונה ממני, ושאלה אחת", text: "{{first_name}}, בוקר טוב.\nנרשמת ועוד לא שאלת אותי כלום. אין דבר כזה \"שאלה נכונה\".\n\nתכתוב לי משפט אחד: הדבר שהכי מציק לך בעסק. תוך 30 שניות תקבל צעד ראשון שאפשר לעשות היום 👇\n{{app_url}}\n\n🎁 מתנה ראשונה: ב-{{webinar}} אני עולה לוובינר חי לבעלי עסקים, ואתה מוזמן. שמור מקום 👇\n{{webinar_url}}" },
  { key: "t_d1_active", track: "trial", wa: "dp_t_d1_active", subject: "אני רואה שאתה אקטיבי. יש לי מתנה בשבילך", text: "{{first_name}}, אני רואה שכבר התחלת לעבוד איתי 🔥\n\nאנשים כמוך אני אוהב: לא מחכים, עושים.\n\nאז יש לי מתנה בשבילך: ב-{{webinar}} אני עולה לוובינר חי לבעלי עסקים. אני אראה שם על מקרים אמיתיים איך בונים אסטרטגיה, ואענה על שאלות בלייב.\n\nשמור לעצמך מקום 👇\n{{webinar_url}}" },
  { key: "t_d3_xray", track: "trial", wa: "dp_t_d3_xray", subject: "3 דקות. ואני יודע על מה לעבוד", text: "{{first_name}}, אם הייתי נכנס לעסק שלך מחר בבוקר, הייתי שואל 12 שאלות. שמתי אותן ב\"רנטגן עסקי\": 3 דקות, ציון על 6 צירים, והמקום הכי חלש בעסק שלך, שחור על גבי לבן.\n\nבפגישה אצלי זה החלק הראשון. פה זה במתנה 👇\n{{app_url}}/xray\n\n🎥 ומתנה: ב-{{webinar}} אני עולה לוובינר פתוח לבעלי עסקים. שמור לעצמך מקום 👇\n{{webinar_url}}" },
  { key: "t_d7_week", track: "trial", wa: "dp_t_d7_week", subject: "רוצה שאעשה את זה עליך בלייב?", text: "{{first_name}}, שבוע ראשון מאחוריך 🔥\n\nראיתי שהכי השתמשת ב{{top_tool}}. מעולה, זה בדיוק המקום שבו עסקים זזים.\n\nרוצה שאעשה את זה עליך בלייב? ב-{{webinar}} אני בוובינר חי, ואני בוחר כמה משתתפים ובונה איתם את זה מול כולם.\n\nשמור מקום 👇\n{{webinar_url}}" },
  { key: "t_d7_quiet", track: "trial", wa: "dp_t_d7_quiet", subject: "שבוע עבר. בוא נעשה את זה ביחד", text: "{{first_name}}, עבר שבוע ועוד לא באמת התחלנו.\n\nזה בסדר, ככה זה אצל רוב בעלי העסקים: הראש בשוטף. אז בוא נעשה את זה ביחד, בלייב.\n\nב-{{webinar}} אני עולה לוובינר חי. בלי תיאוריה: איך בונים אסטרטגיה שמזיזה את המספרים.\n\nשמור מקום 👇\n{{webinar_url}}" },
  { key: "t_d10_numbers", track: "trial", wa: "dp_t_d10_numbers", subject: "תשובה כללית או תשובה עם המספרים שלך?", text: "{{first_name}}, מי ששואל שאלה כללית מקבל תשובה כללית.\n\nמי שמכניס את המספרים שלו מקבל משהו אחר לגמרי: \"פה בדיוק אתה מפסיד כסף כל חודש, וזה מה שעושים\".\n\n2 דקות בתיק העסקי 👇\n{{app_url}}/vault\n\n🎥 ומתנה: ב-{{webinar}} אני עולה לוובינר פתוח לבעלי עסקים. שמור לעצמך מקום 👇\n{{webinar_url}}" },
  { key: "t_d14_half", track: "trial", wa: "dp_t_d14_half", subject: "חצי חודש עבר. ובונוס שלא יחזור", text: "{{first_name}}, חצי מהחודש עבר.\n\nבוובינר ב-{{webinar}} אני מציג את הפלטפורמה המלאה: הקורסים, 4 הסדנאות הפיזיות והזום החודשי איתי. מחיר רגיל ₪450 לחודש, ובהשקה מ-₪229 + מע״מ.\n\n🎁 ולמי שמצטרף לפני שחודש המתנה נגמר: Platform Private בחצי מחיר, ₪295 במקום ₪590. עד {{trial_end}}.\n\nשמור מקום בוובינר 👇\n{{webinar_url}}" },
  { key: "t_d21_plans", track: "trial", wa: "dp_t_d21_plans", subject: "מה מחכה לך אחרי ה-30 יום", text: "{{first_name}}, עוד {{days_left}} ימים חודש המתנה נגמר. מה מקבלים בפלטפורמה:\n\n✅ ניר הדיגיטלי: אני זמין לך 24/6\n✅ 8 קורסים דיגיטליים + בונוס\n✅ 4 רבי המכר שלי\n✅ 4 סדנאות פיזיות בשנה\n✅ פגישה אסטרטגית חודשית איתי בזום\n\nמחיר רגיל ₪450 לחודש. בהשקה מ-₪229 + מע״מ 👇\n{{plans_url}}\n\n🎥 ומתנה: ב-{{webinar}} אני עולה לוובינר פתוח לבעלי עסקים. שמור לעצמך מקום 👇\n{{webinar_url}}" },
  { key: "t_d25_offer", track: "trial", wa: "dp_t_d25_offer", subject: "5 ימים", text: "{{first_name}}, 5 ימים.\n\nבעוד 5 ימים הגישה נסגרת. השיחות, התוכניות והתיק נשמרים, אבל ננעלים.\n\nיש בעלי עסקים שאומרים \"אחשוב על זה\", ויש כאלה שמחליטים. 22 שנה אני רואה מי מהם עושה כסף.\n\n🔥 מי שמחליט עד {{trial_end}}: שנה מלאה בפלטפורמה + Private בחצי מחיר 👇\n{{plans_url}}\n\nאו שנציג שלי יחזור אליך ויסדר הכל בטלפון.\n\n🎥 ומתנה: ב-{{webinar}} אני עולה לוובינר פתוח לבעלי עסקים. שמור לעצמך מקום 👇\n{{webinar_url}}" },
  { key: "t_d28_last", track: "trial", wa: "dp_t_d28_last", subject: "יומיים. ואז זה נסגר", text: "{{first_name}}, יומיים.\n\nב-{{trial_end}} נגמרים הגישה שלך והבונוס של Private בחצי מחיר. הוא לא חוזר.\n\nאם קיבלת החודש אפילו תשובה אחת שהזיזה לך, תחשוב מה שנה שלמה תעשה לעסק 👇\n{{plans_url}}\n\nעוד מתלבט? ב-{{webinar}} אני מסביר הכל בלייב 👇\n{{webinar_url}}" },
  { key: "t_d30_closed", track: "trial", wa: "dp_t_d30_closed", subject: "חודש המתנה הסתיים. הכל שמור", text: "{{first_name}}, חודש המתנה שלך הסתיים היום.\n\nכל מה שבנינו שמור: השיחות, התוכניות והתיק העסקי.\n\nבוובינר ב-{{webinar}} אני מציג את הפלטפורמה המלאה ואת מחיר ההשקה. תבוא, תשאל, ותחליט 👇\n{{webinar_url}}" },
  { key: "l_d33_rep", track: "lost", wa: "dp_l_d33_rep", subject: "הצעה ל-72 שעות בלבד", text: "{{first_name}}, ניר כאן.\n\n3 ימים בלי הפלטפורמה. הכל שמור, ואני מחכה.\n\n🔥 עד {{offer_end}}: 12 תשלומים במחיר של תשלום אחד. ₪229 לחודש + מע״מ במקום ₪299.\n\nלבד בשתי דקות, או שנציג שלי יחזור אליך 👇\n{{plans_url}}" },
  { key: "l_d45", track: "lost", wa: "dp_l_d45", subject: "שאלה כנה: מה עצר אותך?", text: "{{first_name}}, שאלה כנה: מה עצר אותך?\n\n1️⃣ המחיר\n2️⃣ אין לי זמן עכשיו\n3️⃣ לא קיבלתי מה שחיפשתי\n4️⃣ משהו אחר\n\nתענה רק במספר. אני קורא כל תשובה.\n\n🎥 ומתנה: ב-{{webinar}} אני עולה לוובינר פתוח לבעלי עסקים. שמור לעצמך מקום 👇\n{{webinar_url}}" },
  { key: "l_d60", track: "lost", wa: "dp_l_d60", subject: "הסדנה הפיזית הבאה בדרך. אתה בפנים?", text: "{{first_name}}, הסדנה הפיזית הבאה שלי מתקרבת.\n\nחדר מלא בבעלי עסקים שעושים ולא רק מדברים, ואני על הבמה. חברי הפלטפורמה מקבלים 4 סדנאות כאלה בשנה, יחד עם הקורסים, הספרים והזום החודשי איתי.\n\n🎥 ומתנה: ב-{{webinar}} אני עולה לוובינר פתוח לבעלי עסקים. שמור לעצמך מקום 👇\n{{webinar_url}}" },
  { key: "l_d90", track: "lost", wa: "dp_l_d90", subject: "3 חודשים. מה זז?", text: "{{first_name}}, עברו 3 חודשים.\n\nבדיקה של 10 שניות: ההכנסות שלך היום גבוהות יותר? אתה עובד פחות שעות?\n\nאם לא, אותו עסק, אותן החלטות, אותן תוצאות. משהו צריך להשתנות.\n\n🎥 ומתנה: ב-{{webinar}} אני עולה לוובינר פתוח לבעלי עסקים. שמור לעצמך מקום 👇\n{{webinar_url}}" },
  { key: "l_d180", track: "lost", wa: "dp_l_d180", subject: "חצי שנה", text: "{{first_name}}, חצי שנה.\n\nהפלטפורמה גדלה מאז: כלים חדשים, מחשבונים ותוכן חדש. וכל מה ששאלת שמור בתיק שלך.\n\nבוא נדאג שחצי השנה הבאה תיראה אחרת.\n\n🎥 ומתנה: ב-{{webinar}} אני עולה לוובינר פתוח לבעלי עסקים. שמור לעצמך מקום 👇\n{{webinar_url}}" },
  { key: "p_d2_courses", track: "member", wa: "dp_p_d2_courses", subject: "ברוך הבא לפלטפורמה. הקורסים שלך פתוחים 🔥", text: "{{first_name}}, ברוך הבא לפלטפורמה 🔥\n\nכל הקורסים הדיגיטליים והספרים שלי נפתחו לך במערכת הקורסים, עם המייל שאיתו נרשמת. לא קיבלת את פרטי הכניסה? תבדוק בספאם, או תענה לי פה.\n\nאיפה מתחילים? ב\"פשוט למכור הרבה יותר\". מכירות זה הכסף הכי קרוב אליך.\n\nוטיפ: אחרי כל שיעור תשאל אותי בפלטפורמה \"איך אני מיישם את זה בעסק שלי?\". ככה הופכים קורס לכסף." },
  { key: "p_d7_zoom", track: "member", wa: "dp_p_d7_zoom", subject: "הזום הבא איתי. תבוא עם שאלה", text: "{{first_name}}, פעם בחודש אני עולה לפגישה אסטרטגית בזום עם חברי הפלטפורמה: מנועי צמיחה, ואחר כך שאלות ותשובות.\n\nשאלות פתוחות, ניתוח עסקים בלייב ואסטרטגיה למה שקורה עכשיו בשוק.\n\nהטיפ שלי: תשלח לי שאלה אחת על העסק שלך עד 24 שעות לפני, בעמוד \"הקורסים שלי\", ואני עונה עליה ספציפית בזום. מי שמגיע עם שאלה יוצא עם תשובה. מי שמגיע רק לשמוע יוצא עם השראה. שתיהן טובות, אבל רק אחת מזיזה כסף.\n\nלשליחת השאלה 👇\n{{app_url}}/courses" },
  { key: "p_d14_ref", track: "member", wa: "dp_p_d14_ref", subject: "תביא חבר, תקבל סדנה איתי", text: "{{first_name}}, שבועיים בפלטפורמה 🔥\n\nיש לי הצעה בשבילך: על כל חבר בעל עסק שנרשם דרך הקישור האישי שלך ומצטרף למסלול, אתה מקבל מקום בסדנת מכירות פיזית שאני מעביר. בלי הגבלה על מספר החברים.\n\nתעביר את הקישור למי שצריך את זה:\n👇 {{ref_link}}" },
  { key: "p_d30_upsell", track: "member", wa: "dp_p_d30_upsell", subject: "ידע זה לא הבעיה. ביצוע כן", text: "{{first_name}}, חודש ראשון בפלטפורמה.\n\nעכשיו אתה יודע מה צריך לעשות. השאלה היא אם זה קורה.\n\nמ-22 שנה של ניסיון: רוב בעלי העסקים לא נתקעים על ידע, הם נתקעים על ביצוע. בשביל זה יש Platform Private: יועץ בכיר מהצוות שלי יושב איתך שעתיים וחצי, אחד על אחד, ומטמיע הכל על העסק שלך. תוכנית, מספרים, מכירות.\n\nמשלמים רק את ההפרש: ₪590 + מע״מ.\n\nהשעות של היועצים מתמלאות לפי סדר ההרשמה 👇 {{plans_url}}" },
  { key: "p_d90_upsell", track: "member", wa: "dp_p_d90_upsell", subject: "יש החלטות שלא מקבלים לבד", text: "{{first_name}}, רבעון ראשון מאחוריך.\n\nיש החלטות שלא מקבלים לבד: התרחבות, גיוס, העלאת מחירים, כניסה לשוק חדש.\n\nב-Platform Upgrade אנחנו יושבים אחד על אחד, אני ואתה, על העסק שלך.\nב-Platform Pro מקבלים גם פרק פודקאסט שלם על העסק שלך. חשיפה וסמכות שאי אפשר לקנות במודעה.\n\nיש רק ניר אחד, ומספר הפגישות שאני פותח מוגבל. משלמים רק את ההפרש:\n👇 {{plans_url}}" },
  { key: "p_d180_check", track: "member", wa: "dp_p_d180_check", subject: "חצי שנה ביחד 🔥", text: "{{first_name}}, חצי שנה ביחד 🔥\n\nאני רוצה לשמוע ממך: מה המספר האחד שזז הכי הרבה בעסק מאז שהצטרפת? הכנסות, לקוחות, שעות עבודה, רווח.\n\nתענה לי פה במשפט. הסיפורים שלכם הם הדבר שהכי מניע אותי.\n\nואם משהו עדיין תקוע, תכתוב לי גם את זה. זה בדיוק מה שנעשה בחצי השנה הבאה." },
  { key: "p_d335_notice", track: "renewal", wa: "dp_p_d335_notice", subject: "עדכון חשוב לגבי המנוי שלך", text: "{{first_name}}, עדכון חשוב לגבי המנוי שלך.\n\nהשנה הראשונה שלך בפלטפורמה מסתיימת ב-{{year_end}}.\n\nמהיום שאחריו המנוי ממשיך אוטומטית ב-₪69 + מע״מ לחודש (₪81.42), עם כל מה שיש לך היום: הפלטפורמה, הקורסים, הסדנאות והזום החודשי. החיוב יתבצע בכרטיס ששמור במערכת.\n\nלא צריך לעשות כלום כדי להמשיך. אם אתה לא רוצה להמשיך, אפשר לבטל בלחיצה בעמוד המסלולים:\n{{plans_url}}", transactional: true },
  { key: "p_d365_renewed", track: "renewal", wa: "dp_p_d365_renewed", subject: "ממשיכים ביחד: ₪69 לחודש", text: "{{first_name}}, השנה הראשונה שלך בפלטפורמה הסתיימה, והמנוי ממשיך ב-₪69 + מע״מ לחודש.\n\nהכל נשאר פתוח: הפלטפורמה, הקורסים, הסדנאות והזום החודשי.\n\nתודה שאתה איתי 🍒 השנה השנייה היא השנה שבה רואים את התוצאות הגדולות.", transactional: true },
  { key: "c_abandon", track: "checkout", wa: "dp_c_abandon", subject: "עצרת באמצע. שמרתי לך את ההזמנה", text: "{{first_name}}, ראיתי שהתחלת להצטרף ל-{{plan_name}} ועצרת באמצע.\n\nקורה. לפעמים זה טלפון שצלצל, לפעמים זו שאלה שלא קיבלה תשובה.\n\nשמרתי לך את ההזמנה בדיוק כמו שהשארת אותה. שתי אפשרויות:\n👉 להמשיך מאיפה שעצרת: {{plans_url}}\n👉 לענות \"נציג\", ונציג שלי יחזור אליך ויסגור הכל בטלפון\n\nוהבונוסים שהיו פתוחים לך כשהתחלת עדיין בתוקף, אבל לא לעוד הרבה זמן." },
  { key: "x_d7", track: "cancelled", wa: "dp_x_d7", subject: "חבל שהלכת. הדלת פתוחה 30 יום", text: "{{first_name}}, ראיתי שביטלת את המנוי.\n\nבלי לחץ, באמת. אבל אני רוצה לדעת: מה לא עבד? תענה לי במשפט, זה עוזר לי לבנות את זה טוב יותר.\n\nודבר אחד שחשוב שתדע: כל מה שבנית שמור. ואם תחזור עד {{return_end}}, אתה ממשיך ב-₪69 לחודש בלי לשלם על שנה מחדש.\n👇 {{plans_url}}" },
  { key: "x_d30", track: "cancelled", wa: "dp_x_d30", subject: "היום נסגר החלון", text: "{{first_name}}, היום נסגר החלון.\n\nעד היום אפשר לחזור לפלטפורמה ב-₪69 לחודש, בלי לשלם על שנה. מחר זו כבר הצטרפות מלאה מחדש.\n\nהסדנה הפיזית הבאה מתקרבת, והזום החודשי עם ניר בדרך. אם אתה רוצה להיות שם:\n👇 {{plans_url}}" },
  { key: "x_d90", track: "cancelled", wa: "dp_x_d90", subject: "3 חודשים בלי הפלטפורמה", text: "{{first_name}}, 3 חודשים בלי הפלטפורמה.\n\nמה השתנה בעסק? אם התשובה היא \"לא הרבה\", אתה יודע מה לעשות.\n\nהקורסים, הכלים והתיק העסקי שלך מחכים. חוזרים לפלטפורמה וממשיכים מאיפה שעצרת:\n👇 {{plans_url}}" },
  { key: "w_eve", track: "webinar", wa: "dp_w_eve", subject: "מחר בערב אני בלייב. שמרתי לך מקום", text: "{{first_name}}, מחר ({{webinar}}) ב-{{webinar_time}} אני עולה לוובינר חי לבעלי עסקים.\n\nבלי תיאוריה: אני לוקח עסקים אמיתיים ובונה איתם בלייב תחזית, תמחור ותוכנית עבודה. ואז שאלות, מול כולם.\n\nבסוף אני מציג את הפלטפורמה ואת מחיר ההשקה, רק למי שנמצא שם.\n\nשמור מקום 👇\n{{webinar_url}}" },
  { key: "w_day", track: "webinar", wa: "dp_w_day", subject: "הערב ב-{{webinar_time}}. נתראה?", text: "{{first_name}}, הערב ב-{{webinar_time}} אני בלייב.\n\nתבוא עם השאלה הכי קשה בעסק שלך. אני עונה על כמה שיותר, מול כולם. ובסוף: מחיר ההשקה של הפלטפורמה.\n\nהקישור לכניסה 👇\n{{webinar_url}}" },
  { key: "w_week", track: "webinar", wa: "dp_w_week", subject: "בעוד שבוע: וובינר חי איתי. זה מה שתקבל שם", text: "{{first_name}}, ביום שני הבא, {{webinar}} ב-{{webinar_time}}, אני עולה לוובינר פתוח לבעלי עסקים. בחינם.\n\nמה יהיה שם:\n✅ ניתוח עסקים אמיתיים בלייב: תחזית, תמחור ותוכנית עבודה\n✅ איך עובדת הפלטפורמה להצלחה בעסקים, ולמה היא לא עוד קורס\n✅ שאלות ותשובות, מול כולם\n✅ ובסוף: מחיר ההשקה של הפלטפורמה\n\nתשמור לעצמך את הערב הזה. מי שמגיע עם שאלה על העסק שלו, יוצא עם תשובה.\n\nשמור מקום 👇\n{{webinar_url}}" },
  { key: "w_after", track: "webinar", wa: "dp_w_after", subject: "אתמול בלייב. ומה עכשיו?", text: "{{first_name}}, אתמול הייתי בלייב עם בעלי עסקים מכל הארץ 🔥\n\nאם היית: עכשיו זה הזמן לפעול. מחיר ההשקה פתוח, ושנה שלמה איתי מתחילה בלחיצה 👇\n{{plans_url}}\n\nאם לא הספקת: הוובינר הבא ב-{{webinar_next}}. אל תפספס גם אותו 👇\n{{webinar_url}}\n\nמעדיף לדבר עם בן אדם? תענה \"נציג\", ונחזור אליך." },
  { key: "wm_week", track: "webinar", wa: "dp_wm_week", subject: "בעוד שבוע אני בלייב. תביא איתך חבר", text: "{{first_name}}, ביום שני הבא, {{webinar}} ב-{{webinar_time}}, אני עולה לוובינר פתוח.\n\nכחבר בפלטפורמה יש לך שתי סיבות להגיע:\n✅ ניתוח עסקים בלייב ושאלות פתוחות. תבוא עם השאלה שלך\n✅ תביא חבר בעל עסק. על כל חבר שמצטרף דרך הקישור שלך, אתה מקבל מקום בסדנת מכירות פיזית איתי\n\nהקישור האישי שלך להעברה 👇\n{{ref_link}}\n\nהקישור לוובינר 👇\n{{webinar_url}}" },
  { key: "wm_day", track: "webinar", wa: "dp_wm_day", subject: "הערב ב-{{webinar_time}}. נתראה בלייב", text: "{{first_name}}, הערב ב-{{webinar_time}} אני בלייב.\n\nתבוא עם שאלה, ותביא חבר. ואם הגיע הזמן לעבוד אחד על אחד, איתי או עם יועץ: ב-Private וב-Upgrade משלמים רק את ההפרש מהמסלול שלך.\n\nהקישור לכניסה 👇\n{{webinar_url}}" },
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
      // no reminder before the move to ₪69 (Nir's decision, 14.10.2026)
      else if (subAge >= 180) candidates.push("p_d180_check");
      else if (subAge >= 90) candidates.push("p_d90_upsell");
      else if (subAge >= 30) candidates.push("p_d30_upsell");
      else if (subAge >= 14) candidates.push("p_d14_ref");
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
    else if (age >= 7) candidates.push(u.questions_count > 0 ? "t_d7_week" : "t_d7_quiet");
    else if (age >= 3) candidates.push("t_d3_xray");
    else if (age >= 1) candidates.push(u.questions_count === 0 ? "t_d1_noq" : "t_d1_active");
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

/**
 * Rav Messer personal fields hold at most 255 chars, so the journey email body travels to Make
 * as 4 chunks (dp_body, dp_b2, dp_b3, dp_b4), split on line boundaries. Always returns 4 strings.
 */
export function emailParts(text: string, max = 250, slots = 4): string[] {
  const units: string[] = [];
  for (const line of text.split("\n")) {
    if (line.length <= max) { units.push(line); continue; }
    let cur = "";
    for (const w of line.split(" ")) {
      if (cur && cur.length + 1 + w.length > max) { units.push(cur); cur = w; }
      else cur = cur ? `${cur} ${w}` : w;
    }
    if (cur) units.push(cur);
  }
  const parts: string[] = [];
  let cur = "";
  for (const u of units) {
    const next = cur === "" ? u : `${cur}\n${u}`;
    if (next.length <= max || parts.length === slots - 1) cur = next;
    else { parts.push(cur); cur = u; }
  }
  parts.push(cur);
  while (parts.length < slots) parts.push("");
  return parts.map((p) => p.replace(/^\n+|\n+$/g, "").slice(0, 255));
}

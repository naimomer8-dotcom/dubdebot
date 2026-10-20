/**
 * "הפלטפורמה להצלחה בעסקים" – the platform story, in Nir's words (meeting with Nir and Nadav, 14.10.2026).
 * One source for the landing page, the /platform page and the login screen.
 * The bot (דובדבוט) is one part of the platform, not the platform itself.
 */
import type { IconName } from "@/components/Icon";

export const PLATFORM_NAME = "הפלטפורמה להצלחה בעסקים";

/** Why the platform exists – the three shifts Nir describes. */
export const WHY = [
  { t: "לאנשים אין זמן", d: "אף אחד לא לומד היום עסקים שלוש שנים כמו פעם. צריך משהו חזק, מהיר ומדויק, שעובד בקצב של העסק." },
  { t: "ידע הוא כבר לא המשאב הכי חשוב", d: "ידע יש בכל מקום. מה שחשוב היום הוא ממי רוכשים אותו: ממי שכבר עשה את זה, 22 שנה, עם יותר מ-23,000 עסקים." },
  { t: "והכי חשוב: איך מיישמים", d: "ידע שלא הופך לפעולה לא שווה כלום. זה בדיוק מה שהפלטפורמה עושה: לוקחת את הידע ומטמיעה אותו אצלך בעסק." },
];

/** What the analysis looks at, and what comes out of it. */
export const READS = ["סגנון התקשורת שלך", "החסמים שלך", "המאוויים שלך", "המספרים של העסק"];
export const OUTPUTS = ["תחזיות עסקיות", "תוכניות עבודה", "קמפיינים שיווקיים מדויקים", "מסרים חדים"];

/** The verticals the platform works on in parallel. */
export const VERTICALS: { icon: IconName; t: string; d: string }[] = [
  { icon: "target", t: "סגמנט הלקוח", d: "יורדים לעומק: מי הלקוח שלך באמת, ומי הלקוח האווטאר שכדאי לך לרדוף אחריו." },
  { icon: "chart", t: "מחיר ממוצע לעסקה", d: "מגדילים את הסכום שכל לקוח משאיר אצלך, בלי לרדוף אחרי עוד לקוחות." },
  { icon: "layers", t: "משפכי שיווק מודרניים", d: "בונים את הדרך מהמודעה הראשונה ועד הלקוח שמשלם, צעד אחרי צעד." },
  { icon: "bolt", t: "אוטומציות", d: "מורידים ממך תהליכים כבדים שגוזלים שעות, כדי שתעבוד על העסק ולא בתוכו." },
];

/** "Active, not passive" – what the platform checks for you. */
export const ACTIVE_CHECKS = [
  "שהתחזית העסקית שלך באמת הופכת לפעולה, על בסיס קבוע",
  "שדוחות הרווח וההפסד מול רואה החשבון הם לא נייר ואוויר",
  "שתזרים המזומנים מותאם לתחזית",
  "שהיעדים מתעדכנים לפי מה שקורה בפועל",
];

/** The five ways the platform works with you. */
export const MODES: { t: string; d: string }[] = [
  { t: "אישי", d: "דובדבוט: ניר זמין לך 24/6, מכיר את העסק ובונה איתך תוצרים" },
  { t: "אחד על אחד", d: "יועץ בכיר מהצוות של ניר, או ניר בעצמו, לפי המסלול" },
  { t: "קבוצתי", d: "הסדנה \"להעיר את הכסף שבך\" פעם ברבעון, נטוורקינג וקהילה" },
  { t: "היברידי", d: "פגישה אסטרטגית חודשית בזום עם ניר" },
  { t: "מערכתי", d: "הודעות פוש, תחזיות, יעדים ומחשבונים שעובדים בשבילך" },
];

/** Who each plan is for (Nir: "אחד שהולך עד הסוף, אחד שאוהב להתחיל בקטן"). */
export const PERSONAS: Record<string, string> = {
  basic: "למי שאוהב להתחיל בקטן",
  private: "למי שרוצה שמישהו ייכנס איתו לעבודה",
  upgrade: "למי שרוצה את ניר על ההחלטות הגדולות",
  pro: "למי שהולך עד הסוף",
};

export const SHABBAT_NOTE = "24/6: בשבת אנחנו נחים ומתמקדים במשפחה.";

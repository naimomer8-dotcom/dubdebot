/**
 * Per-plan landing pages (/plans/basic, /plans/private, /plans/upgrade, /plans/pro).
 * Copy lives here; prices and inclusions always come from lib/plans.ts.
 */
import type { Billing, Tier } from "./plans";

export type PlanPage = {
  id: Tier;
  eyebrow: string;
  title: string;
  gold: string;
  promise: string;
  forWho: string[];
  extras: { t: string; d: string }[];
  steps: { t: string; d: string }[];
  faq: { q: string; a: string }[];
  og: string;
};

const BASE_STEPS = [
  { t: "הכל נפתח מיד", d: "דובדבוט, הכלים, 8 הקורסים, קורס הבונוס ו-4 הספרים נפתחים תוך דקות מהסליקה, עם המייל שנרשמת איתו." },
  { t: "מתחילים לעבוד", d: "שאלה ראשונה לניר, רנטגן עסקי של 3 דקות, ואחר כך תחזית ותוכנית עבודה שנשמרות בתיק העסקי שלך." },
  { t: "נפגשים", d: "הזמנה לזום החודשי עם ניר ולסדנה \"להעיר את הכסף שבך\" מגיעה בוואטסאפ ובמייל." },
];

export const PLAN_PAGES: Record<Tier, PlanPage> = {
  basic: {
    id: "basic",
    eyebrow: "Platform Basic",
    title: "כל הידע של ניר.",
    gold: "זמין לך 24/6.",
    promise: "השיטה של ניר דובדבני, 22 שנה של ליווי עסקים, בתוך פלטפורמה אחת: יועץ AI שמכיר את העסק שלך, קורסים, ספרים, סדנה רבעונית וזום חודשי עם ניר.",
    forWho: ["למי שאוהב להתחיל בקטן ולעבוד בקצב שלו", "בעלי עסקים שרוצים תשובה עכשיו, לא בעוד שבועיים", "מי שרוצה סדר: תחזית, תוכנית עבודה ומשימות במקום אחד"],
    extras: [],
    steps: BASE_STEPS,
    faq: [
      { q: "זה מתאים לעסק קטן?", a: "כן. רוב החברים הם עסקים קטנים ובינוניים. דובדבוט עונה על העסק שלך, במספרים שלך, ולא באופן כללי." },
      { q: "אפשר לשדרג אחר כך?", a: "כן. בכל רגע עוברים ל-Private, Upgrade או Pro ומשלמים רק את ההפרש. השנה ממשיכה מאותו תאריך." },
    ],
    og: "דובדבוט 24/6, 8 קורסים, 4 ספרים, הסדנה \"להעיר את הכסף שבך\" פעם ברבעון וזום חודשי עם ניר דובדבני.",
  },
  private: {
    id: "private",
    eyebrow: "Platform Private",
    title: "הכל, ויועץ אמיתי",
    gold: "שנכנס איתך לעבודה.",
    promise: "כל מה שב-Platform Basic, ועוד פגישת הטמעה של שעתיים וחצי, אחד על אחד, עם יועץ עסקי בכיר מהצוות של ניר. יושבים על העסק שלך ומטמיעים את הכלים עד שהם עובדים.",
    forWho: ["למי שרוצה שמישהו ייכנס איתו לעבודה", "מי שיודע מה צריך לעשות ורוצה שזה סוף סוף יקרה", "בעלי עסקים שעובדים טוב יותר מול בן אדם"],
    extras: [{ t: "פגישת הטמעה של 2.5 שעות", d: "אחד על אחד עם יועץ עסקי בכיר. עוברים על התחזית, התוכנית והמספרים, ויוצאים עם צעדים ברורים." }],
    steps: [...BASE_STEPS.slice(0, 2), { t: "פגישת ההטמעה", d: "נציג מתאם איתך את פגישת ההטמעה עם היועץ הבכיר. ובמקביל ההזמנות לזום החודשי ולסדנה \"להעיר את הכסף שבך\"." }],
    faq: [
      { q: "מי היועץ שאפגוש?", a: "יועץ עסקי בכיר מהצוות של ניר, שעובד לפי אותה שיטה. הוא מכיר את הכלים של הפלטפורמה ומטמיע אותם על העסק שלך." },
      { q: "מתי מתקיימת פגישת ההטמעה?", a: "נציג מתאם איתך מועד אחרי הסליקה. כדאי לקבוע אותה בחודשים הראשונים, כדי שהתוכנית תתחיל לרוץ מוקדם." },
    ],
    og: "כל מה שב-Basic, ועוד פגישת הטמעה של שעתיים וחצי אחד על אחד עם יועץ עסקי בכיר מהצוות של ניר דובדבני.",
  },
  upgrade: {
    id: "upgrade",
    eyebrow: "Platform Upgrade",
    title: "הכל, וניר דובדבני",
    gold: "על ההחלטות הגדולות.",
    promise: "כל מה שב-Platform Basic, ועוד פגישת אסטרטגיה אישית עם ניר דובדבני בעצמו. 22 שנה של ליווי עסקים, יושבות איתך על העסק שלך.",
    forWho: ["למי שרוצה את ניר על ההחלטות הגדולות", "בעלי עסקים לפני צמיחה, גיוס, מוצר חדש או שינוי כיוון", "מי שרוצה מבט מבחוץ של מי שראה הכל"],
    extras: [{ t: "פגישת אסטרטגיה אישית עם ניר", d: "פגישה אחד על אחד עם ניר דובדבני. מגיעים עם ההחלטה הכי גדולה שלך, ויוצאים עם כיוון ברור." }],
    steps: [...BASE_STEPS.slice(0, 2), { t: "הפגישה עם ניר", d: "נציג מתאם איתך את הפגישה האישית עם ניר. ובמקביל ההזמנות לזום החודשי ולסדנה \"להעיר את הכסף שבך\"." }],
    faq: [
      { q: "הפגישה היא באמת עם ניר?", a: "כן. פגישת אסטרטגיה אישית עם ניר דובדבני בעצמו, במקום הפגישות עם היועץ." },
      { q: "איך מתכוננים לפגישה?", a: "כדאי להגיע עם רנטגן עסקי ותחזית מהפלטפורמה. ככה ניר רואה את המספרים מראש והפגישה הולכת ישר לעיקר." },
    ],
    og: "כל מה שב-Basic, ועוד פגישת אסטרטגיה אישית אחד על אחד עם ניר דובדבני.",
  },
  pro: {
    id: "pro",
    eyebrow: "Platform Pro",
    title: "הכל כלול.",
    gold: "עד הסוף.",
    promise: "כל מה שב-Platform Basic, פגישת הטמעה עם יועץ בכיר, פגישה אישית עם ניר דובדבני, ופרק פודקאסט אחד על אחד עם ניר על העסק שלך.",
    forWho: ["למי שהולך עד הסוף", "בעלי עסקים שרוצים את כל הליווי בחבילה אחת", "מי שרוצה במה: פרק פודקאסט על העסק שלו עם ניר"],
    extras: [
      { t: "פגישת הטמעה של 2.5 שעות", d: "אחד על אחד עם יועץ עסקי בכיר מהצוות של ניר." },
      { t: "פגישה אישית עם ניר", d: "פגישת אסטרטגיה עם ניר דובדבני על ההחלטות הגדולות." },
      { t: "פרק פודקאסט עם ניר", d: "פרק אחד על אחד על העסק שלך, מוקלט עד 60 יום מהסליקה." },
    ],
    steps: [...BASE_STEPS.slice(0, 2), { t: "פגישות ופודקאסט", d: "נציג מתאם איתך את הפגישות ואת הקלטת הפודקאסט (עד 60 יום מהסליקה), ושולח שאלון מנחה לפני ההקלטה." }],
    faq: [
      { q: "מתי מקליטים את הפודקאסט?", a: "ההקלטה מתקיימת עד 60 יום מתאריך הסליקה. לפניה ממלאים שאלון מנחה קצר ומתאמים מועד." },
      { q: "מה ההבדל בין Pro ל-Upgrade?", a: "Upgrade כולל פגישה אישית עם ניר. Pro כולל גם את פגישת ההטמעה עם היועץ הבכיר וגם פרק פודקאסט אחד על אחד עם ניר." },
    ],
    og: "הכל כלול: הפלטפורמה, פגישת הטמעה עם יועץ בכיר, פגישה אישית עם ניר דובדבני ופרק פודקאסט אחד על אחד.",
  },
};

export const COMMON_FAQ = [
  { q: "מה ההבדל בין תשלום אחד ל-12 תשלומים?", a: "מקבלים בדיוק את אותו דבר. בתשלום אחד המחיר נמוך יותר, וב-12 תשלומים מחלקים בכרטיס אשראי." },
  { q: "מה קורה אחרי השנה?", a: "המנוי ממשיך אוטומטית ב-₪69 + מע״מ לחודש, בלי לסלוק מחדש. אפשר לבטל את החידוש בכל רגע, והחיוב נעצר מהחודש הבא." },
  { q: "אפשר לבטל אחרי הרכישה?", a: "לא. כל התכנים נפתחים מיד עם הסליקה, ולכן אין ביטולים והחזרים אחרי התשלום. רוצה לנסות קודם? יש 30 יום במתנה." },
];

// ---------- links that keep the campaign params ----------
const PASS = /^(utm_[a-z]+|fbclid|gclid|ref)$/;

/** Only the params worth carrying to checkout (UTM, click ids, referral). */
export function carried(params: URLSearchParams | Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  const entries = params instanceof URLSearchParams ? [...params.entries()] : Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v] as [string, string | undefined]);
  for (const [k, v] of entries) if (v && PASS.test(k)) out[k] = String(v).slice(0, 120);
  return out;
}

export function checkoutPath(tier: Tier, billing: Billing, extra: Record<string, string> = {}) {
  const q = new URLSearchParams({ up: tier, buy: "1", billing, ...extra });
  return `/plans?${q.toString()}`;
}

/** Where the plan CTA goes: straight to checkout when signed in, otherwise signup that returns to checkout. */
export function ctaHref(tier: Tier, billing: Billing, signedIn: boolean, extra: Record<string, string> = {}) {
  if (signedIn) return checkoutPath(tier, billing, extra);
  const q = new URLSearchParams({ plan: tier, billing, ...extra });
  return `/?${q.toString()}#signup`;
}

/** A safe "next" for /login: only our own checkout path. */
export function safeNext(next: string | undefined | null): string | null {
  if (!next || next.length > 600) return null;
  return /^\/plans\?[A-Za-z0-9_=&%.\-+]*$/.test(next) ? next : null;
}

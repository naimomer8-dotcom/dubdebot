import type { IconName } from "@/components/Icon";
import type { ToolMode } from "./persona";

/** What one big button in a room does: open a page, open a chat tool, or hand Nir a ready question. */
export type RoomAction =
  | { kind: "href"; href: string }
  | { kind: "tool"; tool: ToolMode }
  | { kind: "ask"; text: string };

export type RoomItem = { key: string; icon: IconName; title: string; desc: string; action: RoomAction };

export type Room = {
  id: string;
  icon: IconName;
  title: string;
  /** One line on the home tile: what you get in this room. */
  tagline: string;
  /** One sentence at the top of the room page. */
  intro: string;
  /** At most 3, the first one is the main action. */
  items: RoomItem[];
  /** Course ids from lib/courses LIBRARY with lessons on this subject. */
  courses: number[];
};

export const ROOMS: Room[] = [
  {
    id: "marketing",
    icon: "target",
    title: "שיווק",
    tagline: "קמפיין, מודעות ותסריט לסרטון",
    intro: "כאן בונים לקוחות חדשים: מבינים מי הקהל, כותבים מודעה ומכינים סרטון.",
    items: [
      { key: "campaign", icon: "bolt", title: "בונים קמפיין מאפס", desc: "4 שלבים: קהל, קופי, תסריט צילום ומודעה מוכנה להורדה", action: { kind: "href", href: "/rooms/marketing/campaign" } },
      { key: "ad", icon: "edit", title: "לכתוב מודעה או פוסט", desc: "ניר שואל 2 שאלות וכותב לך טקסט שמוכר", action: { kind: "ask", text: "ניר, תכתוב לי מודעה לפייסבוק ואינסטגרם לעסק שלי. תשאל אותי קודם מה אני מוכר ולמי, ואז תן לי 3 גרסאות עם פתיח חזק וקריאה לפעולה." } },
      { key: "ideas", icon: "spark", title: "רעיונות לקמפיין", desc: "כיוונים, מסרים והצעות שאפשר להעלות השבוע", action: { kind: "tool", tool: "campaign" } },
    ],
    courses: [110992, 10426],
  },
  {
    id: "sales",
    icon: "phone",
    title: "מכירות",
    tagline: "תסריט שיחה ותשובות להתנגדויות",
    intro: "כאן סוגרים יותר: תסריט לשיחת מכירה ותרגול של מה עונים ללקוח שמתלבט.",
    items: [
      { key: "script", icon: "list", title: "תסריט לשיחת מכירה", desc: "פתיחה, שאלות, סגירה ו-5 תשובות להתנגדויות", action: { kind: "href", href: "/rooms/sales/script" } },
      { key: "objections", icon: "mic", title: "לתרגל שיחה עם ניר", desc: "ניר משחק לקוח שמתלבט, אתם עונים ומקבלים משוב", action: { kind: "tool", tool: "objections" } },
      { key: "tests", icon: "target", title: "מבחן מכירות", desc: "איפה אתה חזק בשיחה ואיפה כדאי לשפר", action: { kind: "href", href: "/tests" } },
    ],
    courses: [50, 1366],
  },
  {
    id: "money",
    icon: "coin",
    title: "כסף",
    tagline: "תזרים, מחירים ודוחות",
    intro: "כאן מסדרים את הכסף: כמה נשאר לך באמת, איך לתמחר ומה הדוחות אומרים.",
    items: [
      { key: "target", icon: "target", title: "כמה צריך למכור?", desc: "כמה מכירות ופניות צריך בחודש כדי להגיע ליעד", action: { kind: "href", href: "/rooms/money/target" } },
      { key: "money", icon: "coin", title: "מצב הכסף שלי", desc: "שאלון קצר ותמונה ברורה של הכסף בעסק", action: { kind: "href", href: "/money" } },
      { key: "reports", icon: "file", title: "לבדוק דוח או תלוש", desc: "מעלים קובץ, ניר מסביר מה רואים בו", action: { kind: "tool", tool: "financials" } },
    ],
    courses: [110990, 116394],
  },
  {
    id: "realestate",
    icon: "home",
    title: "נדל״ן",
    tagline: "לבדוק עסקה ולתכנן השקעה",
    intro: "כאן בודקים נדל״ן כמו משקיע: כמה זה מכניס, כמה זה עולה ומה הסיכון.",
    items: [
      { key: "deal", icon: "scan", title: "לבדוק עסקה", desc: "מחיר, שכירות והון עצמי, ורואים מיד החזר, תזרים ותשואה", action: { kind: "href", href: "/rooms/realestate/deal" } },
      { key: "plan", icon: "map", title: "מאיפה מתחילים להשקיע", desc: "כמה הון צריך ומה הצעד הראשון שלך", action: { kind: "ask", text: "ניר, אני רוצה להתחיל להשקיע בנדל״ן. תשאל אותי כמה הון יש לי, מה ההכנסה החודשית ומה המטרה, ותבנה לי צעד ראשון ברור." } },
    ],
    courses: [111779, 116394],
  },
  {
    id: "social",
    icon: "image",
    title: "סושיאל",
    tagline: "סטורי להיום ופוסטים לשבוע",
    intro: "כאן נשארים בראש של הלקוחות: סטורי אחד ביום, בלי לחשוב מה להעלות.",
    items: [
      { key: "story", icon: "image", title: "הסטורי של היום", desc: "רעיון אחד, 3 פריימים, מה לצלם ומה לכתוב", action: { kind: "href", href: "/rooms/social#story" } },
      { key: "week", icon: "calendar", title: "לוח תוכן לשבוע", desc: "7 ימים, מה מעלים כל יום, עם פתיח וקריאה לפעולה", action: { kind: "href", href: "/rooms/social/week" } },
      { key: "scan", icon: "radar", title: "איך אני נראה ברשתות", desc: "סריקה של העמוד שלך מבחוץ", action: { kind: "href", href: "/scan" } },
    ],
    courses: [110992],
  },
  {
    id: "courses",
    icon: "layers",
    title: "קורסים",
    tagline: "כל הקורסים והספרים של ניר",
    intro: "כל הקורסים במקום אחד.",
    items: [],
    courses: [],
  },
];

export const roomById = (id: string) => ROOMS.find((r) => r.id === id) ?? null;
export const roomHref = (r: Room) => (r.id === "courses" ? "/courses" : `/rooms/${r.id}`);

/** Story ideas a member can shoot in 2 minutes. One per day, same for everyone that day. */
export const STORY_IDEAS: { title: string; frames: [string, string, string] }[] = [
  { title: "מאחורי הקלעים של הבוקר", frames: ["צלמו איפה אתם מתחילים את היום (שולחן, רכב, קפה)", "כתבו: \"ככה נראה יום עבודה אמיתי אצלנו\"", "סקר: \"גם אתם מתחילים מוקדם?\" כן / לא"] },
  { title: "שאלה שלקוח שאל השבוע", frames: ["כתבו על רקע שחור את השאלה שלקוח שאל", "תשובה קצרה בווידאו של 15 שניות מול המצלמה", "\"יש לכם שאלה? תשלחו לי הודעה\""] },
  { title: "לפני ואחרי", frames: ["תמונה של הבעיה כמו שהלקוח הגיע", "תמונה של התוצאה אחרי שטיפלתם", "\"רוצים כזה גם? שלחו הודעה\""] },
  { title: "טעות שכולם עושים", frames: ["\"הטעות מספר 1 שאני רואה אצל לקוחות\" (טקסט גדול)", "15 שניות מול המצלמה: מה הטעות ולמה היא עולה כסף", "\"איך עושים את זה נכון? תגיבו לי 'כן'\""] },
  { title: "מספר אחד מהשבוע", frames: ["מספר גדול על המסך (לקוחות, הזמנות, שעות)", "משפט אחד: מה המספר הזה אומר עליכם", "\"מה המספר שלכם השבוע?\" תיבת שאלה"] },
  { title: "המלצה של לקוח", frames: ["צילום מסך של הודעה או ביקורת טובה (בלי פרטים מזהים)", "\"זה מה שגורם לי לקום בבוקר\" מול המצלמה", "\"רוצים להיות הלקוח הבא? הקישור בהודעה\""] },
  { title: "מה אני מתכנן היום", frames: ["רשימה של 3 משימות לדף או לפתק", "צילום קצר של המשימה הראשונה בעבודה", "\"מה המשימה הכי חשובה שלכם היום?\" תיבת שאלה"] },
  { title: "כלי שאני לא מוותר עליו", frames: ["צילום של הכלי, האפליקציה או הציוד", "15 שניות: למה הוא חוסך לי זמן או כסף", "סקר: \"מכירים?\" כן / לא"] },
  { title: "שאלה ללקוחות", frames: ["\"עזרו לי להחליט\" (טקסט גדול)", "שתי אפשרויות למוצר או שירות חדש", "סקר עם שתי האפשרויות"] },
  { title: "הסיפור שלי בקצרה", frames: ["תמונה ישנה מההתחלה של העסק", "\"לפני X שנים התחלתי עם...\" משפט אחד", "\"היום אנחנו... תודה שאתם פה\""] },
];

export function storyOfDay(now = Date.now()) {
  const day = Math.floor((now + 2 * 3600_000) / 86400_000);
  return STORY_IDEAS[day % STORY_IDEAS.length];
}

import type { IconName } from "@/components/Icon";

export type ToolId = "script" | "week" | "deal" | "target";
export const ROOM_TOOLS: Record<string, { room: string; roomTitle: string; icon: IconName; title: string; intro: string }> = {
  script: { room: "sales", roomTitle: "חדר המכירות", icon: "list", title: "תסריט לשיחת מכירה", intro: "עונים על 3 שאלות ומקבלים שיחה מלאה: פתיחה, שאלות, הצגה, סגירה ו-5 תשובות להתנגדויות." },
  week: { room: "social", roomTitle: "חדר הסושיאל", icon: "calendar", title: "לוח תוכן לשבוע", intro: "7 ימים, מה מעלים בכל יום, עם משפט פתיחה וקריאה לפעולה. בלי לחשוב." },
  deal: { room: "realestate", roomTitle: "חדר הנדל״ן", icon: "scan", title: "בדיקת עסקת נדל״ן", intro: "מכניסים מחיר, שכירות והון עצמי, ורואים מיד: החזר חודשי, תזרים ותשואה." },
  target: { room: "money", roomTitle: "חדר הכסף", icon: "target", title: "כמה צריך למכור?", intro: "כמה אתם רוצים להרוויח בחודש, ואנחנו מחשבים כמה מכירות וכמה פניות צריך בשביל זה." },
};

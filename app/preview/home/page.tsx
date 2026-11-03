import { notFound } from "next/navigation";
import HomeClient from "@/components/HomeClient";
import { quoteOfDay } from "@/lib/home";

// Design preview with sample data. Disabled in production.
export default async function PreviewHome() {
  if (process.env.NODE_ENV === "production") notFound();
  const user = { id: "preview", firstName: "מיכל", fullName: "מיכל כהן", phone: "0501234567", email: "michal@example.com", access: { status: "trial" as const, plan: "trial" as const, accessUntil: new Date(Date.now() + 20 * 864e5).toISOString(), daysLeft: 20, renewalRequestedAt: null, tier: null, renewalMode: "none" } };
  const steps = [
    { key: "question" as const, short: "שאלה", title: "שאלה ראשונה לניר", sub: "על כל אתגר בעסק", href: "/chat", done: true },
    { key: "xray" as const, short: "רנטגן", title: "רנטגן לעסק", sub: "12 שאלות · 4 דקות · ציון על 6 צירים", href: "/xray", done: false },
    { key: "money" as const, short: "כסף", title: "בדיקת הכסף", sub: "כמה נשאר אצלך", href: "/money", done: false },
    { key: "events" as const, short: "סדנה", title: "סדנת המכירות והוובינר", sub: "בלחיצה", done: true },
    { key: "vault" as const, short: "תיק", title: "התוצר הראשון בתיק", sub: "", href: "/chat", done: false },
    { key: "wa" as const, short: "קבוצה", title: "קבוצת העדכונים", sub: "", done: false },
  ];
  return <HomeClient user={user} conversations={[]} steps={steps} xrayScore={null} quote={quoteOfDay()} webinarDate="2026-11-15" />;
}

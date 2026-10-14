import { notFound } from "next/navigation";
import ChatClient, { ChatMessage } from "@/components/ChatClient";

// Design preview with sample data. Disabled in production.
export default async function Preview({ searchParams }: { searchParams: Promise<{ empty?: string }> }) {
  const empty = !!(await searchParams).empty;
  if (process.env.NODE_ENV === "production") notFound();
  const messages: ChatMessage[] = [
    { id: null, role: "user", content: "יש לי סטודיו לפילאטיס בראשון לציון. מחזור של 85 אלף בחודש, 3 מדריכות, ואני עובדת 12 שעות ביום ולא רואה כסף." },
    {
      id: "a1",
      role: "assistant",
      content:
        "85 אלף בחודש ואת לא רואה כסף? זה לא בעיה של מחזור. זו בעיה של **מודל**.\n\n22 שנה אני רואה את אותו סרט: בעלת עסק שהיא גם המנכ״לית, גם המדריכה הכי טובה וגם הפקידה. את לא בעלת עסק – את העובדת הכי יקרה שלו.\n\n| מדד | היום | יעד 90 יום |\n|---|---|---|\n| מחזור חודשי | 85,000 ₪ | 110,000 ₪ |\n| שעות שלך בשבוע | 72 | 45 |\n| מנויים קבועים | ? | 140 |\n\nלפני שאני בונה לך תוכנית – שתי שאלות:\n1. כמה מתוך ה-85 אלף מגיע ממנויים קבועים וכמה מכרטיסיות?\n2. כמה שעות שיעור בשבוע את מעבירה בעצמך?",
      cta: "pain_keyword",
    },
  ];
  return (
    <ChatClient
      user={{ id: "preview", firstName: "מיכל", fullName: "מיכל כהן", phone: "0501234567", email: "michal@example.com", access: { status: "trial", plan: "trial", accessUntil: new Date(Date.now() + 20 * 864e5).toISOString(), daysLeft: 20, renewalRequestedAt: null, tier: null, renewalMode: "none" } }}
      conversations={empty ? [] : [{ id: "c1", title: "איך מעלים מחירים בסטודיו", mode: "chat", updated_at: "", pinned: true, folder: null }, { id: "c2", title: "תחזית ל-2027", mode: "forecast", updated_at: "", pinned: false, folder: "תכנון" }]}
      leadSentInitially={false}
      initialConversationId={null}
      initialMessages={empty ? [] : messages.map((m, i) => (i === 1 ? { ...m, next: ["כ-60% מנויים קבועים", "אני מעבירה 25 שעות בשבוע", "תבנה לי תחזית ל-12 חודש"] } : m))}
      initialTool={null}
      autoXray={false}
    />
  );
}

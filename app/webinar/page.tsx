import { nextWebinar, webinarLabel, WEBINAR_TIME, WEBINAR_TITLE, WEBINAR_WA_GROUP } from "@/lib/webinars";

export const dynamic = "force-dynamic";
export const metadata = { title: "וובינר חי עם ניר דובדבני · מנועי צמיחה 2027" };

export default function WebinarPage() {
  const d = nextWebinar();
  return (
    <main className="legal" dir="rtl" style={{ maxWidth: 600, margin: "0 auto", padding: "64px 20px", textAlign: "center" }}>
      <p style={{ color: "var(--gold)", fontWeight: 800 }}>🔴 וובינר חי עם ניר דובדבני</p>
      <h1>{WEBINAR_TITLE}</h1>
      <p style={{ fontSize: 22 }}>יום ראשון, {webinarLabel(d)} בשעה {WEBINAR_TIME}</p>
      <p>מה שעבד ב-2026 לא יעבוד ב-2027. 4 השינויים שכל עסק חייב לעשות: אוטומציה, בידול, &quot;אין יותר עסק קטן&quot; וחשיבת סקייל. ובסוף שאלות ותשובות עם ניר.</p>
      <p style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 24 }}>
        <a className="btn btn-primary" href="/w">כניסה לוובינר בזום</a>
        <a className="btn btn-glass" href={WEBINAR_WA_GROUP} target="_blank" rel="noopener noreferrer">לקבוצת העדכונים בוואטסאפ</a>
      </p>
      <p style={{ marginTop: 24 }}><a href="/">חזרה ל-Duvdevani Platform</a></p>
    </main>
  );
}

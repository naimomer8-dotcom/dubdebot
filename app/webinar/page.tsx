import { nextWebinar, webinarLabel, WEBINAR_TIME } from "@/lib/webinars";

export const dynamic = "force-dynamic";
export const metadata = { title: "וובינר פתוח עם ניר דובדבני" };

export default function WebinarPage() {
  const d = nextWebinar();
  return (
    <main className="legal" dir="rtl" style={{ maxWidth: 560, margin: "0 auto", padding: "64px 20px", textAlign: "center" }}>
      <h1>הוובינר הפתוח הבא עם ניר</h1>
      <p style={{ fontSize: 22 }}>יום שני, {webinarLabel(d)} בשעה {WEBINAR_TIME}</p>
      <p>קישור הכניסה יעלה לכאן ויישלח אליך בוואטסאפ ובמייל ביום הוובינר.</p>
      <p><a href="/">חזרה ל-Duvdevani Platform</a></p>
    </main>
  );
}

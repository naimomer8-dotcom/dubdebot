import { nextWebinar, webinarLabel, WEBINAR_TIME, WEBINAR_TITLE, WEBINAR_WA_GROUP } from "@/lib/webinars";
import WebinarSignupForm from "@/components/WebinarSignupForm";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "וובינר חי עם ניר דובדבני · מנועי צמיחה 2027",
  description: "מה שעבד ב-2026 לא יעבוד ב-2027. לייב בזום עם ניר דובדבני: 4 השינויים שכל עסק חייב לעשות.",
  openGraph: { title: "וובינר חי עם ניר דובדבני · מנועי צמיחה 2027", description: "מה שעבד ב-2026 לא יעבוד ב-2027. שומרים מקום בלייב.", images: [{ url: "/og-webinar.jpg", width: 1200, height: 630 }] },
};

export default async function WebinarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const utm = { utm_source: pick("utm_source"), utm_medium: pick("utm_medium"), utm_campaign: pick("utm_campaign"), utm_content: pick("utm_content") };
  const d = nextWebinar();
  return (
    <main className="cb-page" dir="rtl">
      <div className="cb-card ws-card">
        <img className="cb-ava" src="/nir/talk-face.jpg" alt="ניר דובדבני" />
        <p className="cb-eyebrow">🔴 לייב בזום עם ניר דובדבני</p>
        <h1 className="ws-h1">{WEBINAR_TITLE}</h1>
        <p className="ws-when">יום ראשון, {webinarLabel(d)} · {WEBINAR_TIME}</p>
        <p className="cb-lead">מה שעבד ב-2026 לא יעבוד ב-2027. ניר מפרק את 4 השינויים שכל עסק חייב לעשות: אוטומציה, בידול, &quot;אין יותר עסק קטן&quot; וחשיבת סקייל. ובסוף, שאלות ותשובות פתוחות.</p>
        <WebinarSignupForm dateLabel={webinarLabel(d)} time={WEBINAR_TIME} waGroup={WEBINAR_WA_GROUP} utm={utm} />
      </div>
    </main>
  );
}

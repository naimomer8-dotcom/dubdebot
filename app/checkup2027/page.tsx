import type { Metadata } from "next";
import Link from "next/link";
import { STATIONS } from "@/lib/checkup";

export const metadata: Metadata = {
  title: "כמה אתה והעסק שלך מוכנים ל-2027? צ׳קאפ אישי ועסקי + תוכנית במתנה | ניר דובדבני",
  description: "10 דקות, ציון מ-1 עד 10 לעסק ולחיים שלך, ותוכנית עסקית ואישית ל-2027. במתנה מניר דובדבני.",
  openGraph: { title: "כמה אתה והעסק שלך מוכנים ל-2027?", description: "צ׳קאפ אישי ועסקי + תוכנית ל-2027 במתנה מניר דובדבני.", locale: "he_IL", type: "website" },
};

const GO = "/checkup?src=meta";

export default function Checkup2027() {
  return (
    <div className="lp">
      <header className="lp-top">
        <img src="/logo-duvdevani-white.png" alt="קבוצת דובדבני" />
        <Link href={GO} className="lp-mini">לצ׳קאפ ←</Link>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-copy">
          <p className="lp-badge">במתנה מניר דובדבני</p>
          <h1>כמה אתה והעסק שלך<br /><span>מוכנים ל-2027?</span></h1>
          <p className="lp-lede">ב-10 דקות תקבל ציון מ-1 עד 10 על העסק ועל החיים שלך: הבית, המשכנתא, הנדל״ן והפרישה. ומשוב ותוכנית עסקית ואישית מלאה לשנה הקרובה, עם השיטה של 22 שנה.</p>
          <Link href={GO} className="cx-cta lp-cta"><span>לצ׳קאפ העסקי שלי</span><b aria-hidden>←</b></Link>
          <p className="lp-under">בלי כרטיס אשראי · בלי התחייבות · PDF להורדה</p>
        </div>
        <div className="lp-hero-art" aria-hidden>
          <div className="lp-phone">
            <div className="lp-phone-in">
              <small>הציון של העסק</small>
              <div className="lp-ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" className="bg" /><circle cx="60" cy="60" r="50" className="fg" /></svg><b>6.4</b></div>
              <em>יציב, עם דליפות</em>
              <ul>{STATIONS.slice(0, 6).map((s, i) => <li key={s.id}><span>{s.label}</span><i><b style={{ width: `${[72, 48, 61, 35, 80, 54][i]}%` }} /></i></li>)}</ul>
            </div>
          </div>
          <img src="/nir/suit-point.webp" alt="" className="lp-nir" />
        </div>
      </section>

      <section className="lp-sec">
        <h2>מה תקבל בסוף 7 הדקות</h2>
        <div className="lp-grid3">
          {[
            ["01", "ציון עסקי וציון אישי", "בעסק: חזון, בידול, SOP, תזרים, לידים, מכירות וצוות. אצלך: כלכלת הבית, משכנתא, נדל״ן ופרישה. מ-1 עד 10, בלי הנחות."],
            ["02", "משוב של ניר", "מה עובד אצלך, איפה הכסף בורח, בעסק ובבית, ומה הדבר הראשון שמתקנים. בשפה של ניר, בלי מריחות."],
            ["03", "תוכנית ל-2027", "תוכנית עסקית: יעד, 4 רבעונים, 90 יום ומדדים. ותוכנית אישית: בית, משכנתא, הון ונדל״ן. כולל PDF להורדה."],
          ].map(([n, t, d]) => <article key={n} className="lp-card"><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}
        </div>
      </section>

      <section className="lp-sec">
        <h2>{STATIONS.length} תחנות. העסק, ואתה.</h2>
        <ol className="lp-stations">{STATIONS.map((s) => <li key={s.id} className={s.part === "me" ? "me" : ""}><b>{s.n}</b><div><strong>{s.label}</strong><small>{s.part === "me" ? "אישי · " : ""}{s.tag}</small></div></li>)}</ol>
      </section>

      <section className="lp-sec lp-nirsec">
        <img src="/nir/home-yes.webp" alt="ניר דובדבני" />
        <div>
          <p className="lp-badge">מי בנה את זה</p>
          <h2>ניר דובדבני</h2>
          <p>22 שנה שאני נכנס לעסקים, מעסקים קטנים ועד חברות גדולות, ומראה לבעלים איפה הכסף בורח. מנחה ״עסקים עכשיו״ בערוץ 14. את השאלות האלה אני שואל בפגישה הראשונה עם כל לקוח, על העסק ועל החיים שלו. עכשיו הן אצלך, במתנה.</p>
          <blockquote>״אסטרטגיה מנצחת טקטיקה. קודם מבינים איפה אתה עומד, ורק אז מאיצים.״</blockquote>
        </div>
      </section>

      <section className="lp-sec">
        <h2>שאלות ששואלים</h2>
        <div className="lp-faq">
          {[
            ["זה באמת בחינם?", "כן. הצ׳קאפ והתוכנית העסקית במתנה. אם תרצה ליישם את התוכנית עם יועץ מהצוות של ניר, נדבר על זה אחרי."],
            ["כמה זמן זה לוקח?", "כ-10 דקות. התשובות נשמרות תוך כדי, אז אפשר לעצור ולהמשיך."],
            ["למה גם שאלות אישיות?", "כי העסק הוא כלי. אם הוא מרוויח והבית לא נשאר עם כלום, משהו לא עובד. החלק האישי בודק את הבית, המשכנתא, הנדל״ן והפרישה."],
            ["מה אם אני לא יודע תשובה?", "אין תשובה נכונה או לא נכונה. ואם נתקעת, מגיעה לך רבע שעה עם יועץ מומחה."],
            ["מה עושים עם התוכנית?", "מקבלים אותה בקישור אישי, עם PDF להורדה. יועץ מהצוות יחזור אליך כדי לעבור עליה ולהראות איך מיישמים."],
          ].map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </div>
      </section>

      <section className="lp-final">
        <h2>2027 מתחילה עכשיו.</h2>
        <Link href={GO} className="cx-cta lp-cta"><span>לצ׳קאפ העסקי שלי</span><b aria-hidden>←</b></Link>
      </section>

      <div className="lp-sticky"><Link href={GO} className="cx-cta"><span>לצ׳קאפ במתנה</span><b aria-hidden>←</b></Link></div>
    </div>
  );
}

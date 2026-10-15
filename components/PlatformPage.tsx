"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Spotlight from "./Spotlight";
import NirPose from "./NirPose";
import Icon from "./Icon";
import { Brand, GroupLogo } from "./BrandBar";
import { useReveal } from "./useReveal";
import { LIBRARY } from "@/lib/courses";
import { PLANS, WORKSHOPS, REGULAR_MONTHLY } from "@/lib/plans";
import { PLATFORM_NAME, WHY, READS, OUTPUTS, VERTICALS, ACTIVE_CHECKS, MODES, PERSONAS, SHABBAT_NOTE } from "@/lib/platform";
import { DISCLAIMER_LONG } from "@/lib/disclaimer";

const WORKSHOP_D: Record<string, string> = {
  "פשוט למכור יותר": "סדנת המכירות של ניר: מהשיחה הראשונה ועד הסגירה, בכיתה, עם תרגול חי.",
  "מקסימום שיווק": "איך מביאים לקוחות בלי לשרוף כסף: מסרים, משפכים וקמפיינים שעובדים.",
  "פשוט להיות אלפא בעסקים": "השיטה המלאה של ניר, מול ניר: אסטרטגיה, מבנה ומפת האלפא.",
  "ניהול וצמיחה": "צוות, תהליכים וניהול שמאפשרים לעסק לגדול בלי שהכל ייפול עליך.",
};

export default function PlatformPage({ signedIn }: { signedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  useReveal();
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const courses = LIBRARY.filter((c) => c.kind === "course" && !c.bonus);
  const bonus = LIBRARY.find((c) => c.bonus);
  const books = LIBRARY.filter((c) => c.kind === "book" && c.id !== 48020);
  const cta = signedIn ? { href: "/plans", label: "לבחירת מסלול" } : { href: "/#signup", label: "להתחיל 30 יום במתנה" };

  return (
    <>
      <Spotlight />
      <div className="page">
        <nav className={`topnav ${scrolled ? "scrolled" : ""}`}>
          <div className="topnav-in">
            <Brand />
            <div className="topnav-links">
              <a href="#why">למה עכשיו</a>
              <a href="#active">אקטיבית</a>
              <a href="#hybrid">היברידית</a>
              <a href="#courses">הקורסים</a>
              <a href="#join">איך מצטרפים</a>
            </div>
            <div className="topnav-end">
              <GroupLogo className="group-logo nav-logo" />
              {signedIn ? <Link className="btn btn-primary btn-sm" href="/chat">לפלטפורמה</Link> : <Link className="btn btn-primary btn-sm" href="/#signup">הרשמה חינם</Link>}
            </div>
          </div>
        </nav>

        {/* ---------- hero ---------- */}
        <header className="wrap plat-hero">
          <div className="plat-hero-copy">
            <span className="badge"><span className="dot-live" /> ניר דובדבני מציג</span>
            <h1 className="h-display">{PLATFORM_NAME.split(" ").slice(0, 1).join(" ")} <span className="gold">{PLATFORM_NAME.split(" ").slice(1).join(" ")}</span></h1>
            <p className="lead">פלטפורמה היברידית ומודרנית, מותאמת לעולם החדש ולקהל החדש, שמשנה את הדרך שבה עולם הייעוץ העסקי עובד. היא יושבת על שיטת האלפא של ניר דובדבני: 22 שנה של ליווי עסקים ויותר מ-23,000 עסקים.</p>
            <p className="lead plat-lead-2">פחות מלמדת. יותר מבצעת.</p>
            <div className="hero-mcta">
              <Link className="btn btn-primary btn-lg" href={cta.href}>{cta.label} <Icon name="arrow" size={18} className="ico-move" /></Link>
              <a className="btn btn-glass btn-lg" href="#why">מה מקבלים</a>
            </div>
            <div className="hero-proof">
              <div><b>22</b><span>שנות ליווי עסקים</span></div>
              <div><b>23,000+</b><span>עסקים עברו את השיטה</span></div>
              <div><b>24/6</b><span>בשבת נחים</span></div>
            </div>
          </div>
          <div className="plat-hero-nir"><NirPose pose="welcome" width={360} eager /></div>
        </header>

        {/* ---------- why now ---------- */}
        <section className="section" id="why">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="eyebrow">למה עכשיו</span>
              <h2 className="h-display">איך מצליחים היום <span className="gold">בעולם העסקים.</span></h2>
            </div>
            <div className="steps3">
              {WHY.map((w, i) => (
                <div className="step3 reveal" key={w.t} style={{ transitionDelay: `${i * 80}ms` }}>
                  <span className="step3-n">0{i + 1}</span>
                  <h4>{w.t}</h4>
                  <p>{w.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- what it does ---------- */}
        <section className="section" id="what">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="eyebrow">מה הפלטפורמה עושה</span>
              <h2 className="h-display">ממצה את הפוטנציאל <span className="gold">שכבר קיים בך ובעסק.</span></h2>
              <p className="lead">היא מייצרת ניתוח מקסימלי לפי שיטה סדורה, ושופכת אותו לתוצרים שאפשר לעבוד איתם מחר בבוקר. ידע פרקטי, לפי רמת היכולות שלך, ולא רק תיאוריה.</p>
            </div>
            <div className="plat-flow glass edge reveal">
              <div>
                <span className="eyebrow">מה היא קוראת</span>
                <ul>{READS.map((r) => <li key={r}><Icon name="eye" size={16} /> {r}</li>)}</ul>
              </div>
              <Icon name="arrowLeft" size={28} className="plat-flow-arrow" />
              <div>
                <span className="eyebrow">מה יוצא לך</span>
                <ul>{OUTPUTS.map((o) => <li key={o}><Icon name="check" size={16} /> {o}</li>)}</ul>
              </div>
            </div>
            <div className="feat-grid plat-verticals">
              {VERTICALS.map((v, i) => (
                <div key={v.t} className="feat reveal" style={{ transitionDelay: `${(i % 4) * 70}ms` }}>
                  <span className="feat-ico"><Icon name={v.icon} size={22} /></span>
                  <span className="feat-body"><b>{v.t}</b><span>{v.d}</span></span>
                </div>
              ))}
            </div>
            <p className="plat-note reveal">עובדים על כל הוורטיקלים האלה במקביל. הפלטפורמה חוסכת לך שעות עבודה, ועושה את זה מהר ומתוכנן.</p>
          </div>
        </section>

        {/* ---------- active, not passive ---------- */}
        <section className="section" id="active">
          <div className="wrap plat-split">
            <div className="reveal">
              <span className="eyebrow">אקטיבית, לא פסיבית</span>
              <h2 className="h-display">אנחנו לא מחכים <span className="gold">שתיזכר.</span></h2>
              <p className="lead">הפלטפורמה עובדת בשיטה שאומרת: לא סומכים על זה שתבצע לבד. לכן היא דוחפת אותך, בהודעות פוש, בדיוק כשצריך.</p>
              <ul className="plat-checks">
                {ACTIVE_CHECKS.map((c) => <li key={c}><Icon name="check" size={18} /> {c}</li>)}
              </ul>
              <p className="plat-note">בונים איתך יעדים, והיעד משתנה ומתאים את עצמו לפעולות שלך.</p>
            </div>
            <div className="plat-push reveal">
              <span className="plat-push-time">יום ראשון · 07:42</span>
              <div className="plat-push-card glass edge">
                <b>ניר דובדבני</b>
                <p>בוקר טוב. ראיתי שהשבוע התחלנו את תוכנית השיווק. העלית כבר סטורי היום? שלוש דקות, ואתה בתוך היעד של השבוע.</p>
              </div>
              <small>דמיין שקמת ביום ראשון בבוקר בלי אנרגיה, ובדיוק אז מגיעה ההודעה הזאת.</small>
            </div>
          </div>
        </section>

        {/* ---------- hybrid: workshops + zoom ---------- */}
        <section className="section" id="hybrid">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="eyebrow">היברידית</span>
              <h2 className="h-display">דיגיטל ביום-יום. <span className="gold">ניר בכיתה.</span></h2>
              <p className="lead">פעם ברבעון נפגשים פיזית, כל פעם על נושא אחר. מעבר לנטוורקינג והקהילה, אפשר לשאול את ניר כל שאלה בכיתה, וניר מנתח איתך את העסק לפי מנועי הצמיחה ומפת האלפא.</p>
            </div>
            <div className="plat-ws">
              {WORKSHOPS.map((w, i) => (
                <div key={w} className="step3 reveal" style={{ transitionDelay: `${i * 70}ms` }}>
                  <span className="step3-n">Q{i + 1}</span>
                  <h4>סדנת {w}</h4>
                  <p>{WORKSHOP_D[w] ?? ""}</p>
                </div>
              ))}
            </div>
            <div className="plat-zoom glass edge reveal">
              <div>
                <span className="eyebrow">וכל חודש</span>
                <h3 className="h-display">פגישה אסטרטגית בזום עם ניר</h3>
                <p>מנועי צמיחה, ואחר כך שאלות ותשובות. הדבר המיוחד: שולחים לניר את השאלה שלך 24 שעות לפני, וניר עונה עליה ספציפית בזום.</p>
              </div>
              <Icon name="calendar" size={44} className="gold-ico" />
            </div>
          </div>
        </section>

        {/* ---------- five modes ---------- */}
        <section className="section">
          <div className="wrap">
            <div className="sec-head center reveal">
              <span className="eyebrow">בשורה שלא הייתה</span>
              <h2 className="h-display">אחד על אחד. אישי. קבוצתי. <span className="gold">היברידי. מערכתי.</span></h2>
            </div>
            <div className="plat-modes">
              {MODES.map((m) => (
                <div key={m.t} className="plat-mode reveal"><b>{m.t}</b><span>{m.d}</span></div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- courses ---------- */}
        <section className="section" id="courses">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="eyebrow">קורסים דיגיטליים</span>
              <h2 className="h-display">כל הקורסים של ניר. <span className="gold">נפתחים מיד.</span></h2>
              <p className="lead">עם ההצטרפות כל הקורסים והספרים נפתחים לך במערכת הקורסים. ממליצים להתחיל במכירות, כי זה הכסף הכי קרוב אליך.</p>
            </div>
            <div className="plat-courses">
              {courses.map((c, i) => (
                <details key={c.id} className="plat-course reveal">
                  <summary>
                    <span className="crs-num num">{String(i + 1).padStart(2, "0")}</span>
                    <span className="plat-course-h"><b>{c.title}</b><small>{c.tag}</small></span>
                    <Icon name="chevron" size={18} />
                  </summary>
                  <p>{c.about}</p>
                  {c.learn && <ul>{c.learn.map((l) => <li key={l}><Icon name="check" size={14} /> {l}</li>)}</ul>}
                  {c.forWho && <p className="crs-who"><b>למי זה מתאים:</b> {c.forWho}</p>}
                </details>
              ))}
            </div>
            {bonus && (
              <div className="plat-bonus glass edge reveal">
                <span className="badge">בונוס</span>
                <b>{bonus.title}</b>
                <p>{bonus.about}</p>
              </div>
            )}
            <div className="plat-books reveal">
              <span className="eyebrow">ועוד 4 רבי המכר של ניר, בדיגיטל</span>
              <div>{books.map((b) => <span key={b.id} className="plat-book"><b>{b.title}</b><small>{b.blurb}</small></span>)}</div>
            </div>
          </div>
        </section>

        {/* ---------- personas / plans ---------- */}
        <section className="section">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="eyebrow">איזה סוג אתה?</span>
              <h2 className="h-display">יש מסלול <span className="gold">לכל אחד.</span></h2>
              <p className="lead">מחיר רגיל ₪{REGULAR_MONTHLY} לחודש. בהשקה, מנוי שנתי מ-₪229 לחודש (לפני מע״מ).</p>
            </div>
            <div className="plat-personas">
              {PLANS.map((p) => (
                <div key={p.id} className="plat-persona reveal">
                  <small>{PERSONAS[p.id]}</small>
                  <b>{p.name}</b>
                  <span>{p.tagline}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- join ---------- */}
        <section className="section" id="join">
          <div className="wrap">
            <div className="sec-head center reveal">
              <span className="eyebrow">איך מצטרפים</span>
              <h2 className="h-display">שלושה צעדים.</h2>
            </div>
            <div className="steps3">
              {[
                ["30 יום במתנה", "נרשמים בחצי דקה, בלי כרטיס אשראי, ומתחילים לעבוד עם ניר הדיגיטלי כבר היום."],
                ["בוחרים מסלול", "מתי שמתאים לך, בתוך חודש המתנה או אחריו. משלמים פעם אחת או ב-12 תשלומים."],
                ["הכל נפתח מיד", "הקורסים, הספרים והכלים נפתחים תוך דקות, ואתה מוזמן לזום ולסדנה הקרובים."],
              ].map(([t, d], i) => (
                <div className="step3 reveal" key={t} style={{ transitionDelay: `${i * 80}ms` }}>
                  <span className="step3-n">0{i + 1}</span>
                  <h4>{t}</h4>
                  <p>{d}</p>
                </div>
              ))}
            </div>
            <div className="plat-final reveal">
              <Link className="btn btn-primary btn-lg" href={cta.href}>{cta.label} <Icon name="arrow" size={18} className="ico-move" /></Link>
              <small>{SHABBAT_NOTE}</small>
            </div>
          </div>
        </section>

        <div className="wrap">
          <footer className="footer">
            <div className="footer-brand"><GroupLogo /><span>© {new Date().getFullYear()} קבוצת דובדבני (RND)</span></div>
            <nav><Link href="/">דף הבית</Link><a href="/terms">תנאי שימוש</a><a href="/privacy">מדיניות פרטיות</a></nav>
            <small style={{ width: "100%", fontSize: 12.5, lineHeight: 1.6 }}>{DISCLAIMER_LONG}</small>
          </footer>
        </div>
      </div>
    </>
  );
}

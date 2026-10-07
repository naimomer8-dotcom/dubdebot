"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Mascot from "./Mascot";
import { Brand, GroupLogo } from "./BrandBar";
import Spotlight from "./Spotlight";
import Radar from "./Radar";
import { QUESTIONS } from "@/lib/xray";
import RegisterForm from "./RegisterForm";
import NirPhoto from "./NirPhoto";
import Icon, { IconName } from "./Icon";
import { useReveal } from "./useReveal";

const SAMPLE = { strategy: 62, marketing: 38, sales: 71, pricing: 29, systems: 45, money: 54 };

const FEATURES: { id: string; icon: IconName; title: string; desc: string }[] = [
  { id: "scan", icon: "radar", title: "סריקת רשתות", desc: "מדביקים קישור לאינסטגרם, פייסבוק או טיקטוק – ומקבלים איפה אתה נכשל שיווקית." },
  { id: "forecast", icon: "chart", title: "סטודיו תחזית", desc: "מזיזים מספרים ורואים את העסק שנה קדימה. הכנסות, רווח ונקודת איזון." },
  { id: "workplan", icon: "map", title: "תוכנית עבודה", desc: "מצב A, מצב B, וטבלת ביצוע של מה עושים ביום ראשון." },
  { id: "sales_script", icon: "target", title: "תסריט מכירה", desc: "שיחה שסוגרת, עם מענה מוכן להתנגדויות הנפוצות." },
  { id: "call", icon: "phone", title: "שיחה קולית ומסמכים", desc: "מדברים עם הדובדבן כמו בטלפון, או שולחים לו דוח ואקסל לניתוח." },
  { id: "vault", icon: "vault", title: "התיק העסקי", desc: "כל התוכניות והמשימות שלך במקום אחד, עם מסלול התקדמות." },
];

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  useReveal();

  useEffect(() => {
    const on = () => {
      setScrolled(window.scrollY > 12);
      const form = document.getElementById("signup");
      const r = form?.getBoundingClientRect();
      const formVisible = r ? r.bottom > 0 && r.top < window.innerHeight : false;
      setShowSticky(!formVisible && window.scrollY > 300);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const goSignup = (tool?: string) => {
    try {
      if (tool) sessionStorage.setItem("dd_tool", tool);
    } catch {}
    window.dispatchEvent(new Event("dd:carried"));
    document.getElementById("signup")?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => document.getElementById("fullName")?.focus({ preventScroll: true }), 600);
  };

  return (
    <>
      <Spotlight />
      <div className="page">
        <nav className={`topnav ${scrolled ? "scrolled" : ""}`}>
          <div className="topnav-in">
            <Brand />
            <div className="topnav-links">
              <a href="#xray">רנטגן עסקי</a>
              <a href="#inside">מה בפנים</a>
              <a href="#how">איך זה עובד</a>
            </div>
            <div className="topnav-end">
              <GroupLogo className="group-logo nav-logo" />
              <Link className="btn btn-ghost btn-sm" href="/login">כניסה</Link>
              <button className="btn btn-primary btn-sm" onClick={() => goSignup()}>הרשמה חינם</button>
            </div>
          </div>
        </nav>

        {/* ---------- hero: promise + signup ---------- */}
        <header className="wrap hero">
          <div className="hero-copy">
            <span className="badge"><span className="dot-live" /> יועץ AI מבית קבוצת דובדבני</span>
            <h1 className="h-display">
              <span className="line"><span>יועץ עסקי</span></span>
              <span className="line"><span className="gold">בכיס.</span></span>
            </h1>
            <p className="lead">22 שנה של ליווי עסקים והשיטה המלאה של ניר דובדבני – בתוך יועץ אחד שמכיר את העסק שלך, בונה איתך תוכניות ומדבר איתך תכלס.</p>
            <ul className="hero-points">
              <li><Icon name="check" size={18} /> מבוסס על 4 הספרים והשיטה של ניר</li>
              <li><Icon name="check" size={18} /> תוצרים אמיתיים: תחזית, תוכנית, תסריט</li>
              <li><Icon name="check" size={18} /> חינם. בלי כרטיס אשראי</li>
            </ul>
            <div className="hero-proof">
              <div><b>22</b><span>שנות ליווי</span></div>
              <div><b>4</b><span>ספרים</span></div>
              <div><b>24/7</b><span>זמין תמיד</span></div>
            </div>
          </div>
          <div className="hero-form" id="signup">
            <div className="hero-form-mascot"><Mascot size={96} /></div>
            <RegisterForm />
          </div>
        </header>

        {/* ---------- business x-ray (open to all) ---------- */}
        <section className="section" id="xray">
          <div className="wrap">
            <div className="xr-teaser glass edge reveal">
              <div className="xr-teaser-copy">
                <span className="eyebrow">רנטגן עסקי · 3 דקות · בלי הרשמה</span>
                <h2 className="h-display">איפה העסק שלך <span className="gold">דולף כסף?</span></h2>
                <p className="lead">12 השאלות שניר שואל בפגישה הראשונה. בסוף מקבלים ציון על שישה צירים, פרופיל עסקי ואת צוואר הבקבוק הכי מסוכן.</p>
                <div className="xr-first">
                  <b>שאלה 1 מתוך 12: {QUESTIONS[0].q}</b>
                  <div className="xr-opts">
                    {QUESTIONS[0].options.map((o, i) => (
                      <a key={i} className="xr-opt" href={`/xray?q1=${i}`}>
                        <kbd>{i + 1}</kbd>
                        <span>{o}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
              <div className="xr-teaser-visual">
                <Radar scores={SAMPLE} />
                <span className="badge" style={{ position: "absolute", top: 24, insetInlineEnd: 24 }}>דוגמה לתוצאה</span>
              </div>
            </div>
          </div>
        </section>

        {/* ---------- what's inside (members only) ---------- */}
        <section className="section" id="inside">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="eyebrow">מה מחכה לך בפנים</span>
              <h2 className="h-display">כל מה שקורה בפגישה עם ניר. <span className="gold">מתי שצריך.</span></h2>
            </div>
            <div className="feat-grid">
              {FEATURES.map((f, i) => (
                <button key={f.id} className="feat reveal" style={{ transitionDelay: `${(i % 3) * 70}ms` }} onClick={() => goSignup(f.id)}>
                  <span className="feat-ico"><Icon name={f.icon} size={22} /></span>
                  <span className="feat-body">
                    <b>{f.title}</b>
                    <span>{f.desc}</span>
                  </span>
                  <span className="feat-lock"><Icon name="lock" size={14} /> לחברים</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- how it works ---------- */}
        <section className="section" id="how">
          <div className="wrap">
            <div className="sec-head center reveal">
              <span className="eyebrow">איך זה עובד</span>
              <h2 className="h-display">שלושה צעדים. <span className="gold">בלי בולשיט.</span></h2>
            </div>
            <div className="steps3">
              {[
                ["נרשמים בחצי דקה", "שם, נייד, מייל וסיסמה. מעכשיו נכנסים מכל מכשיר."],
                ["מספרים על העסק", "בכתב, בקול, או שולחים דוח. דובדבוט לומד את העסק וזוכר אותו."],
                ["מקבלים תוצר, ומתקדמים", "תחזית, תוכנית ותסריט – נשמרים בתיק העסקי עם משימות לביצוע."],
              ].map(([t, d], i) => (
                <div className="step3 reveal" key={t} style={{ transitionDelay: `${i * 80}ms` }}>
                  <span className="step3-n">0{i + 1}</span>
                  <h4>{t}</h4>
                  <p>{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- vision + final CTA ---------- */}
        <section className="section vision-sec">
          <div className="wrap">
            <div className="vision reveal">
              <div className="vision-photo"><NirPhoto size={132} /><Mascot size={72} mood="wink" track={false} /></div>
              <blockquote className="h-display">״החזון שלי: שלא יהיה עסק בישראל <span className="gold">שאין לו דובדבוט.</span>״</blockquote>
              <cite>ניר דובדבני · מייסד קבוצת דובדבני</cite>
              <button className="btn btn-primary btn-lg" onClick={() => goSignup()}>לפתוח את דובדבוט בחינם <Icon name="arrow" size={18} className="ico-move" /></button>
            </div>
          </div>
        </section>

        <div className="wrap">
          <footer className="footer">
            <div className="footer-brand">
              <GroupLogo />
              <span>© {new Date().getFullYear()} קבוצת דובדבני (RND)</span>
            </div>
            <nav>
              <a href="/login">כניסה</a>
              <a href="/terms">תנאי שימוש</a>
              <a href="/privacy">מדיניות פרטיות</a>
              <a href="/privacy#unsubscribe">הסרה מדיוור</a>
            </nav>
          </footer>
        </div>

        {showSticky && (
          <button className="btn btn-primary mobile-cta" onClick={() => goSignup()}>
            הרשמה חינם <Icon name="arrow" size={18} />
          </button>
        )}
      </div>
    </>
  );
}

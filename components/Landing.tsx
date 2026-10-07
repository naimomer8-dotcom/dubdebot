"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Mascot from "./Mascot";
import { Brand, GroupLogo } from "./BrandBar";
import Spotlight from "./Spotlight";
import HeroDevice from "./HeroDevice";
import ForecastStudio from "./ForecastStudio";
import RegisterForm from "./RegisterForm";
import Radar from "./Radar";
import Icon, { IconName } from "./Icon";
import { useReveal } from "./useReveal";
import { ForecastInput } from "@/lib/forecast";

const SAMPLE = { strategy: 62, marketing: 38, sales: 71, pricing: 29, systems: 45, money: 54 };

const TILES: { id: string; icon: IconName; title: string; desc: string; cls: string; tag?: string }[] = [
  { id: "xray", icon: "scan", title: "רנטגן עסקי", desc: "12 שאלות, 3 דקות. ציון על שישה צירים, פרופיל עסקי ותוכנית 30 יום. כמו פגישת אבחון עם ניר, רק עכשיו.", cls: "w4 feature", tag: "חדש" },
  { id: "call", icon: "phone", title: "שיחה קולית", desc: "מדברים עם הדובדבן כמו בטלפון. בלי להקליד.", cls: "w2", tag: "חדש" },
  { id: "forecast", icon: "chart", title: "תחזית ל-12 חודש", desc: "הכנסות, הוצאות, רווח ונקודת איזון.", cls: "w2" },
  { id: "workplan", icon: "map", title: "תוכנית עבודה", desc: "מצב A, מצב B, ומה עושים ביום ראשון.", cls: "w2" },
  { id: "sales_script", icon: "target", title: "תסריט מכירה", desc: "שיחה שסוגרת, לפי מודל הכוכב.", cls: "w2" },
  { id: "upload", icon: "clip", title: "שולחים מסמך, מקבלים ניתוח", desc: "דוח רווח והפסד, אקסל מחירים, צילום של הצעת מחיר. דובדבוט קורא ומפרק.", cls: "w3" },
  { id: "vault", icon: "vault", title: "התיק העסקי שלי", desc: "כל התוכניות, המשימות והציונים שלך – במקום אחד, עם מסלול התקדמות.", cls: "w3" },
  { id: "feasibility", icon: "flask", title: "בדיקת היתכנות", desc: "לפני ששמים שקל על רעיון חדש.", cls: "w3" },
  { id: "objections", icon: "shield", title: "מאמן התנגדויות", desc: "דובדבוט משחק לקוח קשה. אתה מתאמן עד שזה יושב.", cls: "w3" },
];

const MARQUEE = ["22 שנות ליווי עסקים", "4 ספרים", "מנחה ״עסקים עכשיו״ בערוץ 14", "PRO 18", "האקדמיה להשקעות", "מפת אלפא", "מודל הכוכב", "87% מהלקוחות קיבלו ידע פרקטי לשינוי*"];

export default function Landing({ loggedIn }: { loggedIn: boolean }) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
  useReveal();

  useEffect(() => {
    const on = () => {
      setScrolled(window.scrollY > 20);
      const signup = document.getElementById("signup");
      const inSignup = signup ? signup.getBoundingClientRect().top < window.innerHeight * 0.85 : false;
      setShowSticky(window.scrollY > window.innerHeight * 0.8 && !inSignup);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const goSignup = () => {
    if (loggedIn) router.push("/chat");
    else document.getElementById("signup")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const carryForecast = (inp: ForecastInput) => {
    try {
      sessionStorage.setItem("dd_forecast", JSON.stringify(inp));
    } catch {}
    window.dispatchEvent(new Event("dd:carried"));
    goSignup();
  };
  const openTile = (id: string) => {
    if (id === "xray") return router.push("/xray");
    if (loggedIn) return router.push(id === "vault" ? "/vault" : `/chat?tool=${id}`);
    try {
      sessionStorage.setItem("dd_tool", id);
    } catch {}
    goSignup();
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
              <a href="#studio">סטודיו תחזית</a>
              <a href="#tools">כלים</a>
              <a href="#how">איך זה עובד</a>
            </div>
            <div className="topnav-end">
              <GroupLogo />
              {!loggedIn && <Link className="btn btn-ghost btn-sm nav-login" href="/login">כניסה</Link>}
              <button className="btn btn-primary btn-sm" onClick={goSignup}>
                {loggedIn ? "לשיחה שלי" : "הרשמה חינם"}
              </button>
            </div>
          </div>
        </nav>

        <div className="wrap">
          <header className="hero">
            <div>
              <span className="badge"><span className="dot-live" /> היועץ העסקי של ניר דובדבני, זמין 24/7</span>
              <h1 className="h-display" style={{ marginTop: 26 }}>
                <span className="line"><span>יועץ עסקי.</span></span>
                <span className="line"><span className="gold">בכיס.</span></span>
              </h1>
              <p className="lead">
                22 שנה של ליווי עסקים, ארבעה ספרים והשיטה המלאה של ניר דובדבני – בתוך יועץ אחד שמכיר את העסק שלך,
                בונה איתך תוכניות ומדבר איתך תכלס. בחינם.
              </p>
              <div className="hero-actions">
                <Link className="btn btn-primary btn-lg" href="/xray">
                  רנטגן לעסק ב-3 דקות <Icon name="arrow" size={18} className="ico-move" />
                </Link>
                <button className="btn btn-glass btn-lg" onClick={goSignup}>
                  {loggedIn ? "חזרה לשיחה" : "לפתוח את דובדבוט"}
                </button>
              </div>
              <div className="hero-proof">
                <div><b>22</b>שנות ליווי</div>
                <span className="sep" />
                <div><b>4</b>ספרים בתוך המוח</div>
                <span className="sep" />
                <div><b>₪0</b>בלי כרטיס אשראי</div>
              </div>
            </div>
            <HeroDevice />
          </header>
        </div>

        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[...MARQUEE, ...MARQUEE].map((m, i) => (
              <span key={i}><i />{m}</span>
            ))}
          </div>
        </div>

        <section className="section" id="xray">
          <div className="wrap">
            <div className="xr-teaser glass edge reveal">
              <div className="xr-teaser-copy">
                <span className="eyebrow">אבחון · 3 דקות</span>
                <h3 className="h-display">איפה העסק שלך <span className="gold">דולף כסף?</span></h3>
                <p className="lead" style={{ margin: 0 }}>
                  12 שאלות שניר שואל בפגישה הראשונה. בסוף מקבלים ציון על שישה צירים, פרופיל עסקי, את הצוואר בקבוק הכי מסוכן – וכרטיס לשתף.
                </p>
                <ul>
                  <li><Icon name="check" size={18} /> בלי הרשמה כדי להתחיל</li>
                  <li><Icon name="check" size={18} /> מבוסס על מפת האלפא של ניר</li>
                  <li><Icon name="check" size={18} /> תוכנית 30 יום מדובדבוט על התוצאה</li>
                </ul>
                <div>
                  <Link className="btn btn-primary" href="/xray">להתחיל רנטגן <Icon name="arrow" size={18} className="ico-move" /></Link>
                </div>
              </div>
              <div className="xr-teaser-visual">
                <Radar scores={SAMPLE} />
                <span className="badge cherry" style={{ position: "absolute", top: 24, insetInlineEnd: 24 }}>דוגמה · ציון 50</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="studio" style={{ paddingTop: 30 }}>
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="eyebrow">סטודיו תחזית</span>
              <h2 className="h-display">תזיז מספר. <span className="gold">תראה את העסק.</span></h2>
              <p className="lead">שש הנחות, שנה קדימה, בלי הרשמה. ככה נראה העסק אם שום דבר לא משתנה – ומה קורה כשמזיזים מנוף אחד.</p>
            </div>
            <div className="reveal">
              <ForecastStudio
                ctaLabel={loggedIn ? "שלח לדובדבוט לניתוח" : "שדובדבוט יפרק לי את זה"}
                ctaNote="התחזית עוברת איתך לשיחה."
                onCta={carryForecast}
              />
            </div>
          </div>
        </section>

        <section className="section" id="tools">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="eyebrow">ארגז הכלים</span>
              <h2 className="h-display">מה שקורה בפגישה עם ניר. <span className="gold">מתי שצריך.</span></h2>
            </div>
            <div className="bento">
              {TILES.map((t, i) => (
                <button
                  key={t.id}
                  className={`tile reveal ${t.cls}`}
                  style={{ transitionDelay: `${(i % 3) * 60}ms` }}
                  onClick={() => openTile(t.id)}
                  onPointerMove={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.setProperty("--tx", `${e.clientX - r.left}px`);
                    e.currentTarget.style.setProperty("--ty", `${e.clientY - r.top}px`);
                  }}
                >
                  <span className="t-ico"><Icon name={t.icon} size={22} /></span>
                  {t.tag && <span className="badge cherry tag">{t.tag}</span>}
                  <Icon name="arrow" size={20} className="t-go" />
                  <h4>{t.title}</h4>
                  <p>{t.desc}</p>
                  {t.id === "xray" && (
                    <div style={{ position: "absolute", left: -30, bottom: -50, width: 260, opacity: 0.55, pointerEvents: "none" }}>
                      <Radar scores={SAMPLE} labels={false} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="section" id="how" style={{ paddingTop: 40 }}>
          <div className="wrap">
            <div className="sec-head center reveal">
              <span className="eyebrow">איך זה עובד</span>
              <h2 className="h-display">שלושה צעדים. <span className="gold">בלי בולשיט.</span></h2>
            </div>
            <div className="steps3">
              <div className="step3 reveal">
                <h4>מספרים לו על העסק</h4>
                <p>בכתב, בקול, או שולחים לו דוח ואקסל. דובדבוט לומד את העסק שלך וזוכר אותו.</p>
              </div>
              <div className="step3 reveal" style={{ transitionDelay: "80ms" }}>
                <h4>מקבלים תוצר אמיתי</h4>
                <p>תחזית, תוכנית עבודה, תסריט מכירה. לא עצות כלליות – מסמכים שעובדים איתם מחר בבוקר.</p>
              </div>
              <div className="step3 reveal" style={{ transitionDelay: "160ms" }}>
                <h4>מתקדמים, ונמדדים</h4>
                <p>הכל נשמר בתיק העסקי שלך, עם משימות ומסלול. וכשצריך – יושבים עם ניר או עם אחד היועצים.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="signup">
          <div className="wrap">
            <div className="signup">
              <div className="vision reveal">
                <span className="eyebrow">החזון</span>
                <blockquote>״שלא יהיה עסק בישראל <span className="gold">שאין לו דובדבוט.</span>״</blockquote>
                <cite>
                  <Mascot size={52} />
                  <span><b>ניר דובדבני</b><small>מייסד קבוצת דובדבני</small></span>
                </cite>
              </div>
              <div className="reveal">
                {loggedIn ? (
                  <div className="stepper glass edge" style={{ textAlign: "center" }}>
                    <Mascot size={110} mood="wink" />
                    <h3 className="step-title" style={{ marginTop: 14 }}>ברוך שובך</h3>
                    <p className="step-sub" style={{ marginBottom: 22 }}>דובדבוט זוכר את העסק שלך. ממשיכים מאיפה שעצרנו.</p>
                    <Link className="btn btn-primary" href="/chat">חזרה לשיחה</Link>
                  </div>
                ) : (
                  <RegisterForm />
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="wrap">
          <footer className="footer">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <GroupLogo />
              <span>© {new Date().getFullYear()} קבוצת דובדבני (RND)</span>
            </div>
            <nav>
              <a href="/terms">תנאי שימוש</a>
              <a href="/privacy">מדיניות פרטיות</a>
              <a href="/privacy#unsubscribe">הסרה מדיוור</a>
            </nav>
            <small style={{ width: "100%", fontSize: 11.5 }}>* סקר שביעות רצון לקוחות, מכון מדגם. דובדבוט הוא כלי AI לכיוון עסקי ואינו תחליף לייעוץ מקצועי.</small>
          </footer>
        </div>
        {!loggedIn && showSticky && (
          <Link className="btn btn-primary mobile-cta" href="/xray">
            רנטגן לעסק ב-3 דקות <Icon name="arrow" size={18} />
          </Link>
        )}
      </div>
    </>
  );
}

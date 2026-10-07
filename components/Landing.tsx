"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Mascot from "./Mascot";
import { GroupLogo } from "./BrandBar";
import Spotlight from "./Spotlight";
import Rotator from "./Rotator";
import HeroStage from "./HeroStage";
import ForecastStudio from "./ForecastStudio";
import ToolExplorer from "./ToolExplorer";
import RegisterForm from "./RegisterForm";
import { ForecastInput } from "@/lib/forecast";

export default function Landing({ loggedIn }: { loggedIn: boolean }) {
  const router = useRouter();
  const [showSticky, setShowSticky] = useState(false);
  useEffect(() => {
    const on = () => {
      const signup = document.getElementById("signup");
      const inSignup = signup ? signup.getBoundingClientRect().top < window.innerHeight * 0.8 : false;
      setShowSticky(window.scrollY > window.innerHeight * 0.9 && !inSignup);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const goSignup = () => {
    if (loggedIn) router.push("/chat");
    else document.getElementById("signup")?.scrollIntoView({ behavior: "smooth" });
  };
  const carryForecast = (inp: ForecastInput) => {
    try {
      sessionStorage.setItem("dd_forecast", JSON.stringify(inp));
    } catch {}
    window.dispatchEvent(new Event("dd:carried"));
    goSignup();
  };

  return (
    <>
      <Spotlight />
      <div className="page">
        <div className="wrap">
          <nav className="nav">
            <Link href="/" className="nav-brand" aria-label="דובדבוט">
              <Mascot size={46} />
              <b className="gold">דובדבוט</b>
            </Link>
            <GroupLogo />
          </nav>

          <header className="hero">
            <div>
              <h1 className="hero-title">
                <span className="l1">יועץ עסקי</span>
                <span className="l2 gold">בכיס.</span>
              </h1>
              <Rotator />
              <p className="hero-sub">
                22 שנה של ליווי עסקים, ארבעה ספרים ומאות שעות וידאו של ניר דובדבני – בתוך יועץ אחד שזמין לך עכשיו, בחינם.
              </p>
              <div className="hero-actions">
                <button className="btn btn-gold" onClick={goSignup}>{loggedIn ? "חזרה לשיחה" : "פתח את דובדבוט בחינם"}</button>
                <a className="btn btn-line" href="#studio">קודם לשחק עם המספרים</a>
              </div>
            </div>
            <HeroStage />
          </header>
        </div>

        <section className="section" id="studio">
          <div className="wrap">
            <div className="section-head">
              <h2>תזיז את המספרים. תראה את העסק.</h2>
              <p>שש הנחות, שנה שלמה קדימה. בלי הרשמה. ככה נראה העסק שלך אם שום דבר לא משתנה – ומה קורה כשמזיזים מנוף אחד.</p>
            </div>
            <ForecastStudio
              ctaLabel={loggedIn ? "שלח לדובדבוט לניתוח" : "שדובדבוט יפרק לי את זה"}
              ctaNote="התחזית נשמרת ונפתחת אצלך בשיחה."
              onCta={carryForecast}
            />
          </div>
        </section>

        <section className="section" id="tools">
          <div className="wrap">
            <div className="section-head">
              <h2>חמישה כלים. שיטה אחת.</h2>
              <p>מה שקורה בפגישת ייעוץ עם ניר, מפורק לכלים שעובדים בשבילך מתי שצריך. בחר כלי ותראה איך נראית תשובה.</p>
            </div>
            <ToolExplorer onStart={goSignup} />
          </div>
        </section>

        <section className="section" id="signup">
          <div className="wrap">
            <div className="signup">
              <div className="signup-visual">
                <blockquote>
                  ״החזון שלי: שלא יהיה עסק בישראל <span className="gold">שאין לו דובדבוט.</span>״
                </blockquote>
                <cite>ניר דובדבני</cite>
              </div>
              {loggedIn ? (
                <div className="stepper" style={{ textAlign: "center" }}>
                  <Mascot size={110} mood="wink" />
                  <h3 className="step-title">ברוך שובך</h3>
                  <p className="step-sub">דובדבוט זוכר את העסק שלך. ממשיכים מאיפה שעצרנו.</p>
                  <Link className="btn btn-gold" href="/chat">חזרה לשיחה</Link>
                </div>
              ) : (
                <RegisterForm />
              )}
            </div>
          </div>
        </section>

        <div className="wrap">
          <footer className="footer">
            <span>© {new Date().getFullYear()} קבוצת דובדבני (RND)</span>
            <span>
              <a href="/terms">תנאי שימוש</a> | <a href="/privacy">מדיניות פרטיות</a> | <a href="/privacy#unsubscribe">הסרה מדיוור</a>
            </span>
          </footer>
        </div>
        {!loggedIn && showSticky && (
          <button className="btn btn-gold mobile-cta" onClick={goSignup}>פתח את דובדבוט בחינם</button>
        )}
      </div>
    </>
  );
}

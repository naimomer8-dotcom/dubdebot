"use client";

import { useEffect, useRef, useState } from "react";
import Mascot from "./Mascot";
import Icon from "./Icon";

type Beat = { who: "u" | "b"; text: string; kpis?: [string, string][] };

const SCRIPT: Beat[] = [
  { who: "u", text: "אני עובד 12 שעות ביום, המחזור 80 אלף בחודש, ונשאר לי בקושי משכורת." },
  { who: "b", text: "אז בוא נדבר תכלס. הבעיה שלך היא לא שעות. היא תמחור. אתה מוכר זמן במקום תוצאה." },
  { who: "b", text: "עשיתי לך חישוב מהיר: העלאת מחיר של 12% על אותו מחזור →", kpis: [["רווח שנתי", "+₪115K"], ["שעות", "−0"], ["סיכון", "נמוך"]] },
  { who: "u", text: "ואם לקוחות יעזבו?" },
  { who: "b", text: "חלק יעזבו. אלה בדיוק הלקוחות ששוחקים לך את הזמן. בוא נבנה תסריט להעלאת מחיר שלא מתנצל." },
];

/** Auto-playing chat demo inside a glass device – shows the product in 8 seconds. */
export default function HeroDevice() {
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(SCRIPT.length);
      return;
    }
    const step = () => {
      if (i >= SCRIPT.length) {
        t = setTimeout(() => {
          i = 0;
          setShown(0);
          step();
        }, 6000);
        return;
      }
      const beat = SCRIPT[i];
      if (beat.who === "b") {
        setTyping(true);
        t = setTimeout(() => {
          setTyping(false);
          i++;
          setShown(i);
          t = setTimeout(step, 1500);
        }, 1300);
      } else {
        i++;
        setShown(i);
        t = setTimeout(step, 1100);
      }
    };
    t = setTimeout(step, 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let raf = 0;
    const on = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
        const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
        setTilt({ x: dy * -6, y: dx * 8 });
      });
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => window.removeEventListener("pointermove", on);
  }, []);

  return (
    <div className="hero-stage" ref={ref} style={{ perspective: 1400 }}>
      <div className="device glass edge" style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}>
        <div className="device-glow" />
        <div className="device-top">
          <Mascot size={36} mood={typing ? "thinking" : "idle"} track={false} />
          <div>
            <b>דובדבוט</b>
            <small><span className="dot-live" /> {typing ? "חושב…" : "זמין עכשיו"}</small>
          </div>
        </div>
        <div className="device-body" aria-hidden="true">
          {SCRIPT.slice(0, shown).map((b, i) =>
            b.who === "u" ? (
              <div key={i} className="dm u">{b.text}</div>
            ) : (
              <div key={i} className="dm b">
                <div className="t">
                  {b.text}
                  {b.kpis && (
                    <div className="mini-kpis">
                      {b.kpis.map(([k, v]) => (
                        <span key={k}><b>{v}</b>{k}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          )}
          {typing && (
            <div className="dm b">
              <div className="t"><span className="shimmer">עובר על החומרים של ניר…</span></div>
            </div>
          )}
        </div>
        <div className="device-foot">
          <Icon name="clip" size={18} />
          ספר לי על העסק שלך
          <span className="pill-send"><Icon name="send" size={16} stroke={2} /></span>
        </div>
      </div>
      <div className="float-chip glass" style={{ top: "20%", right: "-34px", animationDelay: "0s, .9s" }}>
        <Icon name="scan" size={18} /> <b>רנטגן עסקי</b> · 3 דק׳
      </div>
      <div className="float-chip glass" style={{ bottom: "-22px", left: "14%", animationDelay: "1.5s, 1.1s" }}>
        <Icon name="phone" size={18} /> <b>שיחה קולית</b> עם ניר
      </div>
      <div className="hero-mascot">
        <Mascot size={130} />
      </div>
    </div>
  );
}

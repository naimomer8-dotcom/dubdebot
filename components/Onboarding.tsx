"use client";

import { useEffect, useState } from "react";
import Icon, { type IconName } from "./Icon";
import NirPose from "./NirPose";
import type { Pose } from "./NirPose";

const KEY = "dd.onboarded.v1";

const STEPS: { pose: Pose; eyebrow: string; title: string; gold: string; text: string; points?: { icon: IconName; b: string; s: string }[] }[] = [
  {
    pose: "welcome",
    eyebrow: "ברוך הבא ל-Duvdevani Platform",
    title: "אני ניר.",
    gold: "30 יום אני זמין לך.",
    text: "כל מה שלמדתי ב-22 שנה של ליווי עסקים, זמין לך 24/6. שואלים אותי כמו שהיית שואל בפגישה, ואני עונה על העסק שלך, לא באופן כללי.",
  },
  {
    pose: "box",
    eyebrow: "מה עושים פה",
    title: "שלושה דברים.",
    gold: "בלי סיבוכים.",
    text: "",
    points: [
      { icon: "chat", b: "לשאול", s: "מחירים, לקוחות, עובדים, שיווק. תשובה ישירה בשפה שלך." },
      { icon: "spark", b: "לבנות", s: "תחזית, תוכנית עבודה, תסריט מכירה. תוצר מוכן שנשמר בתיק." },
      { icon: "scan", b: "לאבחן", s: "רנטגן עסקי, ניתוח דוחות ותלושים, מבחני מכירות." },
    ],
  },
  {
    pose: "point-down",
    eyebrow: "הצעד הראשון",
    title: "3 דקות של רנטגן,",
    gold: "ואני יודע על מה לעבוד.",
    text: "12 שאלות קצרות על העסק. מקבלים ציון על 6 צירים ואת המקום שבו הכסף בורח. משם כל תשובה שלי מדויקת יותר.",
  },
];

export default function Onboarding({ firstName, enabled }: { firstName: string; enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let seen = false;
    try { seen = localStorage.getItem(KEY) === "1"; } catch {}
    if (!seen) setOpen(true);
  }, [enabled]);

  const done = () => {
    try { localStorage.setItem(KEY, "1"); } catch {}
    setOpen(false);
  };
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && done();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  if (!open) return null;

  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  return (
    <div className="ob-wrap">
      <div className="ob" role="dialog" aria-modal="true" aria-labelledby="ob-h">
        <button className="icon-btn ob-x" onClick={done} aria-label="דילוג"><Icon name="close" size={18} /></button>
        <div className="ob-art" key={`a${step}`}><NirPose pose={s.pose} width={190} eager /></div>
        <div className="ob-body" key={`b${step}`}>
          <span className="eyebrow">{step === 0 ? `${firstName} · ${s.eyebrow}` : s.eyebrow}</span>
          <h2 id="ob-h" className="h-display">{s.title} <span className="gold">{s.gold}</span></h2>
          {s.text && <p>{s.text}</p>}
          {s.points && (
            <ul className="ob-points">
              {s.points.map((p) => (
                <li key={p.b}><span className="tl-ico"><Icon name={p.icon} size={18} /></span><span><b>{p.b}</b><small>{p.s}</small></span></li>
              ))}
            </ul>
          )}
        </div>
        <div className="ob-foot">
          <div className="ob-dots" aria-label={`שלב ${step + 1} מתוך ${STEPS.length}`}>
            {STEPS.map((_, i) => <i key={i} className={i === step ? "on" : ""} />)}
          </div>
          <div className="ob-actions">
            {last ? (
              <>
                <button className="btn btn-ghost btn-sm" onClick={done}>אחר כך, בוא נדבר</button>
                <a className="btn btn-primary" href="/xray" onClick={done}>לרנטגן העסקי <Icon name="arrowLeft" size={18} className="ico-move" /></a>
              </>
            ) : (
              <>
                {step > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setStep(step - 1)}>חזרה</button>}
                <button className="btn btn-primary" onClick={() => setStep(step + 1)} autoFocus>המשך <Icon name="arrowLeft" size={18} className="ico-move" /></button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

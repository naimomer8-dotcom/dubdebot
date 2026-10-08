"use client";

import { useState } from "react";
import Icon from "./Icon";
import NirPose from "./NirPose";
import type { Access } from "@/lib/session";

const TIMES = ["בוקר", "צהריים", "ערב", "לא משנה"];

/** "Want to keep consulting with me?" – leaves details for a rep who closes the annual plan. */
export default function RenewalPanel({ access, firstName, phone, compact = false, onDone }: { access: Access; firstName: string; phone: string; compact?: boolean; onDone?: () => void }) {
  const [tel, setTel] = useState(phone);
  const [time, setTime] = useState("לא משנה");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"form" | "sending" | "done">(access.renewalRequestedAt ? "done" : "form");
  const [err, setErr] = useState("");
  const expired = access.status === "expired";
  const paid = access.plan === "paid";

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!/^0?5\d[-\s]?\d{3}[-\s]?\d{4}$/.test(tel.replace(/\s/g, "")) && tel.replace(/\D/g, "").length < 9) return setErr("צריך מספר נייד תקין");
    setErr("");
    setState("sending");
    const r = await fetch("/api/renewal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: tel, preferredTime: time, note }) }).catch(() => null);
    if (!r || !r.ok) {
      setState("form");
      return setErr("משהו השתבש. נסה שוב.");
    }
    setState("done");
    onDone?.();
  }

  const title = expired
    ? paid
      ? "השנה שלנו יחד הסתיימה."
      : "30 הימים במתנה הסתיימו."
    : paid
      ? `נשארו ${access.daysLeft} ימים למנוי שלך.`
      : `נשארו לך ${access.daysLeft} ימים במתנה.`;

  return (
    <div className={`renew ${compact ? "compact" : ""}`}>
      {!compact && <NirPose pose={expired ? "hourglass" : "welcome"} width={190} className="renew-nir" eager />}
      <span className="eyebrow">{paid ? "המנוי השנתי" : "המנוי שלך"}</span>
      <h2 className="h-display">{title} <span className="gold">{paid ? "רוצה להמשיך איתנו?" : "רוצה להמשיך להתייעץ איתי?"}</span></h2>
      {state === "done" ? (
        <div className="renew-done glass edge">
          <Icon name="check" size={22} />
          <div>
            <b>קיבלנו, {firstName}.</b>
            <p>נציג מהצוות שלי יחזור אליך בהקדם עם כל הפרטים על המנוי השנתי. {expired ? "ברגע שהמנוי יוסדר – הכל נפתח לך בחזרה, כולל כל מה ששמרת בתיק." : ""}</p>
            {access.renewalRequestedAt && <small className="muted">הבקשה נשלחה ב-{new Date(access.renewalRequestedAt).toLocaleDateString("he-IL")}</small>}
          </div>
        </div>
      ) : (
        <>
          <p className="lead" style={{ margin: 0 }}>
            {expired
              ? "כל התוכניות, המשימות והשיחות שלך שמורים ומחכים לך. תשאיר פרטים – נציג מהצוות שלי יחזור אליך, יסגור איתך את המנוי השנתי, והגישה נפתחת מיד."
              : "תשאיר פרטים ונציג מהצוות שלי יחזור אליך עם המנוי השנתי – כדי שלא תיעצר באמצע הדרך."}
          </p>
          <form className="renew-form glass edge" onSubmit={send}>
            <div className="field">
              <label htmlFor="rn-tel">נייד</label>
              <input id="rn-tel" value={tel} onChange={(e) => setTel(e.target.value)} inputMode="tel" dir="ltr" autoComplete="tel" />
            </div>
            <div className="field">
              <label>מתי נוח שנחזור אליך?</label>
              <div className="chips">
                {TIMES.map((t) => (
                  <button type="button" key={t} className={`chip ${time === t ? "on" : ""}`} onClick={() => setTime(t)} aria-pressed={time === t}>{t}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="rn-note">משהו שחשוב שנדע? (לא חובה)</label>
              <input id="rn-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={600} placeholder="למשל: רוצה גם פגישה עם ניר" />
            </div>
            {err && <span className="err">{err}</span>}
            <button className="btn btn-primary btn-lg" disabled={state === "sending"} type="submit">
              {state === "sending" ? "שולח…" : "שנציג יחזור אליי"} <Icon name="arrow" size={18} className="ico-move" />
            </button>
          </form>
        </>
      )}
    </div>
  );
}

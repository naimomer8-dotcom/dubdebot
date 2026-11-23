"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";

type O = { stage: "waiting" | "booked" | "done" | "closed"; meetingAt: string | null; callAt: string | null; since: string };

const SLOTS = [
  { id: "morning", label: "בוקר" },
  { id: "noon", label: "צהריים" },
  { id: "evening", label: "ערב" },
] as const;

const fmt = (iso: string) => new Date(iso).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", weekday: "long", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });

/** Morning / noon / evening buttons for the free 15-minute explanation call. Calls onPicked with the time the rep will call. */
export function CallPicker({ onPicked, compact }: { onPicked?: (at: string) => void; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [at, setAt] = useState<string | null>(null);
  const [err, setErr] = useState("");
  async function pick(slot: string) {
    setBusy(true);
    setErr("");
    const r = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slot }) }).catch(() => null);
    const j = r?.ok ? await r.json().catch(() => null) : null;
    setBusy(false);
    if (j?.callAt) { setAt(j.callAt); onPicked?.(j.callAt); }
    else if (j?.unchanged) setErr("השיחה שלך כבר נקבעה.");
    else setErr("לא הצלחנו לשמור. נסה שוב, או חכה לשיחה מהצוות.");
  }
  if (at) return <p className="call-ok"><Icon name="check" size={16} /> סגור. נתקשר אליך {fmt(at)}.</p>;
  return (
    <div className={`call-pick ${compact ? "compact" : ""}`}>
      {!compact && <span className="muted">מתי נוח שנתקשר?</span>}
      <div className="call-slots">
        {SLOTS.map((s) => (
          <button key={s.id} type="button" className="btn btn-glass btn-sm" disabled={busy} onClick={() => pick(s.id)}>{s.label}</button>
        ))}
      </div>
      {err && <small className="muted">{err}</small>}
    </div>
  );
}

/** Home card: the free 15-minute personal explanation call every new member gets. */
export default function OnboardingCard() {
  const [o, setO] = useState<O | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/onboarding", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => alive && j?.onboarding && setO(j.onboarding)).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!o || o.stage === "done" || o.stage === "closed") return null;
  const booked = o.stage === "booked" && o.meetingAt;
  return (
    <section className={`home-card onb-card ${o.stage}`} aria-label="רבע שעה של הסבר אישי במתנה">
      <span className="onb-ico"><Icon name={booked ? "calendar" : "phone"} size={22} /></span>
      <div className="onb-txt">
        <small>רבע שעה של הסבר אישי במתנה</small>
        {booked ? (
          <>
            <b>נקבעה ל{fmt(o.meetingAt!)}</b>
            <span className="muted">נראה לך בלייב איך להפעיל את הייעוץ על העסק שלך. תגיע עם שאלה אחת שבוערת לך.</span>
          </>
        ) : o.callAt ? (
          <>
            <b>נתקשר אליך {fmt(o.callAt)}</b>
            <span className="muted">כדאי לענות למספר שלא מוכר לך: זה הצוות של ניר דובדבני.</span>
          </>
        ) : (
          <>
            <b>איך להוציא מהייעוץ את המקסימום לשיווק ולמכירות שלך</b>
            <span className="muted">מישהו מהצוות של ניר יראה לך הכל בלייב, על העסק שלך.</span>
            <CallPicker onPicked={(at) => setO({ ...o, callAt: at })} />
          </>
        )}
      </div>
    </section>
  );
}

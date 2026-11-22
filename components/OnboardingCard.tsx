"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";

type O = { stage: "waiting" | "booked" | "done" | "closed"; meetingAt: string | null; since: string };

/** Home card: the onboarding & training meeting every new member gets (a rep calls within 24 hours). */
export default function OnboardingCard() {
  const [o, setO] = useState<O | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/onboarding", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => alive && j?.onboarding && setO(j.onboarding)).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!o || o.stage === "done" || o.stage === "closed") return null;
  const when = o.meetingAt ? new Date(o.meetingAt).toLocaleString("he-IL", { weekday: "long", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
  return (
    <section className={`home-card onb-card ${o.stage}`} aria-label="פגישת ההטמעה שלך">
      <span className="onb-ico"><Icon name={o.stage === "booked" ? "calendar" : "phone"} size={22} /></span>
      <div className="onb-txt">
        <small>פגישת הטמעה והדרכה על הפלטפורמה</small>
        {o.stage === "booked" ? <b>נקבעה ל{when}</b> : <b>נציג יחזור אליך תוך 24 שעות לתיאום</b>}
        <span className="muted">{o.stage === "booked" ? "נעבור יחד על המערכת ואיך מפעילים אותה לקידום העסק שלך." : "כדאי לענות למספר שלא מוכר לך: זה הצוות של ניר דובדבני."}</span>
      </div>
    </section>
  );
}

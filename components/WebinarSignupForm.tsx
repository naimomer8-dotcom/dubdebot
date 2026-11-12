"use client";
import { useState } from "react";
import Link from "next/link";
import { MARKETING_CONSENT_TEXT } from "@/lib/legal";

export default function WebinarSignupForm({ dateLabel, time, waGroup, utm }: { dateLabel: string; time: string; waGroup: string; utm: Record<string, string> }) {
  const [fullName, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending"); setErrors({}); setMsg("");
    const r = await fetch("/api/webinar-signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName, phone, email, consent, ...utm }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) return setState("done");
    setState("idle");
    if (j.errors) setErrors(j.errors);
    else setMsg(j.error || "משהו השתבש. נסו שוב.");
  }

  if (state === "done") {
    return (
      <div className="ws-done">
        <h2>נרשמת! <span className="gold">נתראה ביום ראשון.</span></h2>
        <p className="cb-lead">יום ראשון, {dateLabel} בשעה {time}, בלייב בזום. הקישור והתזכורות יגיעו אליך. כדאי גם להצטרף לקבוצת העדכונים, שם יוצא הקישור לפני שמתחילים.</p>
        <a className="btn btn-primary btn-lg btn-block" href={waGroup} target="_blank" rel="noopener noreferrer">להצטרף לקבוצת העדכונים בוואטסאפ</a>
        <a className="btn btn-glass btn-block" href="/w">הקישור לזום (נפתח בזמן הוובינר)</a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="cb-form">
      <div className="field">
        <label htmlFor="ws-name">שם מלא</label>
        <input id="ws-name" className="input" autoComplete="name" value={fullName} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.fullName} placeholder="ישראל ישראלי" />
        {errors.fullName && <span className="err">{errors.fullName}</span>}
      </div>
      <div className="field">
        <label htmlFor="ws-phone">נייד</label>
        <input id="ws-phone" className="input" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone} placeholder="050-0000000" style={{ textAlign: "right" }} />
        {errors.phone && <span className="err">{errors.phone}</span>}
      </div>
      <div className="field">
        <label htmlFor="ws-email">מייל</label>
        <input id="ws-email" className="input" type="email" dir="ltr" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} placeholder="name@gmail.com" style={{ textAlign: "right" }} />
        {errors.email && <span className="err">{errors.email}</span>}
      </div>
      <label className="ws-consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-invalid={!!errors.consent} />
        <span>{MARKETING_CONSENT_TEXT}</span>
      </label>
      {errors.consent && <span className="err">{errors.consent}</span>}
      {msg && <p className="err">{msg}</p>}
      <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={state === "sending"}>{state === "sending" ? "שומר מקום..." : "שמרו לי מקום בוובינר"}</button>
      <p className="cb-fine">במתנה לחברי הקהילה. <Link href="/privacy">מדיניות פרטיות</Link></p>
    </form>
  );
}

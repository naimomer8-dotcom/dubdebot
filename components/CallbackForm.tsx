"use client";
import { useState } from "react";
import Link from "next/link";

const OPTIONS = [
  ["unsure", "עוד לא יודע"],
  ["basic", "Basic"],
  ["private", "Private"],
  ["upgrade", "Upgrade"],
  ["pro", "Pro"],
] as const;

export default function CallbackForm({ source }: { source: string }) {
  const [fullName, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState<string>("unsure");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending"); setErrors({}); setMsg("");
    const r = await fetch("/api/callback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName, phone, plan, utm_source: source }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) return setState("done");
    setState("idle");
    if (j.errors) setErrors(j.errors);
    else setMsg(j.error || "משהו השתבש. נסו שוב.");
  }

  return (
    <main className="cb-page">
      <div className="cb-card">
        <img className="cb-ava" src="/nir/talk-face.jpg" alt="ניר דובדבני" />
        {state === "done" ? (
          <>
            <h1>קיבלנו. <span className="gold">נדבר בקרוב.</span></h1>
            <p className="cb-lead">נציג מהצוות של ניר יחזור אליכם לשיחה של 5 דקות, ויעזור לבחור את המסלול שמתאים לעסק שלכם.</p>
            <Link className="btn btn-glass btn-block" href="/plans">בינתיים, לכל המסלולים</Link>
          </>
        ) : (
          <>
            <p className="cb-eyebrow">לא בטוחים איזה מסלול?</p>
            <h1>שיחה של <span className="gold">5 דקות.</span></h1>
            <p className="cb-lead">משאירים שם וטלפון, ואנחנו חוזרים אליכם. בלי לחץ, רק להבין מה נכון לעסק שלכם.</p>
            <form onSubmit={submit} noValidate className="cb-form">
              <div className="field">
                <label htmlFor="cb-name">שם מלא</label>
                <input id="cb-name" className="input" autoComplete="name" value={fullName} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.fullName} placeholder="ישראל ישראלי" />
                {errors.fullName && <span className="err">{errors.fullName}</span>}
              </div>
              <div className="field">
                <label htmlFor="cb-phone">נייד</label>
                <input id="cb-phone" className="input" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone} placeholder="050-0000000" style={{ textAlign: "right" }} />
                {errors.phone && <span className="err">{errors.phone}</span>}
              </div>
              <div className="field">
                <label>איזה מסלול מעניין אתכם?</label>
                <div className="cb-chips" role="radiogroup">
                  {OPTIONS.map(([id, label]) => (
                    <button type="button" key={id} role="radio" aria-checked={plan === id} className={plan === id ? "on" : ""} onClick={() => setPlan(id)}>{label}</button>
                  ))}
                </div>
              </div>
              {msg && <p className="err">{msg}</p>}
              <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={state === "sending"}>{state === "sending" ? "שולח..." : "תחזרו אליי"}</button>
              <p className="cb-fine">הפרטים משמשים רק כדי לחזור אליכם בנושא הפלטפורמה. <Link href="/privacy">מדיניות פרטיות</Link></p>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

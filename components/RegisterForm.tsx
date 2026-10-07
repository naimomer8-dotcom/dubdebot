"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Mascot, { Mood } from "./Mascot";

const MARKETING_LABEL =
  "אני מסכים/ה לקבל מקבוצת דובדבני תוכן מקצועי, הזמנות והצעות שיווקיות במייל, SMS ווואטסאפ. אפשר להסיר בכל עת.";

const phoneOk = (p: string) => /^0?5\d{8}$/.test(p.replace(/[^\d]/g, "").replace(/^972/, "0"));
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

export default function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ fullName: "", phone: "", email: "" });
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false); // never pre-checked
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [carried, setCarried] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setCarried(!!sessionStorage.getItem("dd_forecast"));
    } catch {}
    const on = () => setCarried(true);
    window.addEventListener("dd:carried", on);
    return () => window.removeEventListener("dd:carried", on);
  }, []);

  useEffect(() => {
    if (step === 0) return;
    const el = document.querySelector<HTMLInputElement>(step === 1 ? "#phone" : ".stepper .check input");
    el?.focus({ preventScroll: true });
  }, [step]);

  const first = form.fullName.trim().split(" ")[0];
  const mood: Mood = loading ? "thinking" : step === 0 ? (form.fullName ? "idle" : "curious") : step === 1 ? "idle" : "wink";

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  }

  function next() {
    const e: Record<string, string> = {};
    if (step === 0 && form.fullName.trim().length < 2) e.fullName = "צריך שם מלא";
    if (step === 1) {
      if (!phoneOk(form.phone)) e.phone = "נייד ישראלי, 10 ספרות, מתחיל ב-05";
      if (!emailOk(form.email)) e.email = "המייל לא נראה תקין";
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    setStep((s) => s + 1);
  }

  async function submit() {
    if (!terms) {
      setErrors({ terms: "צריך לאשר את תנאי השימוש ומדיניות הפרטיות" });
      return;
    }
    setLoading(true);
    setErrors({});
    const utm: Record<string, string> = {};
    new URLSearchParams(window.location.search).forEach((v, k) => {
      if (k.startsWith("utm_") || k === "fbclid" || k === "gclid") utm[k] = v;
    });
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, termsAccepted: terms, marketingConsent: marketing, utm }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errs = data.errors ?? { form: data.error ?? "משהו השתבש, נסה שוב" };
        setErrors(errs);
        if (errs.fullName) setStep(0);
        else if (errs.phone || errs.email) setStep(1);
        setLoading(false);
        return;
      }
      router.push("/chat");
    } catch {
      setErrors({ form: "אין חיבור כרגע. בדוק את האינטרנט ונסה שוב." });
      setLoading(false);
    }
  }

  const titles = [
    { t: "איך קוראים לך?", s: "30 שניות ואתה בפנים. בלי כרטיס אשראי." },
    { t: `נעים מאוד, ${first || "חבר"}.`, s: "לאן לשלוח לך את התוכניות והתחזיות שנבנה?" },
    { t: "עוד שנייה ואתה בפנים", s: "שני אישורים קצרים, ודובדבוט נפתח." },
  ];

  return (
    <div className="stepper">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div className="progress" style={{ flex: 1 }} aria-label={`שלב ${step + 1} מתוך 3`}>
          {[0, 1, 2].map((i) => <span key={i} className={i <= step ? "done" : ""} />)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 6 }}>
        <Mascot size={74} mood={mood} />
        <div>
          <h3 className="step-title">{titles[step].t}</h3>
          <p className="step-sub" style={{ margin: 0 }}>{titles[step].s}</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 2) next();
          else submit();
        }}
        noValidate
        style={{ marginTop: 18 }}
      >
        {step === 0 && (
          <div className="step" key="s0">
            <div className="field">
              <label htmlFor="fullName">שם מלא</label>
              <input ref={firstRef} id="fullName" className="input" autoComplete="name" value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)} aria-invalid={!!errors.fullName} placeholder="ישראל ישראלי" />
              {errors.fullName && <span className="err">{errors.fullName}</span>}
            </div>
            <div className="step-actions">
              <button className="btn btn-gold" type="submit">המשך</button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="step" key="s1">
            <div className="field">
              <label htmlFor="phone">נייד</label>
              <input id="phone" className="input" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" value={form.phone}
                onChange={(e) => set("phone", e.target.value)} aria-invalid={!!errors.phone} placeholder="050-0000000" style={{ textAlign: "right" }} />
              {errors.phone && <span className="err">{errors.phone}</span>}
            </div>
            <div className="field">
              <label htmlFor="email">מייל</label>
              <input id="email" className="input" type="email" dir="ltr" autoComplete="email" value={form.email}
                onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} placeholder="you@business.co.il" style={{ textAlign: "right" }} />
              {errors.email && <span className="err">{errors.email}</span>}
            </div>
            <div className="step-actions">
              <button className="btn btn-gold" type="submit">המשך</button>
              <button type="button" className="back" onClick={() => setStep(0)}>חזרה</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step" key="s2">
            {carried && <div className="carried">📈 התחזית שבנית מחכה לך בפנים. דובדבוט יפרק אותה ברגע שתיכנס.</div>}
            <label className="check">
              <input type="checkbox" checked={terms} onChange={(e) => { setTerms(e.target.checked); setErrors({}); }} />
              <span>
                קראתי ואני מסכים/ה ל<a href="/terms" target="_blank">תנאי השימוש</a> ול<a href="/privacy" target="_blank">מדיניות הפרטיות</a>
              </span>
            </label>
            {errors.terms && <span className="err">{errors.terms}</span>}
            <label className="check">
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
              <span>{MARKETING_LABEL}</span>
            </label>
            {errors.form && <span className="err">{errors.form}</span>}
            <div className="step-actions">
              <button className="btn btn-gold" type="submit" disabled={loading} style={{ flex: 1 }}>
                {loading ? "פותח לך את דובדבוט…" : "פתח לי את דובדבוט"}
              </button>
              <button type="button" className="back" onClick={() => setStep(1)}>חזרה</button>
            </div>
            <p className="legal-note">ההסכמה לדיוור אינה תנאי לשימוש. הפרטים נשמרים אצל קבוצת דובדבני לפי מדיניות הפרטיות.</p>
          </div>
        )}
      </form>
    </div>
  );
}

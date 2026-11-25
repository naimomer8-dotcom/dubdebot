"use client";

import { PLANS, type Tier } from "@/lib/plans";
import { pixelTrack } from "@/components/MetaPixel";
import { MARKETING_CONSENT_TEXT } from "@/lib/legal";
import { carried, checkoutPath } from "@/lib/planPages";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Mascot, { Mood } from "./Mascot";
import Icon from "./Icon";
import { CallPicker } from "./OnboardingCard";
import { trackWaJoin } from "./EventsPopup";
import { WEBINAR_WA_GROUP } from "@/lib/webinarDates";
import PasswordField from "./PasswordField";


const phoneOk = (p: string) => /^0?5\d{8}$/.test(p.replace(/[^\d]/g, "").replace(/^972/, "0"));
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

export default function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", password: "" });
  const [exists, setExists] = useState(false);
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(false); // never pre-checked
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [carried, setCarried] = useState(false);
  const [done, setDone] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  // friend-brings-friend: remember ?ref= even if they browse around before signing up
  useEffect(() => {
    try {
      const r = new URLSearchParams(window.location.search).get("ref");
      if (r) localStorage.setItem("dp_ref", r.slice(0, 16));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      setCarried(!!(sessionStorage.getItem("dd_forecast") || sessionStorage.getItem("dd_xray") || sessionStorage.getItem("dd_tool")));
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
      if (form.password.length < 8) e.password = "לפחות 8 תווים";
      else if (!/\d/.test(form.password) || !/[A-Za-z\u0590-\u05FF]/.test(form.password)) e.password = "צריך לשלב אותיות ומספרים";
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    setStep((s) => s + 1);
  }

  async function submit() {
    if (!terms || !marketing) {
      setErrors({ ...(terms ? {} : { terms: "צריך לאשר את תנאי השימוש ומדיניות הפרטיות" }), ...(marketing ? {} : { marketing: "צריך לאשר קבלת דיוור כדי להירשם" }) });
      return;
    }
    setLoading(true);
    setErrors({});
    const utm: Record<string, string> = {};
    new URLSearchParams(window.location.search).forEach((v, k) => {
      if (k.startsWith("utm_") || k === "fbclid" || k === "gclid" || k === "ref") utm[k] = v;
    });
    try {
      const saved = localStorage.getItem("dp_ref");
      if (!utm.ref && saved) utm.ref = saved;
    } catch {}
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
        setExists(!!data.exists);
        if (errs.fullName) setStep(0);
        else if (errs.phone || errs.email || errs.password) setStep(1);
        setLoading(false);
        return;
      }
      pixelTrack("CompleteRegistration", { content_name: "30 יום במתנה" }, data.eventId);
      // came from a plan page: go straight back to that plan's checkout, with the campaign params
      const back = planReturn();
      if (back) return router.push(back);
      // came from the business checkup report: straight into the platform
      if (new URLSearchParams(window.location.search).get("from") === "checkup") return router.push("/home");
      // otherwise: thank-you screen with the workshop gift, then into the platform
      router.prefetch("/chat");
      setLoading(false);
      setDone(true);
      window.scrollTo({ top: (document.querySelector(".stepper") as HTMLElement | null)?.offsetTop ?? 0, behavior: "smooth" });
    } catch {
      setErrors({ form: "אין חיבור כרגע. בדוק את האינטרנט ונסה שוב." });
      setLoading(false);
    }
  }

  const titles = [
    { t: "איך קוראים לך?", s: "30 שניות ואתה בפנים. בלי כרטיס אשראי." },
    { t: `נעים מאוד, ${first || "חבר"}.`, s: "הפרטים להתחברות. עם המייל והסיסמה האלה נכנסים מכל מכשיר." },
    { t: "עוד שנייה ואתה בפנים", s: "שני אישורים קצרים, והפלטפורמה נפתחת." },
  ];

  if (done) return <ThankYou first={first} phone={form.phone} onEnter={() => router.push("/home")} />;

  return (
    <div className="stepper glass edge">
      <div className="progress" aria-label={`שלב ${step + 1} מתוך 3`}>
        {[0, 1, 2].map((i) => <span key={i} className={i <= step ? "done" : ""} />)}
      </div>
      <div className="step-head">
        <Mascot size={64} mood={mood} />
        <div>
          <h3 className="step-title">{titles[step].t}</h3>
          <p className="step-sub">{titles[step].s}</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 2) next();
          else submit();
        }}
        noValidate
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
              <button className="btn btn-primary" type="submit">המשך <Icon name="arrow" size={18} className="ico-move" /></button>
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
              {exists && <span className="err"><a href={`/login?email=${encodeURIComponent(form.email)}${loginNext()}`}>להתחברות</a> · <a href={`/login?forgot=1&email=${encodeURIComponent(form.email)}`}>שחזור סיסמה</a></span>}
            </div>
            <PasswordField id="new-password" label="בחר סיסמה" value={form.password} onChange={(v) => set("password", v)} error={errors.password} meter autoComplete="new-password" />
            <div className="step-actions">
              <button className="btn btn-primary" type="submit">המשך <Icon name="arrow" size={18} className="ico-move" /></button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(0)}>חזרה</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="step" key="s2">
            {carried && <div className="carried"><Icon name="chart" size={18} /> מה שהתחלת מחכה לך בפנים. ניר ימשיך משם ברגע שתיכנס.</div>}
            <label className="check">
              <input type="checkbox" checked={terms} onChange={(e) => { setTerms(e.target.checked); setErrors({}); }} />
              <span>
                קראתי ואני מסכים/ה ל<a href="/terms" target="_blank">תנאי השימוש</a> ול<a href="/privacy" target="_blank">מדיניות הפרטיות</a>
              </span>
            </label>
            {errors.terms && <span className="err">{errors.terms}</span>}
            <label className="check">
              <input type="checkbox" required aria-required="true" checked={marketing} onChange={(e) => { setMarketing(e.target.checked); setErrors({}); }} />
              <span>{MARKETING_CONSENT_TEXT} <b className="req-mark" aria-hidden="true">*</b></span>
            </label>
            {errors.marketing && <span className="err">{errors.marketing}</span>}
            {errors.form && <span className="err">{errors.form}</span>}
            <div className="step-actions">
              <button className="btn btn-primary" type="submit" disabled={loading || !terms || !marketing} style={{ flex: 1 }}>
                {loading ? "פותח לך את הפלטפורמה…" : "פתח לי את הפלטפורמה"}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStep(1)}>חזרה</button>
            </div>
            <p className="legal-note">שני האישורים נדרשים כדי לפתוח חשבון. הפרטים נשמרים אצל קבוצת דובדבני לפי מדיניות הפרטיות.</p>
          </div>
        )}
      </form>
      <p className="auth-alt" style={{ marginTop: 18 }}>כבר רשום? <a href={`/login${loginNext().replace(/^&/, "?")}`}>התחברות</a></p>
    </div>
  );
}


/** Shown right after a successful signup: registered + the onboarding & training meeting (a rep calls within 24h). */
function ThankYou({ first, phone, onEnter }: { first: string; phone: string; onEnter: () => void }) {
  // the webinar WhatsApp-group popup is retired (23.11): the thank-you page now leads to picking the call time
  const [wa, setWa] = useState(false);
  return (
    <div className="stepper glass edge ty">
      {wa && (
        <div className="evp-wrap" onClick={(e) => e.target === e.currentTarget && setWa(false)}>
          <div className="evp" role="dialog" aria-modal="true" aria-labelledby="ty-wa-h">
            <button type="button" className="icon-btn evp-x" onClick={() => setWa(false)} aria-label="סגירה"><Icon name="close" size={18} /></button>
            <span className="evp-ok evp-ok-wa"><Icon name="chat" size={28} /></span>
            <h2 id="ty-wa-h" className="evp-title" style={{ textAlign: "center" }}>{first ? `${first}, ` : ""}עוד צעד אחד</h2>
            <p className="evp-sub" style={{ textAlign: "center" }}>הצטרפו לקבוצת העדכונים בוואטסאפ: תזכורות לסדנה, וחומרים מניר. קבוצה שקטה, רק עדכונים.</p>
            <a className="btn btn-primary evp-cta evp-wa" href={WEBINAR_WA_GROUP} target="_blank" rel="noopener noreferrer" onClick={() => { trackWaJoin(); setWa(false); }}><Icon name="chat" size={18} /> להצטרפות לקבוצה בוואטסאפ</a>
            <button type="button" className="link-btn evp-later" onClick={() => setWa(false)}>לא עכשיו</button>
          </div>
        </div>
      )}
      <div className="step-head">
        <Mascot size={64} mood="wink" />
        <div>
          <h3 className="step-title">{first ? `${first}, אתה בפנים` : "אתה בפנים"}</h3>
          <p className="step-sub">30 יום ייעוץ עסקי במתנה מתחילים עכשיו.</p>
        </div>
      </div>

      <div className="ty-gift ty-onb">
        <span className="ty-tag">✓ ההרשמה הושלמה</span>
        <h4 className="ty-title">30 יום ייעוץ עסקי + רבע שעה של הסבר אישי, במתנה</h4>
        <ol className="ty-steps">
          <li className="done"><b className="num">1</b><span><strong>הייעוץ פתוח לך</strong><small>השיטה של ניר, 24/6, מתחילים עכשיו</small></span></li>
          <li className="now"><b className="num">2</b><span><strong>רוצה לעבוד עם ניר ברצינות?</strong><small>מצטרפים כבר עכשיו, ממשיכים בלי הפסקה אחרי 30 הימים</small></span></li>
          <li><b className="num">3</b><span><strong>ורבע שעה של הסבר אישי במתנה</strong><small>בוחרים מתי נוח שנתקשר{phone ? <> · <bdi dir="ltr">{phone}</bdi></> : null}</small></span></li>
        </ol>
        <a className="btn btn-primary ty-buy" href="/plans">להצטרפות עכשיו · כל המסלולים <Icon name="arrow" size={18} className="ico-move" /></a>
        <CallPicker />
        <p className="ty-note">שמור את המספר. נתקשר אליך מהצוות של ניר דובדבני.</p>
      </div>

      <button type="button" className="btn btn-ghost ty-enter" onClick={onEnter}>כניסה לייעוץ <Icon name="arrow" size={18} className="ico-move" /></button>
    </div>
  );
}

/** The checkout path to return to after signup / login, when the visitor came from a plan page. */
function planReturn(): string | null {
  if (typeof window === "undefined") return null;
  const sp = new URLSearchParams(window.location.search);
  const plan = sp.get("plan");
  if (!plan || !PLANS.some((p) => p.id === plan)) return null;
  return checkoutPath(plan as Tier, sp.get("billing") === "installments" ? "installments" : "onetime", carried(sp));
}
function loginNext(): string {
  const p = planReturn() ?? (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("from") === "checkup" ? "/home" : null);
  return p ? `&next=${encodeURIComponent(p)}` : "";
}

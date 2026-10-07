"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Spotlight from "./Spotlight";
import Mascot, { Mood } from "./Mascot";
import Icon from "./Icon";
import PasswordField from "./PasswordField";
import { Brand, GroupLogo } from "./BrandBar";

type Mode = "login" | "forgot" | "sent" | "reset" | "done";

export default function AuthClient({ initialMode, email: initialEmail = "", token = "", next = "/chat" }: { initialMode: Mode; email?: string; token?: string; next?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function post(url: string, body: unknown) {
    setLoading(true);
    setErrors({});
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : { error: "אין חיבור כרגע. נסה שוב." };
    setLoading(false);
    return { ok: !!r?.ok, j };
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const { ok, j } = await post("/api/auth/login", { email, password });
    if (ok) return router.push(next);
    setErrors({ form: j.error ?? "משהו השתבש" });
    if (j.needsReset) setMode("forgot");
  }
  async function forgot(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return setErrors({ email: "המייל לא נראה תקין" });
    await post("/api/auth/forgot", { email });
    setMode("sent");
  }
  async function reset(e: React.FormEvent) {
    e.preventDefault();
    if (password !== password2) return setErrors({ password2: "הסיסמאות לא תואמות" });
    const { ok, j } = await post("/api/auth/reset", { token, password });
    if (ok) {
      setMode("done");
      setTimeout(() => router.push("/chat"), 1400);
      return;
    }
    setErrors(j.errors ?? { form: j.error ?? "משהו השתבש" });
  }

  const mood: Mood = loading ? "thinking" : mode === "done" ? "celebrate" : mode === "sent" ? "wink" : errors.form ? "curious" : "idle";

  return (
    <>
      <Spotlight />
      <div className="auth">
        <header className="auth-top">
          <Brand />
          <GroupLogo />
        </header>
        <main className="auth-stage">
          <div className="auth-card glass edge" key={mode}>
            <Mascot size={70} mood={mood} />
            {mode === "login" && (
              <>
                <span className="eyebrow" style={{ marginTop: 18 }}>כניסה</span>
                <h1 className="h-display">ברוך שובך.</h1>
                <p className="step-sub" style={{ marginBottom: 24 }}>דובדבוט זוכר את העסק שלך. ממשיכים מאיפה שעצרנו.</p>
                <form onSubmit={login} noValidate>
                  <div className="field">
                    <label htmlFor="email">מייל</label>
                    <input id="email" className="input" type="email" dir="ltr" style={{ textAlign: "right" }} autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.co.il" autoFocus={!initialEmail} />
                  </div>
                  <PasswordField value={password} onChange={setPassword} />
                  <div className="link-row">
                    <span />
                    <button type="button" onClick={() => { setErrors({}); setMode("forgot"); }}>שכחתי סיסמה</button>
                  </div>
                  {errors.form && <span className="err">{errors.form}</span>}
                  <button className="btn btn-primary btn-lg" disabled={loading || !email || !password}>
                    {loading ? "נכנס…" : "כניסה"} <Icon name="arrow" size={18} className="ico-move" />
                  </button>
                </form>
                <p className="auth-alt" style={{ marginTop: 22 }}>עוד אין לך חשבון? <Link href="/#signup">הרשמה חינם</Link></p>
              </>
            )}

            {mode === "forgot" && (
              <>
                <span className="eyebrow" style={{ marginTop: 18 }}>שחזור סיסמה</span>
                <h1 className="h-display">קורה לטובים ביותר.</h1>
                <p className="step-sub" style={{ marginBottom: 24 }}>תכתוב את המייל שנרשמת איתו, ונשלח לך קישור לקביעת סיסמה חדשה.</p>
                <form onSubmit={forgot} noValidate>
                  {errors.form && <div className="notice"><Icon name="lock" size={18} /> {errors.form}</div>}
                  <div className="field">
                    <label htmlFor="femail">מייל</label>
                    <input id="femail" className="input" type="email" dir="ltr" style={{ textAlign: "right" }} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
                    {errors.email && <span className="err">{errors.email}</span>}
                  </div>
                  <button className="btn btn-primary btn-lg" disabled={loading}>{loading ? "שולח…" : "שלחו לי קישור"}</button>
                </form>
                <p className="auth-alt" style={{ marginTop: 22 }}><button onClick={() => { setErrors({}); setMode("login"); }}>חזרה לכניסה</button></p>
              </>
            )}

            {mode === "sent" && (
              <>
                <span className="eyebrow" style={{ marginTop: 18 }}>בדוק את המייל</span>
                <h1 className="h-display">הקישור בדרך.</h1>
                <div className="notice" style={{ margin: "18px 0" }}>
                  <Icon name="mail" size={18} />
                  <span>אם <b dir="ltr">{email}</b> רשום אצלנו, שלחנו אליו קישור לקביעת סיסמה. הקישור בתוקף לשעה. לא מוצא? תבדוק בספאם.</span>
                </div>
                <p className="auth-alt"><button onClick={() => setMode("login")}>חזרה לכניסה</button></p>
              </>
            )}

            {mode === "reset" && (
              <>
                <span className="eyebrow" style={{ marginTop: 18 }}>סיסמה חדשה</span>
                <h1 className="h-display">בוחרים סיסמה.</h1>
                <p className="step-sub" style={{ marginBottom: 24 }}>אחרי השמירה תיכנס אוטומטית, וכל המכשירים האחרים ינותקו.</p>
                {!token ? (
                  <div className="notice"><Icon name="lock" size={18} /> הקישור לא תקין. <Link href="/login?forgot=1">בקש קישור חדש</Link></div>
                ) : (
                  <form onSubmit={reset} noValidate>
                    <PasswordField id="np" label="סיסמה חדשה" value={password} onChange={setPassword} error={errors.password} meter autoComplete="new-password" />
                    <PasswordField id="np2" label="שוב, לאימות" value={password2} onChange={setPassword2} error={errors.password2} autoComplete="new-password" />
                    {errors.form && <span className="err">{errors.form} <Link href="/login?forgot=1">בקש קישור חדש</Link></span>}
                    <button className="btn btn-primary btn-lg" disabled={loading || !password}>{loading ? "שומר…" : "שמירה וכניסה"}</button>
                  </form>
                )}
              </>
            )}

            {mode === "done" && (
              <>
                <h1 className="h-display" style={{ marginTop: 18 }}>סגור. אתה בפנים.</h1>
                <p className="step-sub">מעביר אותך לדובדבוט…</p>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

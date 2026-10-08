"use client";

import { useState } from "react";
import Spotlight from "../Spotlight";
import { Brand } from "../BrandBar";
import PasswordField from "../PasswordField";
import Icon from "../Icon";

export default function AdminAuth({ mode, token = "", username = "" }: { mode: "login" | "setup"; token?: string; username?: string }) {
  const [user, setUser] = useState(username);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr({});
    if (mode === "setup" && pw !== pw2) return setErr({ password2: "הסיסמאות לא תואמות" });
    setBusy(true);
    const r = await fetch(mode === "login" ? "/api/backoffice/login" : "/api/backoffice/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mode === "login" ? { username: user, password: pw } : { token, password: pw }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : { error: "אין חיבור" };
    setBusy(false);
    if (r?.ok) return (window.location.href = "/admin");
    setErr(j.errors ?? { form: j.error ?? "משהו השתבש" });
  }

  return (
    <>
      <Spotlight />
      <div className="auth-page">
        <div className="auth-card glass edge">
          <Brand sub={false} size={34} href="/admin" />
          <span className="eyebrow" style={{ marginTop: 18 }}>ניהול · Back office</span>
          <h1 className="h-display" style={{ fontSize: 46, margin: "8px 0 4px" }}>{mode === "login" ? "כניסת מנהלים" : "בחירת סיסמה"}</h1>
          <p className="muted" style={{ margin: "0 0 18px" }}>{mode === "login" ? "גישה לרשימת המשתמשים והמנויים." : `שלום ${username || ""}, בחר סיסמה חזקה (לפחות 10 תווים, אותיות ומספרים). הקישור הזה עובד פעם אחת בלבד.`}</p>
          <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
            {mode === "login" && (
              <div className="field">
                <label htmlFor="adm-user">שם משתמש</label>
                <input id="adm-user" className="input" value={user} onChange={(e) => setUser(e.target.value)} dir="ltr" autoComplete="username" autoCapitalize="none" spellCheck={false} required />
              </div>
            )}
            <PasswordField value={pw} onChange={setPw} error={err.password} meter={mode === "setup"} autoComplete={mode === "login" ? "current-password" : "new-password"} />
            {mode === "setup" && <PasswordField id="password2" label="שוב, לאימות" value={pw2} onChange={setPw2} error={err.password2} autoComplete="new-password" />}
            {err.form && <span className="err">{err.form}</span>}
            <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? "רגע…" : mode === "login" ? "כניסה" : "שמירה וכניסה"} <Icon name="arrow" size={18} /></button>
          </form>
        </div>
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spotlight from "./Spotlight";
import { Brand } from "./BrandBar";
import AiCore from "./AiCore";
import Icon from "./Icon";
import { MARKETING_CONSENT_TEXT } from "@/lib/legal";

/** Blocking screen for members who never approved the marketing consent. Logout stays available. */
export default function ConsentGate({ firstName }: { firstName?: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function accept() {
    setBusy(true);
    setErr("");
    const r = await fetch("/api/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accept: true }) }).catch(() => null);
    if (r?.status === 401) return void (window.location.href = "/login");
    if (!r?.ok) {
      setErr("לא הצלחנו לשמור. נסה שוב.");
      setBusy(false);
      return;
    }
    router.refresh();
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => {});
    window.location.href = "/";
  }

  return (
    <>
      <Spotlight />
      <div className="xr">
        <header className="xr-top">
          <Brand sub={false} size={34} />
          <span />
          <button className="btn btn-ghost btn-sm" onClick={logout}><Icon name="logout" size={16} /> יציאה</button>
        </header>
        <main className="xr-stage">
          <section className="consent-gate glass edge" role="dialog" aria-modal="true" aria-labelledby="cg-title">
            <AiCore size={64} state="idle" />
            <span className="eyebrow">עדכון קטן לפני שממשיכים</span>
            <h1 id="cg-title" className="cg-title">{firstName ? `${firstName}, ` : ""}אישור אחד <span className="gold">והכל פתוח</span></h1>
            <p className="cg-sub">כדי להמשיך להשתמש בפלטפורמה צריך לאשר קבלת דיוור. כל השיחות, התוכניות והתיק שלך נשמרו בדיוק כמו שהשארת אותם.</p>
            <blockquote className="cg-text">{MARKETING_CONSENT_TEXT}</blockquote>
            {err && <span className="err">{err}</span>}
            <button className="btn btn-primary btn-lg btn-block" onClick={accept} disabled={busy} autoFocus>
              {busy ? "שומר…" : "מאשר/ת וממשיך/ה"} {!busy && <Icon name="arrow" size={18} className="ico-move" />}
            </button>
            <p className="legal-note">לפרטים: <a href="/privacy" target="_blank">מדיניות הפרטיות</a> · <a href="/privacy#unsubscribe" target="_blank">הסרה מדיוור</a></p>
          </section>
        </main>
      </div>
    </>
  );
}

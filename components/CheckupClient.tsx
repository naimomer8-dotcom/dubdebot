"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import { Brand } from "./BrandBar";
import { CallPicker } from "./OnboardingCard";
import { OPTION_SCORE, PROFILE, QUESTIONS, STATIONS, type Profile } from "@/lib/checkup";

type Initial = { id: string; status: string; step: number; profile: Profile; answers: Record<string, number> } | null;

const STEPS = [...PROFILE.map((f) => ({ kind: "profile" as const, f })), ...QUESTIONS.map((q) => ({ kind: "q" as const, q }))];
const BUILD_LINES = ["קורא את התשובות שלך", "מדרג 24 פרמטרים מ-1 עד 10", "מאתר את 3 הדליפות הגדולות", "בונה תוכנית רבעונית ל-2027", "מוסיף את תוכנית ההון והנדל״ן", "ניר חותם על התוכנית"];

export default function CheckupClient({ loggedIn, initial, doneId }: { loggedIn: boolean; initial: Initial; doneId: string | null }) {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(initial?.step ?? 0);
  const [profile, setProfile] = useState<Profile>(initial?.profile ?? {});
  const [answers, setAnswers] = useState<Record<string, number>>(initial?.answers ?? {});
  const [leaving, setLeaving] = useState(false);
  const [building, setBuilding] = useState(false);
  const [buildLine, setBuildLine] = useState(0);
  const [err, setErr] = useState("");
  const [help, setHelp] = useState<"" | "open" | "done">("");
  const [toast, setToast] = useState<{ label: string; score: number } | null>(null);
  const saveT = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (loggedIn && new URLSearchParams(window.location.search).get("go") === "1") setStarted(true);
  }, [loggedIn]);

  const step = STEPS[Math.min(idx, STEPS.length - 1)];
  const stationId = step.kind === "q" ? step.q.station : null;
  const stationIdx = stationId ? STATIONS.findIndex((s) => s.id === stationId) : -1;
  const progress = Math.round((idx / STEPS.length) * 100);
  const resumable = !!initial && initial.status === "in_progress" && initial.step > 0;

  const stationDone = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const s of STATIONS) out[s.id] = QUESTIONS.filter((q) => q.station === s.id).every((q) => answers[q.id] !== undefined);
    return out;
  }, [answers]);

  function save(next: { step: number; profile: Profile; answers: Record<string, number> }, now = false) {
    if (saveT.current) clearTimeout(saveT.current);
    const go = () => fetch("/api/checkup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "progress", ...next }) }).catch(() => {});
    if (now) void go();
    else saveT.current = setTimeout(go, 400);
  }

  function advance(p: Profile, a: Record<string, number>) {
    const next = idx + 1;
    // finished a station → small score toast
    if (step.kind === "q") {
      const st = step.q.station;
      const qs = QUESTIONS.filter((q) => q.station === st);
      if (qs[qs.length - 1].id === step.q.id) {
        const avg = Math.round((qs.reduce((s, q) => s + OPTION_SCORE[a[q.id] ?? 0], 0) / qs.length) * 10) / 10;
        setToast({ label: STATIONS.find((s) => s.id === st)!.label, score: avg });
        setTimeout(() => setToast(null), 1900);
      }
    }
    if (next >= STEPS.length) return finish(p, a);
    setLeaving(true);
    setTimeout(() => {
      setIdx(next);
      setLeaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 260);
    save({ step: next, profile: p, answers: a }, idx === 0);
  }

  function chooseProfile(v: string) {
    if (step.kind !== "profile") return;
    const p = { ...profile, [step.f.id]: v };
    setProfile(p);
    advance(p, answers);
  }
  function chooseAnswer(i: number) {
    if (step.kind !== "q") return;
    const a = { ...answers, [step.q.id]: i };
    setAnswers(a);
    advance(profile, a);
  }

  async function finish(p: Profile, a: Record<string, number>) {
    setBuilding(true);
    setErr("");
    let n = 0;
    const t = setInterval(() => { n = Math.min(BUILD_LINES.length - 1, n + 1); setBuildLine(n); }, 2600);
    try {
      const res = await fetch("/api/checkup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "finish", step: STEPS.length, profile: p, answers: a }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.id) throw new Error("fail");
      clearInterval(t);
      setBuildLine(BUILD_LINES.length - 1);
      setTimeout(() => router.push(`/checkup/report?id=${data.id}`), 600);
    } catch {
      clearInterval(t);
      setBuilding(false);
      setErr("משהו השתבש בבניית התוכנית. התשובות שלך שמורות, נסה שוב.");
    }
  }

  // ---------- building screen ----------
  if (building) {
    return (
      <div className="ck ck-building">
        <div className="ck-build-orb" aria-hidden><i /><i /><i /></div>
        <p className="eyebrow">רגע, ניר עובד</p>
        <h1 className="h-display ck-build-title">בונה לך את התוכנית העסקית ל-2027</h1>
        <ul className="ck-build-lines" aria-live="polite">
          {BUILD_LINES.map((l, i) => (
            <li key={l} className={i < buildLine ? "done" : i === buildLine ? "on" : ""}>
              <span className="ck-dot">{i < buildLine ? <Icon name="check" size={14} /> : null}</span>{l}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // ---------- intro ----------
  if (!started) {
    return (
      <div className="ck">
        <header className="ck-top"><Brand sub={false} size={34} /><Link href={loggedIn ? "/home" : "/"} className="btn btn-ghost btn-sm">חזרה</Link></header>
        <main className="ck-intro">
          <section className="ck-hero">
            <div className="ck-hero-copy">
              <p className="eyebrow"><span className="ck-gift"><Icon name="gem" size={14} /> במתנה מניר דובדבני</span></p>
              <h1 className="h-display ck-h1">הצ׳קאפ העסקי שלך<br /><span className="gold-text">ותוכנית עסקית ל-2027</span></h1>
              <p className="ck-lede">24 שאלות שאני שואל כשאני נכנס לעסק. אתה מקבל ציון מ-1 עד 10 על כל פרמטר, משוב, ותוכנית עסקית מפורטת לשנה הקרובה, שנבנית במיוחד לעסק שלך.</p>
              <div className="ck-meta"><span><Icon name="clock" size={16} /> כ-7 דקות</span><span><Icon name="map" size={16} /> 10 תחנות</span><span><Icon name="lock" size={16} /> נשמר תוך כדי</span></div>
              <div className="ck-cta-row">
                {loggedIn ? (
                  <button className="btn btn-primary btn-lg" onClick={() => setStarted(true)}>
                    {resumable ? "ממשיכים מאיפה שעצרת" : "מתחילים את הצ׳קאפ"} <Icon name="arrowLeft" size={18} />
                  </button>
                ) : (
                  <Link className="btn btn-primary btn-lg" href="/?from=checkup#signup">פותחים חשבון ומתחילים <Icon name="arrowLeft" size={18} /></Link>
                )}
                {doneId && <Link className="btn btn-glass" href={`/checkup/report?id=${doneId}`}>לתוכנית שלי</Link>}
              </div>
              {!loggedIn && <p className="ck-small">כבר יש לך חשבון? <Link href="/login?next=%2Fcheckup%3Fgo%3D1">התחברות</Link></p>}
            </div>
            <div className="ck-hero-art" aria-hidden>
              <div className="ck-ring-demo"><RingDemo /></div>
              <img src="/nir/home-suit.webp" alt="" className="ck-nir" />
            </div>
          </section>

          <section className="ck-promises">
            {[
              { n: "01", t: "ציון לכל פרמטר", d: "חזון, בידול, SOP, SLA, תזרים, P&L, לידים, ROAS, מכירות, צוות ועוד. מ-1 עד 10, בלי הנחות." },
              { n: "02", t: "משוב של ניר", d: "מה עובד, איפה הכסף בורח, ומה הדבר הראשון שמתקנים." },
              { n: "03", t: "תוכנית עסקית ל-2027", d: "יעד, ארבעה רבעונים, 90 הימים הראשונים, מדדים, ותוכנית הון ונדל״ן ל-10 שנים." },
            ].map((x) => (
              <article key={x.n} className="ck-promise glass edge"><span className="ck-num">{x.n}</span><h3>{x.t}</h3><p>{x.d}</p></article>
            ))}
          </section>

          <section className="ck-path" aria-label="10 התחנות">
            <p className="eyebrow">מפת האלפא · 10 תחנות</p>
            <ol>{STATIONS.map((s) => <li key={s.id}><b>{s.n}</b><span>{s.label}</span></li>)}</ol>
          </section>

          <aside className="ck-help glass edge">
            <Icon name="phone" size={22} />
            <div>
              <b>נתקעת באמצע? מגיעה לך רבע שעה עם יועץ מומחה.</b>
              <p>אין תשובה נכונה או לא נכונה. ואם התחלת ולא סיימת, ניצור איתך קשר כדי להשלים ביחד.</p>
            </div>
          </aside>
        </main>
      </div>
    );
  }

  // ---------- stepper ----------
  return (
    <div className="ck">
      <header className="ck-top">
        <Brand sub={false} size={34} />
        <div className="ck-progress" aria-label={`התקדמות ${progress}%`}><span>{progress}%</span><div className="xr-bar"><i style={{ width: `${progress}%` }} /></div></div>
        <button className="btn btn-ghost btn-sm" onClick={() => { save({ step: idx, profile, answers }, true); router.push(loggedIn ? "/home" : "/"); }}>שמור והמשך אחר כך</button>
      </header>

      <nav className="ck-stations" aria-label="תחנות">
        <span className={`ck-st ${step.kind === "profile" ? "on" : "done"}`}><b>0</b><small>העסק</small></span>
        {STATIONS.map((s, i) => (
          <span key={s.id} className={`ck-st ${i === stationIdx ? "on" : stationDone[s.id] ? "done" : ""}`}><b>{s.n}</b><small>{s.label}</small></span>
        ))}
      </nav>

      <main className="xr-stage">
        <div className={`xr-q ck-q ${leaving ? "out" : ""}`} key={idx}>
          {step.kind === "profile" ? (
            <>
              <p className="eyebrow">קודם, מכירים את העסק · {idx + 1}/{PROFILE.length}</p>
              <h2 className="h-display">{step.f.q}</h2>
              {step.f.text ? (
                <TextStep placeholder={step.f.placeholder} initial={profile[step.f.id] ?? ""} onDone={chooseProfile} />
              ) : (
                <div className="ck-chips" role="radiogroup" aria-label={step.f.q}>
                  {step.f.options!.map((o) => (
                    <button key={o} className="ck-chip" role="radio" aria-checked={profile[step.f.id] === o} aria-pressed={profile[step.f.id] === o} onClick={() => chooseProfile(o)}>{o}</button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <p className="eyebrow">תחנה {STATIONS[stationIdx].n}/10 · {STATIONS[stationIdx].label} · <span className="ck-param">{step.q.param}</span></p>
              <h2 className="h-display">{step.q.q}</h2>
              {step.q.hint && <p className="hint">{step.q.hint}</p>}
              <div className="xr-opts" role="radiogroup" aria-label={step.q.q}>
                {step.q.options.map((o, i) => (
                  <button key={i} className="xr-opt" role="radio" aria-checked={answers[step.q.id] === i} aria-pressed={answers[step.q.id] === i} onClick={() => chooseAnswer(i)}>
                    <kbd>{i + 1}</kbd>{o}
                    <span className="meter" aria-hidden>{[0, 1, 2, 3].map((m) => <i key={m} className={m <= i ? "on" : ""} />)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="xr-nav">
            {idx > 0 ? <button className="btn btn-ghost btn-sm" onClick={() => setIdx(idx - 1)}><Icon name="arrow" size={16} /> הקודמת</button> : <span />}
            <span>{idx + 1} / {STEPS.length}</span>
          </div>
          {err && <p className="ck-err" role="alert">{err} <button className="btn btn-glass btn-sm" onClick={() => finish(profile, answers)}>לנסות שוב</button></p>}
          {help === "done" ? (
            <p className="ck-stuck"><Icon name="check" size={15} /> מעולה. יועץ יחזור אליך בזמן שבחרת. בינתיים אפשר להמשיך.</p>
          ) : help === "open" ? (
            <div className="ck-help-pick"><p>מתי נוח שיועץ יתקשר? רבע שעה, במתנה.</p><CallPicker compact onPicked={() => setHelp("done")} /></div>
          ) : (
            <button className="ck-stuck" onClick={() => setHelp("open")}><Icon name="phone" size={15} /> נתקעת? מגיעה לך רבע שעה עם יועץ מומחה. <u>לבחור מתי נתקשר</u></button>
          )}
        </div>
      </main>

      {toast && (
        <div className="ck-toast" role="status">
          <span className={`ck-toast-score t-${toast.score >= 8 ? "ok" : toast.score >= 6 ? "mid" : toast.score >= 4 ? "warn" : "bad"}`}>{toast.score}</span>
          <span><small>תחנה הושלמה</small><b>{toast.label}</b></span>
        </div>
      )}
    </div>
  );
}

function TextStep({ placeholder, initial, onDone }: { placeholder?: string; initial: string; onDone: (v: string) => void }) {
  const [v, setV] = useState(initial);
  return (
    <form className="ck-text" onSubmit={(e) => { e.preventDefault(); if (v.trim()) onDone(v.trim()); }}>
      <input className="input" autoFocus value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} maxLength={80} aria-label="שם העסק" />
      <button className="btn btn-primary" disabled={!v.trim()}>הבא <Icon name="arrowLeft" size={16} /></button>
    </form>
  );
}

/** Decorative score ring on the intro. */
function RingDemo() {
  const r = 86, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      <defs><linearGradient id="ckg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f8ecd0" /><stop offset=".5" stopColor="#e2c68e" /><stop offset="1" stopColor="#8c6f42" /></linearGradient></defs>
      <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="10" />
      <circle className="ck-ring-anim" cx="100" cy="100" r={r} fill="none" stroke="url(#ckg)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * 0.28} transform="rotate(-90 100 100)" />
      <text x="100" y="104" textAnchor="middle" fill="#f6e6c2" fontFamily="Karantina, sans-serif" fontSize="64" fontWeight="700">?/10</text>
      <text x="100" y="134" textAnchor="middle" fill="#857e72" fontFamily="Assistant, sans-serif" fontSize="13" fontWeight="700">הציון של העסק שלך</text>
    </svg>
  );
}

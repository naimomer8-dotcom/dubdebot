"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import { Brand } from "./BrandBar";
import { PROFILE, QUESTIONS, STATIONS, answerScore, grade, leaks, nis, reaction, type Profile, type Q, type StationId } from "@/lib/checkup";

/* ============================================================================
   הצ'קאפ העסקי של ניר דובדבני · 2027 — the experience
   intro (particles → Alpha ring) → business profile → 10 stations on a living map
   (Nir opens each station, interactive answers, live dashboard) → unlock gate → plan
   ========================================================================== */

type Phase = "intro" | "profile" | "station" | "ask" | "cleared" | "save" | "gate" | "build";
type Saved = { token: string; step: number; profile: Profile; answers: Record<string, number> } | null;
const LS = "dd_checkup_v2";
const BUILD = ["קורא את 24 התשובות שלך", "מדרג כל פרמטר מ-1 עד 10", "מאתר את 3 הדליפות הגדולות", "בונה 4 רבעונים ל-2027", "מוסיף תוכנית הון ונדל״ן ל-10 שנים", "ניר חותם על התוכנית"];

/* ---------- tiny sound + haptics (after a user gesture only) ---------- */
let ac: AudioContext | null = null;
function tick(freq = 660, dur = 0.06, vol = 0.04) {
  try {
    ac = ac ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + dur);
  } catch {}
}
const buzz = (ms = 12) => { try { navigator.vibrate?.(ms); } catch {} };
const chime = () => { tick(523, 0.12, 0.05); setTimeout(() => tick(659, 0.12, 0.05), 90); setTimeout(() => tick(988, 0.25, 0.05), 180); };

/* ambient drone: two detuned sines + slow filter, toggled by the user */
let amb: { stop: () => void } | null = null;
function ambient(on: boolean) {
  try {
    if (!on) { amb?.stop(); amb = null; return; }
    if (amb) return;
    ac = ac ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const g = ac.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.035, ac.currentTime + 2);
    const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 420;
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 180; lfo.connect(lg).connect(f.frequency);
    const os = [110, 110.6, 164.8].map((fr) => { const o = ac!.createOscillator(); o.type = "sawtooth"; o.frequency.value = fr; o.connect(f); o.start(); return o; });
    f.connect(g).connect(ac.destination); lfo.start();
    amb = { stop: () => { const t = ac!.currentTime; g.gain.linearRampToValueAtTime(0, t + 0.8); setTimeout(() => { os.forEach((o) => o.stop()); lfo.stop(); }, 900); } };
  } catch {}
}

const scoreColor = (s: number) => (s >= 8 ? "#8fd9b4" : s >= 6 ? "#e2c68e" : s >= 4 ? "#f0a96a" : "#ff8d8d");

export default function CheckupClient({ loggedIn, source = "app" }: { loggedIn: boolean; source?: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [pIdx, setPIdx] = useState(0);
  const [sIdx, setSIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [profile, setProfile] = useState<Profile>({});
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [token, setToken] = useState<string | null>(null);
  const [resume, setResume] = useState<Saved>(null);
  const [burst, setBurst] = useState(0);
  const [buildLine, setBuildLine] = useState(0);
  const [err, setErr] = useState("");
  const [react, setReact] = useState<{ text: string; score: number } | null>(null);
  const [saved, setSaved] = useState(false);
  const [music, setMusic] = useState(false);
  const [pre, setPre] = useState<{ name: string; phone: string }>({ name: "", phone: "" });
  const saveT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const station = STATIONS[sIdx];
  const sQs = useMemo(() => QUESTIONS.filter((q) => q.station === station.id), [station.id]);
  const q = sQs[qIdx];
  const answered = Object.keys(answers).length;
  const progress = Math.min(100, Math.round((((phase === "profile" ? pIdx : PROFILE.length) + answered) / (PROFILE.length + QUESTIONS.length)) * 100));

  const live = useMemo(() => {
    const out: Record<string, number> = {};
    for (const st of STATIONS) {
      const sc = QUESTIONS.filter((x) => x.station === st.id).map((x) => (answers[x.id] !== undefined ? answerScore(x, answers[x.id]) : null)).filter((v): v is number => v !== null);
      out[st.id] = sc.length ? Math.round((sc.reduce((a, b) => a + b, 0) / sc.length) * 10) / 10 : 0;
    }
    return out as Record<StationId, number>;
  }, [answers]);
  const leak = useMemo(() => leaks(profile, live), [profile, live]);
  const liveTotal = useMemo(() => {
    const done = STATIONS.filter((s) => live[s.id] > 0);
    return done.length ? Math.round((done.reduce((a, s) => a + live[s.id], 0) / done.length) * 10) / 10 : 0;
  }, [live]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [phase, qIdx, pIdx, sIdx]);

  // resume from this browser
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS);
      if (raw) { const s = JSON.parse(raw) as Saved; if (s?.token && s.step > 0) setResume(s); }
    } catch {}
  }, []);

  const persist = useCallback((next: { step: number; profile: Profile; answers: Record<string, number> }, now = false) => {
    const go = async () => {
      try {
        const r = await fetch("/api/checkup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "progress", token, source, ...next }) });
        const j = await r.json().catch(() => ({}));
        if (j.token) {
          setToken(j.token);
          try { localStorage.setItem(LS, JSON.stringify({ token: j.token, ...next })); } catch {}
        }
      } catch {}
    };
    if (saveT.current) clearTimeout(saveT.current);
    if (now) void go(); else saveT.current = setTimeout(go, 500);
  }, [token, source]);

  const stepNo = () => PROFILE.length + Object.keys(answers).length;

  function start(fromResume = false) {
    tick(440, 0.2, 0.04); buzz(20);
    if (fromResume && resume) {
      setToken(resume.token); setProfile(resume.profile); setAnswers(resume.answers);
      const firstOpen = QUESTIONS.findIndex((x) => resume.answers[x.id] === undefined);
      if (Object.keys(resume.profile).length < PROFILE.length) { setPIdx(Object.keys(resume.profile).length); setPhase("profile"); return; }
      if (firstOpen === -1) { setPhase("gate"); return; }
      const st = STATIONS.findIndex((s) => s.id === QUESTIONS[firstOpen].station);
      setSIdx(st); setQIdx(QUESTIONS.filter((x) => x.station === STATIONS[st].id).findIndex((x) => x.id === QUESTIONS[firstOpen].id)); setPhase("station");
      return;
    }
    setPhase("profile");
  }

  function pickProfile(v: string) {
    const f = PROFILE[pIdx];
    const p = { ...profile, [f.id]: v };
    setProfile(p); tick(720); buzz();
    persist({ step: pIdx + 1, profile: p, answers }, pIdx === 0);
    if (pIdx + 1 < PROFILE.length) setTimeout(() => setPIdx(pIdx + 1), 220);
    else setTimeout(() => setPhase("station"), 300);
  }

  function answer(v: number) {
    if (react) return;
    const a = { ...answers, [q.id]: v };
    const sc = answerScore(q, v) ?? 5;
    setAnswers(a); buzz(); tick(780 + sc * 30);
    setReact({ text: reaction(q.station, sc), score: sc });
    persist({ step: stepNo() + 1, profile, answers: a });
    setTimeout(() => {
      setReact(null);
      if (qIdx + 1 < sQs.length) setQIdx(qIdx + 1);
      else { setPhase("cleared"); setBurst((b) => b + 1); chime(); buzz(40); }
    }, 1700);
  }

  function nextStation() {
    if (sIdx === 4 && !saved && !loggedIn) { setSaved(true); setPhase("save"); return; }
    if (sIdx + 1 < STATIONS.length) { setSIdx(sIdx + 1); setQIdx(0); setPhase("station"); }
    else { persist({ step: stepNo(), profile, answers }, true); setPhase("gate"); }
  }

  async function saveContact(c: { name: string; phone: string }) {
    try {
      const r = await fetch("/api/checkup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "contact", token, source, step: stepNo(), profile, answers, contact: c }) });
      if (!r.ok) return false;
      setPre(c);
      chime();
      setSIdx(sIdx + 1); setQIdx(0); setPhase("station");
      return true;
    } catch { return false; }
  }

  async function finish(contact: { name: string; phone: string; email: string; consent: boolean }) {
    setErr("");
    setPhase("build");
    let n = 0;
    const t = setInterval(() => { n = Math.min(BUILD.length - 1, n + 1); setBuildLine(n); tick(500 + n * 60, 0.08, 0.03); }, 2300);
    try {
      const r = await fetch("/api/checkup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "finish", token, source, step: PROFILE.length + QUESTIONS.length, profile, answers, contact }) });
      const j = await r.json().catch(() => ({}));
      clearInterval(t);
      if (!r.ok || !j.token) throw new Error(j.error ?? "fail");
      setBuildLine(BUILD.length);
      chime();
      try { localStorage.removeItem(LS); } catch {}
      setTimeout(() => router.push(`/checkup/r/${j.token}?new=1`), 900);
    } catch (e) {
      clearInterval(t);
      setPhase("gate");
      setErr((e as Error).message === "contact" ? "צריך שם וטלפון נייד תקין כדי לשלוח לך את התוכנית." : "משהו השתבש בבניית התוכנית. התשובות שמורות, נסה שוב.");
    }
  }

  // ====================== render ======================
  return (
    <div className={`cx cx-ph-${phase}`}>
      <GoldField intensity={phase === "intro" ? 1 : phase === "build" ? 1.4 : 0.35} />

      {phase !== "intro" && phase !== "build" && (
        <header className="cx-top">
          <Brand sub={false} size={30} />
          <div className="cx-meter" aria-label={`התקדמות ${progress}%`}>
            <div className="cx-meter-bar"><i style={{ width: `${progress}%` }} /></div>
            <b>{progress}%</b>
          </div>
          {liveTotal > 0 && <span className="cx-livechip" style={{ color: scoreColor(liveTotal) }} aria-label="ציון חי">{liveTotal.toFixed(1)}</span>}
          <button className={`cx-x cx-music ${music ? "on" : ""}`} aria-label={music ? "כבה מוזיקה" : "הפעל מוזיקה"} onClick={() => { ambient(!music); setMusic(!music); }}><Icon name={music ? "sound" : "mute"} size={16} /></button>
          <Link href={loggedIn ? "/home" : "/"} className="cx-x" aria-label="יציאה" onClick={() => persist({ step: stepNo(), profile, answers }, true)}><Icon name="close" size={18} /></Link>
        </header>
      )}

      {phase === "intro" && <Intro onStart={() => start(false)} onResume={resume ? () => start(true) : null} loggedIn={loggedIn} />}

      {phase === "profile" && (
        <main className="cx-stage cx-profile" key={`p${pIdx}`}>
          <BizCard profile={profile} />
          <section className="cx-card cx-enter">
            <p className="cx-kicker">היכרות · {pIdx + 1}/{PROFILE.length}</p>
            <h2 className="cx-h2">{PROFILE[pIdx].q}</h2>
            {PROFILE[pIdx].text ? (
              <TextAnswer placeholder={PROFILE[pIdx].placeholder} initial={profile[PROFILE[pIdx].id] ?? ""} onDone={pickProfile} />
            ) : (
              <div className="cx-chips">
                {PROFILE[pIdx].options!.map((o, i) => (
                  <button key={o} className={`cx-chip ${profile[PROFILE[pIdx].id] === o ? "on" : ""}`} style={{ animationDelay: `${i * 45}ms` }} onClick={() => pickProfile(o)}>{o}</button>
                ))}
              </div>
            )}
            {pIdx > 0 && <button className="cx-back" onClick={() => setPIdx(pIdx - 1)}><Icon name="arrow" size={15} /> חזרה</button>}
          </section>
        </main>
      )}

      {(phase === "station" || phase === "ask" || phase === "cleared") && (
        <main className="cx-stage cx-journey">
          <AlphaMap current={sIdx} live={live} phase={phase} />
          <aside className="cx-dash">
            <LiveGauge value={liveTotal} />
            {leak.total > 0 && <div className="cx-leak"><small>דליפה משוערת</small><b>{nis(leak.total)}</b><em>בחודש</em></div>}
            <ul>{STATIONS.map((s, i) => (
              <li key={s.id} className={i === sIdx ? "on" : live[s.id] ? "done" : ""}>
                <span>{s.label}</span>
                <i><b style={{ width: `${live[s.id] * 10}%`, background: scoreColor(live[s.id]) }} /></i>
                <em>{live[s.id] ? live[s.id] : "–"}</em>
              </li>
            ))}</ul>
          </aside>

          <section className="cx-panel">
            {phase === "station" && <StationIntro key={`s${sIdx}`} idx={sIdx} onGo={() => { tick(600); setPhase("ask"); }} />}
            {phase === "ask" && q && (
              <div className="cx-card cx-enter" key={q.id}>
                <p className="cx-kicker">תחנה {station.n}/10 · {station.label} <span>· {q.param}</span></p>
                <h2 className="cx-h2">{q.q}</h2>
                {q.hint && <p className="cx-hint">{q.hint}</p>}
                <Answer q={q} value={answers[q.id]} onAnswer={answer} />
                {react && (
                  <div className="cx-react" role="status">
                    <img src="/nir-face.jpg" alt="" />
                    <p><b style={{ color: scoreColor(react.score) }}>{react.score}/10</b> {react.text}</p>
                  </div>
                )}
                <div className="cx-qnav">
                  <span className="cx-dots">{sQs.map((x, i) => <i key={x.id} className={i < qIdx ? "done" : i === qIdx ? "on" : ""} />)}</span>
                  {qIdx > 0 && <button className="cx-back" onClick={() => setQIdx(qIdx - 1)}><Icon name="arrow" size={15} /> הקודמת</button>}
                </div>
              </div>
            )}
            {phase === "cleared" && <Cleared key={`c${sIdx}${burst}`} idx={sIdx} score={live[station.id]} last={sIdx === STATIONS.length - 1} onNext={nextStation} />}
          </section>
          <HelpLine />
        </main>
      )}

      {phase === "save" && <SaveProgress leakTotal={leak.total} onSave={saveContact} onSkip={() => { setSIdx(sIdx + 1); setQIdx(0); setPhase("station"); }} />}
      {phase === "gate" && <Gate pre={pre} total={liveTotal} live={live} leakTotal={leak.total} loggedIn={loggedIn} err={err} onSubmit={finish} />}

      {phase === "build" && (
        <main className="cx-stage cx-buildwrap">
          <div className="cx-orb" aria-hidden><i /><i /><i /><span>{liveTotal.toFixed(1)}</span></div>
          <p className="cx-kicker">ניר עובד על זה</p>
          <h1 className="cx-h1 sm">בונה לך את התוכנית העסקית ל-2027</h1>
          <ul className="cx-buildlines" aria-live="polite">
            {BUILD.map((l, i) => <li key={l} className={i < buildLine ? "done" : i === buildLine ? "on" : ""}><span>{i < buildLine ? <Icon name="check" size={13} /> : null}</span>{l}</li>)}
          </ul>
        </main>
      )}
    </div>
  );
}

/* ============================ intro ============================ */
function Intro({ onStart, onResume, loggedIn }: { onStart: () => void; onResume: (() => void) | null; loggedIn: boolean }) {
  return (
    <main className="cx-intro">
      <header className="cx-intro-top"><Brand sub={false} size={32} />{!loggedIn && <Link href="/login?next=%2Fcheckup" className="cx-link">כניסה</Link>}</header>
      <div className="cx-intro-grid">
        <div className="cx-intro-copy">
          <p className="cx-badge"><Icon name="gem" size={14} /> במתנה מניר דובדבני</p>
          <h1 className="cx-h1"><span className="cx-reveal" style={{ animationDelay: "120ms" }}>כמה העסק שלך</span><span className="cx-reveal cx-gold" style={{ animationDelay: "300ms" }}>מוכן ל-2027?</span></h1>
          <p className="cx-lede cx-reveal" style={{ animationDelay: "520ms" }}>24 שאלות שאני שואל כשאני נכנס לעסק. ציון מ-1 עד 10 לכל פרמטר, משוב, ותוכנית עסקית מלאה לשנה הקרובה, שנבנית במיוחד בשבילך.</p>
          <div className="cx-facts cx-reveal" style={{ animationDelay: "700ms" }}>
            <span><b>7</b> דקות</span><span><b>10</b> תחנות</span><span><b>24</b> פרמטרים</span><span><b>1</b> תוכנית ל-2027</span>
          </div>
          <div className="cx-ctas cx-reveal" style={{ animationDelay: "860ms" }}>
            <button className="cx-cta" onClick={onStart}><span>מתחילים את הצ׳קאפ</span><Icon name="arrowLeft" size={20} /></button>
            {onResume && <button className="cx-ghost" onClick={onResume}>להמשיך מאיפה שעצרתי</button>}
          </div>
          <p className="cx-help cx-reveal" style={{ animationDelay: "1000ms" }}><Icon name="phone" size={15} /> נתקעת באמצע? מגיעה לך רבע שעה עם יועץ מומחה. ואם התחלת ולא סיימת, ניצור איתך קשר כדי להשלים.</p>
        </div>
        <div className="cx-intro-art" aria-hidden>
          <div className="cx-ring">
            {STATIONS.map((s, i) => {
              const a = (i / STATIONS.length) * Math.PI * 2 - Math.PI / 2;
              return <span key={s.id} className="cx-ring-node" style={{ "--x": `${50 + 46 * Math.cos(a)}%`, "--y": `${50 + 46 * Math.sin(a)}%`, animationDelay: `${600 + i * 90}ms` } as React.CSSProperties}><b>{s.n}</b><small>{s.label}</small></span>;
            })}
            <svg viewBox="0 0 100 100" className="cx-ring-svg"><circle cx="50" cy="50" r="46" /><circle cx="50" cy="50" r="34" className="in" /></svg>
          </div>
          <img src="/nir/welcome.webp" alt="" className="cx-nir-hero" />
        </div>
      </div>
    </main>
  );
}

/* ============================ profile ============================ */
function BizCard({ profile }: { profile: Profile }) {
  const rows: [string, string | undefined][] = [["תחום", profile.field], ["ותק", profile.years], ["צוות", profile.team], ["מחזור", profile.revenue], ["2027", profile.goal]];
  return (
    <aside className="cx-biz">
      <small>כרטיס העסק</small>
      <b className={profile.business ? "" : "ph"}>{profile.business || "העסק שלך"}</b>
      <ul>{rows.map(([k, v]) => <li key={k} className={v ? "on" : ""}><span>{k}</span><em>{v ?? "···"}</em></li>)}</ul>
    </aside>
  );
}

function TextAnswer({ placeholder, initial, onDone }: { placeholder?: string; initial: string; onDone: (v: string) => void }) {
  const [v, setV] = useState(initial);
  return (
    <form className="cx-textform" onSubmit={(e) => { e.preventDefault(); if (v.trim()) onDone(v.trim()); }}>
      <input autoFocus value={v} maxLength={60} onChange={(e) => setV(e.target.value)} placeholder={placeholder} aria-label="שם העסק" />
      <button disabled={!v.trim()} className="cx-cta sm">המשך <Icon name="arrowLeft" size={16} /></button>
    </form>
  );
}

/* ============================ map + dashboard ============================ */
const MAP_PTS: [number, number][] = [[86, 82], [64, 86], [42, 78], [22, 64], [30, 46], [52, 52], [74, 44], [80, 24], [58, 14], [32, 18]];

function AlphaMap({ current, live, phase }: { current: number; live: Record<StationId, number>; phase: Phase }) {
  const [cx, cy] = MAP_PTS[current];
  const path = MAP_PTS.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  const done = MAP_PTS.slice(0, current + 1).map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  return (
    <div className="cx-map" aria-hidden>
      <div className="cx-map-cam" style={{ transform: `translate(${50 - cx}%, ${50 - cy}%) scale(${phase === "ask" ? 1.35 : 1.15})` }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="cxg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f8ecd0" /><stop offset=".5" stopColor="#e2c68e" /><stop offset="1" stopColor="#8c6f42" /></linearGradient>
          </defs>
          {Array.from({ length: 11 }).map((_, i) => <line key={`h${i}`} x1="0" x2="100" y1={i * 10} y2={i * 10} className="grid" />)}
          {Array.from({ length: 11 }).map((_, i) => <line key={`v${i}`} y1="0" y2="100" x1={i * 10} x2={i * 10} className="grid" />)}
          <path d={path} className="road" />
          <path d={done} className="road-done" stroke="url(#cxg)" />
        </svg>
        {STATIONS.map((s, i) => (
          <span key={s.id} className={`cx-node ${i === current ? "on" : i < current ? "done" : ""}`} style={{ left: `${MAP_PTS[i][0]}%`, top: `${MAP_PTS[i][1]}%`, "--c": live[s.id] ? scoreColor(live[s.id]) : undefined } as React.CSSProperties}>
            <b>{i < current || (i === current && phase === "cleared") ? live[s.id] || s.n : s.n}</b>
            <small>{s.label}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

function LiveGauge({ value }: { value: number }) {
  const r = 40, c = 2 * Math.PI * r;
  return (
    <div className="cx-gauge">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} className="bg" />
        <circle cx="50" cy="50" r={r} className="fg" stroke={value ? scoreColor(value) : "#3a3326"} strokeDasharray={c} strokeDashoffset={c * (1 - value / 10)} transform="rotate(-90 50 50)" />
      </svg>
      <div><b>{value ? value.toFixed(1) : "–"}</b><small>ציון חי</small></div>
    </div>
  );
}

/* ============================ station ============================ */
function StationIntro({ idx, onGo }: { idx: number; onGo: () => void }) {
  const s = STATIONS[idx];
  const [typed, setTyped] = useState("");
  const [muted, setMuted] = useState(true);
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => { i += 2; setTyped(s.line.slice(0, i)); if (i >= s.line.length) clearInterval(t); }, 28);
    return () => clearInterval(t);
  }, [s.line]);
  return (
    <div className="cx-card cx-station cx-enter">
      <div className="cx-st-head">
        <span className="cx-st-num">{String(s.n).padStart(2, "0")}</span>
        <div><p className="cx-kicker">תחנה {s.n} מתוך 10</p><h2 className="cx-h2 big">{s.label}</h2><p className="cx-tag">{s.tag}</p></div>
      </div>
      <div className="cx-nir">
        <div className="cx-nir-media">
          {s.video ? (
            <>
              <video src={s.video} autoPlay muted={muted} playsInline loop poster={`/nir/${s.pose}.webp`} />
              <button className="cx-sound" onClick={() => setMuted(!muted)} aria-label={muted ? "הפעל קול" : "השתק"}><Icon name={muted ? "mute" : "sound"} size={16} /></button>
            </>
          ) : (
            <img src={`/nir/${s.pose}.webp`} alt="ניר דובדבני" />
          )}
        </div>
        <blockquote><p>״{typed}<i className="cx-caret" />״</p><cite>ניר דובדבני</cite></blockquote>
      </div>
      <button className="cx-cta" onClick={onGo} autoFocus><span>יאללה, שאלות</span><Icon name="arrowLeft" size={18} /></button>
    </div>
  );
}

function Cleared({ idx, score, last, onNext }: { idx: number; score: number; last: boolean; onNext: () => void }) {
  const s = STATIONS[idx];
  const [n, setN] = useState(0);
  const go = useRef(onNext);
  go.current = onNext;
  const fired = useRef(false);
  const fire = () => { if (!fired.current) { fired.current = true; go.current(); } };
  useEffect(() => {
    let raf = 0; const t0 = performance.now();
    const f = (t: number) => { const p = Math.min(1, (t - t0) / 900); setN(Math.round(score * (1 - Math.pow(1 - p, 3)) * 10) / 10); if (p < 1) raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f);
    const auto = setTimeout(fire, 2600);
    return () => { cancelAnimationFrame(raf); clearTimeout(auto); };
  }, [score]);
  const g = grade(score);
  return (
    <div className="cx-card cx-cleared cx-enter" onClick={fire}>
      <Sparks />
      <p className="cx-kicker">תחנה {s.n} הושלמה</p>
      <div className="cx-big" style={{ color: scoreColor(score) }}>{n.toFixed(1)}</div>
      <h3>{s.label} · {g.word}</h3>
      <button className="cx-cta sm" onClick={(e) => { e.stopPropagation(); fire(); }}>{last ? "לתוצאה" : `לתחנה ${s.n + 1}`} <Icon name="arrowLeft" size={16} /></button>
    </div>
  );
}

function Sparks() {
  return <div className="cx-sparks" aria-hidden>{Array.from({ length: 26 }).map((_, i) => <i key={i} style={{ "--a": `${(i / 26) * 360}deg`, "--d": `${60 + (i % 5) * 26}px`, animationDelay: `${(i % 4) * 30}ms` } as React.CSSProperties} />)}</div>;
}

function HelpLine() {
  return <p className="cx-helpline"><Icon name="phone" size={14} /> נתקעת? מגיעה לך רבע שעה עם יועץ מומחה · <Link href="/?from=checkup#signup">דבר איתנו</Link></p>;
}

/* ============================ answers ============================ */
function Answer({ q, value, onAnswer }: { q: Q; value: number | undefined; onAnswer: (v: number) => void }) {
  if (q.kind === "choice") return (
    <div className="cx-choices">
      {q.options.map((o, i) => (
        <button key={i} className={`cx-choice ${value === i ? "on" : ""}`} style={{ animationDelay: `${i * 60}ms` }} onClick={() => onAnswer(i)}>
          <span className="cx-lvl" aria-hidden>{[0, 1, 2, 3].map((m) => <i key={m} className={m <= i ? "on" : ""} />)}</span>
          {o}
        </button>
      ))}
    </div>
  );
  if (q.kind === "slider") return <Slider low={q.low} high={q.high} initial={value} onDone={onAnswer} />;
  if (q.kind === "swipe") return <Swipe q={q} onDone={onAnswer} />;
  return <Dial unit={q.unit} max={q.max} scale={q.scale} initial={value} onDone={onAnswer} />;
}

function Slider({ low, high, initial, onDone }: { low: string; high: string; initial?: number; onDone: (v: number) => void }) {
  const [v, setV] = useState(initial ?? 5);
  const [touched, setTouched] = useState(initial !== undefined);
  const ref = useRef<HTMLDivElement>(null);
  const setFrom = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    // RTL: right = 1, left = 10
    const p = Math.min(1, Math.max(0, (r.right - clientX) / r.width));
    const nv = Math.max(1, Math.min(10, Math.round(1 + p * 9)));
    if (nv !== v) { tick(380 + nv * 45, 0.03, 0.025); buzz(6); }
    setV(nv); setTouched(true);
  };
  return (
    <div className="cx-slider">
      <div className="cx-slider-val" style={{ color: scoreColor(v) }}>{v}<small>/10</small></div>
      <div ref={ref} className="cx-track" role="slider" aria-valuemin={1} aria-valuemax={10} aria-valuenow={v} tabIndex={0}
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); setFrom(e.clientX); }}
        onPointerMove={(e) => { if (e.buttons) setFrom(e.clientX); }}
        onKeyDown={(e) => { if (e.key === "ArrowLeft") { setV(Math.min(10, v + 1)); setTouched(true); } if (e.key === "ArrowRight") { setV(Math.max(1, v - 1)); setTouched(true); } if (e.key === "Enter") onDone(v); }}>
        <i className="fill" style={{ width: `${((v - 1) / 9) * 100}%`, background: `linear-gradient(to left, #ff8d8d, ${scoreColor(v)})` }} />
        {Array.from({ length: 10 }).map((_, i) => <b key={i} className={i < v ? "on" : ""} style={{ right: `${(i / 9) * 100}%` }} />)}
        <span className="knob" style={{ right: `${((v - 1) / 9) * 100}%` }} />
      </div>
      <div className="cx-slider-legend"><span>{low}</span><span>{high}</span></div>
      <button className="cx-cta sm" disabled={!touched} onClick={() => onDone(v)}>זה המצב <Icon name="check" size={16} /></button>
    </div>
  );
}

function Swipe({ q, onDone }: { q: Extract<Q, { kind: "swipe" }>; onDone: (v: number) => void }) {
  const [dx, setDx] = useState(0);
  const [gone, setGone] = useState<0 | 1 | -1>(0);
  const start = useRef<number | null>(null);
  const decide = (dir: 1 | -1 | 0) => {
    setGone(dir === 0 ? 0 : dir); tick(dir === 1 ? 880 : dir === -1 ? 330 : 600, 0.08); buzz(18);
    setTimeout(() => onDone(dir === 1 ? 9 : dir === -1 ? 2 : 5), 260);
  };
  return (
    <div className="cx-swipe">
      <div className={`cx-swipe-card ${gone === 1 ? "yes" : gone === -1 ? "no" : ""}`}
        style={{ transform: gone ? undefined : `translateX(${dx}px) rotate(${dx / 18}deg)` }}
        onPointerDown={(e) => { start.current = e.clientX; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (start.current !== null) setDx(e.clientX - start.current); }}
        onPointerUp={() => { start.current = null; if (dx < -90) decide(1); else if (dx > 90) decide(-1); else setDx(0); }}>
        <span className="stamp yes" style={{ opacity: Math.max(0, -dx / 90) }}>{q.yes}</span>
        <span className="stamp no" style={{ opacity: Math.max(0, dx / 90) }}>{q.no}</span>
        <Icon name="spark" size={22} />
        <p>זה נכון אצלך?</p>
        <small>גרור שמאלה = {q.yes} · ימינה = {q.no}</small>
      </div>
      <div className="cx-swipe-btns">
        <button className="no" onClick={() => decide(-1)}><Icon name="close" size={18} />{q.no}</button>
        <button className="mid" onClick={() => decide(0)}>חלקית</button>
        <button className="yes" onClick={() => decide(1)}><Icon name="check" size={18} />{q.yes}</button>
      </div>
    </div>
  );
}

function Dial({ unit, max, scale, initial, onDone }: { unit: string; max: number; scale: number[]; initial?: number; onDone: (v: number) => void }) {
  const step = max <= 10 ? (unit === "₪" ? 0.5 : 1) : max <= 20 ? 1 : 1;
  const [v, setV] = useState(initial ?? 0);
  const [touched, setTouched] = useState(initial !== undefined);
  const ref = useRef<HTMLDivElement>(null);
  const sc = (() => { let s = 1; scale.forEach((t, i) => { if (v >= t) s = i + 2; }); return Math.min(10, s); })();
  const setFromPoint = (x: number, y: number) => {
    const r = ref.current!.getBoundingClientRect();
    const ang = Math.atan2(y - (r.top + r.height / 2), x - (r.left + r.width / 2)) + Math.PI / 2;
    let p = (ang < 0 ? ang + Math.PI * 2 : ang) / (Math.PI * 2);
    p = Math.min(0.999, Math.max(0, p));
    const nv = Math.round((p * max) / step) * step;
    if (nv !== v) { tick(360 + (nv / max) * 500, 0.025, 0.025); buzz(5); }
    setV(nv); setTouched(true);
  };
  const p = v / max;
  const R = 70, C = 2 * Math.PI * R;
  return (
    <div className="cx-dial">
      <div ref={ref} className="cx-dial-ring" onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); setFromPoint(e.clientX, e.clientY); }} onPointerMove={(e) => { if (e.buttons) setFromPoint(e.clientX, e.clientY); }}>
        <svg viewBox="0 0 180 180">
          <circle cx="90" cy="90" r={R} className="bg" />
          <circle cx="90" cy="90" r={R} className="fg" stroke={scoreColor(sc)} strokeDasharray={C} strokeDashoffset={C * (1 - p)} transform="rotate(-90 90 90)" />
          <circle cx={90 + R * Math.sin(p * Math.PI * 2)} cy={90 - R * Math.cos(p * Math.PI * 2)} r="10" className="knob" />
        </svg>
        <div className="cx-dial-val"><b>{unit === "₪" ? `₪${v}` : v}</b><small>{unit === "₪" ? "חוזר על כל ₪1" : unit}</small></div>
      </div>
      <div className="cx-dial-steps">
        <button onClick={() => { setV(Math.max(0, +(v - step).toFixed(1))); setTouched(true); tick(420); }} aria-label="פחות">−</button>
        <span>גרור את הטבעת או לחץ</span>
        <button onClick={() => { setV(Math.min(max, +(v + step).toFixed(1))); setTouched(true); tick(700); }} aria-label="יותר">+</button>
      </div>
      <button className="cx-cta sm" disabled={!touched} onClick={() => onDone(v)}>זה המספר <Icon name="check" size={16} /></button>
    </div>
  );
}

/* ============================ save progress (midway) ============================ */
function SaveProgress({ leakTotal, onSave, onSkip }: { leakTotal: number; onSave: (c: { name: string; phone: string }) => Promise<boolean>; onSkip: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState(false);
  return (
    <main className="cx-stage cx-gate">
      <section className="cx-gate-score cx-enter">
        <p className="cx-kicker">חצי דרך · 5 מתוך 10 תחנות</p>
        <h2 className="cx-h2 big">אתה באמצע.</h2>
        <p className="cx-lede sm">עוד 5 תחנות ואתה מקבל את התוכנית המלאה ל-2027. שמור את ההתקדמות, ואם משהו יקטע אותך, נחזור אליך להשלים ביחד.</p>
        {leakTotal > 0 && <div className="cx-leakbig sm"><small>הדליפה שמצאנו עד עכשיו</small><b>{nis(leakTotal)}</b><em>בחודש, ורק בחצי מהעסק</em></div>}
      </section>
      <form className="cx-card cx-gate-form cx-enter" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setBad(false); const ok = await onSave({ name, phone }); setBusy(false); if (!ok) setBad(true); }}>
        <h3>לשמור את ההתקדמות?</h3>
        <label><span>שם</span><input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
        <label><span>טלפון נייד</span><input required inputMode="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="05X-XXXXXXX" /></label>
        {bad && <p className="cx-err">צריך שם וטלפון נייד תקין.</p>}
        <button className="cx-cta" disabled={busy}><span>{busy ? "שומר..." : "שמור והמשך"}</span><Icon name="arrowLeft" size={18} /></button>
        <button type="button" className="cx-back" onClick={onSkip}>להמשיך בלי לשמור</button>
      </form>
    </main>
  );
}

/* ============================ gate ============================ */
function Gate({ pre, total, live, leakTotal, loggedIn, err, onSubmit }: { pre: { name: string; phone: string }; total: number; live: Record<StationId, number>; leakTotal: number; loggedIn: boolean; err: string; onSubmit: (c: { name: string; phone: string; email: string; consent: boolean }) => void }) {
  const [name, setName] = useState(pre.name);
  const [phone, setPhone] = useState(pre.phone);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const g = grade(total);
  const weakest = [...STATIONS].sort((a, b) => live[a.id] - live[b.id])[0];
  return (
    <main className="cx-stage cx-gate">
      <Sparks />
      <section className="cx-gate-score cx-enter">
        <p className="cx-kicker">הציון של העסק שלך</p>
        <div className="cx-big xl" style={{ color: scoreColor(total) }}>{total.toFixed(1)}<small>/10</small></div>
        <h2 className="cx-h2">{g.word}</h2>
        <p className="cx-lede sm">{g.line} הדליפה הכי גדולה אצלך: <b>{weakest.label}</b>.</p>
        {leakTotal > 0 && <div className="cx-leakbig"><small>לפי המחזור שמסרת, העסק מדליף בערך</small><b>{nis(leakTotal)}</b><em>בחודש · {nis(leakTotal * 12)} בשנה</em></div>}
        <div className="cx-locked" aria-hidden>
          {["משוב על 24 פרמטרים", "3 המהלכים שיזיזו לך את 2027", "תוכנית רבעונית מלאה", "90 הימים הראשונים", "תוכנית הון ונדל״ן ל-10 שנים"].map((t) => <span key={t}><Icon name="lock" size={14} />{t}</span>)}
        </div>
      </section>
      <form className="cx-card cx-gate-form cx-enter" style={{ animationDelay: "160ms" }} onSubmit={(e) => { e.preventDefault(); onSubmit({ name, phone, email, consent }); }}>
        <h3>כמעט שם. למי התוכנית?</h3>
        <p>ניר בונה לך עכשיו תוכנית עסקית אישית ל-2027. היא תיפתח כאן, עם PDF להורדה.</p>
        {!loggedIn && <>
          <label><span>שם מלא</span><input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
          <label><span>טלפון נייד</span><input required inputMode="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="05X-XXXXXXX" /></label>
          <label><span>מייל</span><input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
          <label className="cx-check"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>אני מאשר/ת לקבל מניר דובדבני תכנים והצעות בוואטסאפ ובמייל. אפשר להסיר בכל רגע.</span></label>
        </>}
        {err && <p className="cx-err" role="alert">{err}</p>}
        <button className="cx-cta"><span>תבנה לי את התוכנית</span><Icon name="spark" size={18} /></button>
      </form>
    </main>
  );
}

/* ============================ background ============================ */
function GoldField({ intensity }: { intensity: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const k = useRef(intensity);
  k.current = intensity;
  useEffect(() => {
    const cv = ref.current!; const ctx = cv.getContext("2d")!;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let w = 0, h = 0, raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const N = window.innerWidth < 700 ? 70 : 140;
    const pts = Array.from({ length: N }, () => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.0004, vy: -Math.random() * 0.0006 - 0.0001, r: Math.random() * 1.6 + 0.3, a: Math.random() }));
    const resize = () => { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); window.addEventListener("resize", resize);
    const loop = () => {
      ctx.clearRect(0, 0, w, h);
      const s = k.current;
      for (const p of pts) {
        p.x += p.vx * (1 + s); p.y += p.vy * (1 + s * 1.5);
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
        p.a += 0.02;
        const al = (0.25 + 0.35 * Math.sin(p.a)) * Math.min(1, s + 0.2);
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.r * (1 + s * 0.4), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226,198,142,${al})`; ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="cx-field" aria-hidden />;
}

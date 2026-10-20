"use client";

import Link from "next/link";
import { useState } from "react";
import Sidebar from "./Sidebar";
import Spotlight from "./Spotlight";
import PlanCube from "./PlanCube";
import Icon from "./Icon";
import AiCore from "./AiCore";
import type { ConvItem, ShellUser } from "@/lib/data";
import { MONEY_DIMS, MONEY_QUESTIONS, MONEY_STARTERS, WORKSHOP, dimLabel, levelOf, workshopDateLabel, type MoneyResult } from "@/lib/money";

/** Hand a question to the chat; ChatClient picks it up on load. */
function ask(text: string) {
  try { sessionStorage.setItem("dd_ask", text); } catch {}
  window.location.href = "/chat?new=1";
}

export function ScoreRing({ score, size = 148 }: { score: number; size?: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <svg className="ring" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`ציון ${score} מתוך 100`}>
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f8ecd0" />
          <stop offset=".5" stopColor="#e2c68e" />
          <stop offset="1" stopColor="#8c6f42" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r={r} className="ring-track" />
      <circle cx="50" cy="50" r={r} className="ring-val" stroke="url(#ringGrad)" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      <text x="50" y="50" className="ring-num" textAnchor="middle" dominantBaseline="central">{score}</text>
    </svg>
  );
}

export default function MoneyClient({ user, conversations, leadSent, initial }: { user: ShellUser; conversations: ConvItem[]; leadSent: boolean; initial: MoneyResult | null }) {
  const [side, setSide] = useState(false);
  const [result, setResult] = useState<MoneyResult | null>(initial);
  const [taking, setTaking] = useState(!initial);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const paid = user.access.status === "paid";
  const q = MONEY_QUESTIONS[step];
  const lvl = result ? levelOf(result.level) : null;

  async function pick(v: number) {
    const next = { ...answers, [q.id]: v };
    setAnswers(next);
    if (step < MONEY_QUESTIONS.length - 1) return setStep(step + 1);
    setSaving(true);
    setErr("");
    try {
      const r = await fetch("/api/money", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: next }) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) return void (window.location.href = "/");
      if (!r.ok || !j.result) throw new Error(j.error || "לא הצלחנו לשמור. נסה שוב.");
      setResult(j.result);
      setTaking(false);
    } catch (e) {
      setErr((e as Error).message || "אין חיבור כרגע. נסה שוב.");
    }
    setSaving(false);
  }

  function restart() {
    setAnswers({});
    setStep(0);
    setErr("");
    setTaking(true);
  }

  return (
    <>
      <Spotlight />
      <div className="app">
        <Sidebar active="money" conversations={conversations} user={user} leadSent={leadSent} open={side} onClose={() => setSide(false)} />
        <main className="main" style={{ gridTemplateRows: "auto auto 1fr" }}>
          <PlanCube access={user.access} />
          <header className="topbar">
            <div className="who">
              <button className="icon-btn mobile-only" onClick={() => setSide(true)} aria-label="תפריט"><Icon name="menu" size={20} /></button>
              <Icon name="coin" size={22} className="gold-ico" />
              <div><b>כסף</b><small>הסדנה, בדיקת הכסף ושאלות לניר</small></div>
            </div>
            <div className="topbar-actions">
              <Link className="btn btn-glass btn-sm" href="/chat"><Icon name="chat" size={16} /> לשיחה</Link>
            </div>
          </header>

          <div className="vault">
            <div className="vault-in money">
              <div className="crs-head">
                <span className="eyebrow">{user.firstName} · כסף</span>
                <h1 className="h-display">הכסף שלך. <span className="gold">ער או ישן?</span></h1>
                <p className="lead" style={{ margin: 0 }}>עסק יכול להכניס הרבה ולהשאיר מעט. פה בודקים מה נשאר אצלך באמת, ומה עושים עם זה.</p>
              </div>

              {/* ---------- money self-check ---------- */}
              <section className="mc glass edge" aria-labelledby="mc-h" aria-live="polite">
                {taking ? (
                  <div className="mc-quiz">
                    <div className="mc-top">
                      <div>
                        <span className="eyebrow">בדיקת כסף · 2 דקות</span>
                        <h2 id="mc-h">שאלה {step + 1} מתוך {MONEY_QUESTIONS.length}</h2>
                      </div>
                      {result && <button className="btn btn-ghost btn-sm" onClick={() => setTaking(false)}>לתוצאה הקודמת</button>}
                    </div>
                    <div className="mc-progress" role="progressbar" aria-valuemin={0} aria-valuemax={MONEY_QUESTIONS.length} aria-valuenow={step}>
                      <span style={{ width: `${(step / MONEY_QUESTIONS.length) * 100}%` }} />
                    </div>
                    <p className="mc-q" key={q.id}>{q.q}</p>
                    <div className="mc-opts">
                      {q.options.map((o, i) => (
                        <button key={o} className={`mc-opt ${answers[q.id] === i ? "on" : ""}`} disabled={saving} onClick={() => pick(i)}>
                          <span className="mc-dot" aria-hidden="true" />{o}
                        </button>
                      ))}
                    </div>
                    <div className="mc-nav">
                      {step > 0 && <button className="btn btn-ghost btn-sm" disabled={saving} onClick={() => setStep(step - 1)}>הקודמת</button>}
                      {saving && <span className="shimmer">מחשב את הציון…</span>}
                      {err && <span className="err" role="alert">{err}</span>}
                    </div>
                  </div>
                ) : result && lvl ? (
                  <div className="mc-result">
                    <div className="mc-score">
                      <ScoreRing score={result.score} />
                      <div>
                        <span className="eyebrow">בדיקת הכסף שלך · {new Date(result.at).toLocaleDateString("he-IL")}</span>
                        <h2 id="mc-h" className="h-display gold">{lvl.label}</h2>
                        <p>{lvl.line}</p>
                      </div>
                    </div>
                    <div className="mc-dims">
                      {MONEY_DIMS.map((d) => (
                        <div key={d.id} className={`mc-dim ${d.id === result.weakest ? "weak" : ""}`}>
                          <span>{d.label}{d.id === result.weakest && <small> · הכי חלש</small>}</span>
                          <i><b style={{ width: `${Math.max(4, result.dims[d.id] ?? 0)}%` }} /></i>
                          <em className="num">{result.dims[d.id] ?? 0}</em>
                        </div>
                      ))}
                    </div>
                    <div className="mc-actions">
                      <button className="btn btn-primary" onClick={() => ask(`עשיתי את בדיקת הכסף וקיבלתי ${result.score} מתוך 100. הציר הכי חלש שלי: ${dimLabel(result.weakest)}. מה הצעד הראשון שלי השבוע?`)}>
                        <Icon name="chat" size={18} /> לפרק את זה עם ניר
                      </button>
                      <button className="btn btn-glass" onClick={restart}>לעשות שוב</button>
                    </div>
                    <p className="legal-note">הבדיקה נותנת כיוון בלבד ואינה ייעוץ פיננסי, השקעות או מס.</p>
                  </div>
                ) : null}
              </section>

              {/* ---------- the quarterly workshop ---------- */}
              <section className="ws-feature gb" aria-labelledby="ws-h">
                <div className="ws-copy">
                  <span className="ws-tag"><Icon name="calendar" size={15} /> {WORKSHOP.cadence} · {WORKSHOP.perYear} מפגשים בשנה · {WORKSHOP.hours} שעות עם ניר</span>
                  <h2 id="ws-h" className="h-display">{WORKSHOP.name}</h2>
                  <p className="ws-sub gold">{WORKSHOP.subtitle}</p>
                  <p>{WORKSHOP.about}</p>
                  <div className="ws-foot">
                    <span className="ws-date"><Icon name="clock" size={15} /> {workshopDateLabel()}</span>
                    {paid ? (
                      <span className="muted ws-note">ההזמנה תגיע אליך בוואטסאפ ובמייל.</span>
                    ) : (
                      <Link className="btn btn-primary btn-sm" href="/plans">הסדנה כלולה בכל מסלול <Icon name="arrowLeft" size={16} className="ico-move" /></Link>
                    )}
                  </div>
                </div>
                <ul className="ws-topics" aria-label="מה עושים בסדנה">
                  {WORKSHOP.topics.map((t, i) => (
                    <li key={t}><span className="num">{String(i + 1).padStart(2, "0")}</span>{t}</li>
                  ))}
                </ul>
              </section>

              {/* ---------- money questions for the bot ---------- */}
              <section aria-labelledby="mq-h">
                <div className="mq-head">
                  <AiCore size={34} state="idle" />
                  <h2 id="mq-h">שאלות כסף לניר</h2>
                </div>
                <div className="starter-grid">
                  {MONEY_STARTERS.map((s) => (
                    <button key={s.b} className="starter gb" onClick={() => ask(s.t)}>
                      <b>{s.b}</b>
                      <span>{s.s}</span>
                      <Icon name="arrow" size={18} />
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

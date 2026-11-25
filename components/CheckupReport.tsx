"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "./Icon";
import { Brand } from "./BrandBar";
import { CallPicker } from "./OnboardingCard";
import Confetti from "./Confetti";
import { OPTION_SCORE, QUESTIONS, STATIONS, grade, scoreTone, type Profile, type Report, type Scores } from "@/lib/checkup";

type Props = { id: string; name: string; profile: Profile; answers: Record<string, number>; scores: Scores; total: number; report: Report; finishedAt: string; viewer: "owner" | "admin" };

export default function CheckupReport({ name, profile, answers, scores, total, report, finishedAt, viewer }: Props) {
  const g = grade(total);
  const [shown, setShown] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [called, setCalled] = useState(false);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1400);
      setShown(Math.round(total * (1 - Math.pow(1 - p, 3)) * 10) / 10);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [total]);

  const sorted = [...STATIONS].sort((a, b) => scores[a.id] - scores[b.id]);
  const date = new Date(finishedAt).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="ck ck-report">
      {viewer === "owner" && total >= 6 && <Confetti />}
      <header className="ck-top">
        <Brand sub={false} size={34} />
        <span className="ck-date">{viewer === "admin" ? "תצוגת נציג · " : ""}{date}</span>
        <Link href={viewer === "admin" ? "/admin" : "/home"} className="btn btn-ghost btn-sm">{viewer === "admin" ? "ל-CRM" : "לבית"}</Link>
      </header>

      <main className="ck-r">
        {/* ---------- hero score ---------- */}
        <section className="ck-r-hero">
          <div className="ck-r-hero-copy">
            <p className="eyebrow">הצ׳קאפ העסקי · {profile.business || "העסק שלך"}{profile.field ? ` · ${profile.field}` : ""}</p>
            <h1 className="h-display ck-r-h1">{name ? `${name}, ` : ""}העסק שלך<br /><span className={`ck-grade t-${g.tone}`}>{g.word}</span></h1>
            <p className="ck-lede">{report.headline}</p>
            <div className="ck-meta">
              {profile.years && <span>{profile.years}</span>}
              {profile.team && <span>צוות: {profile.team}</span>}
              {profile.revenue && <span>{profile.revenue}</span>}
              {profile.goal && <span><Icon name="target" size={14} /> {profile.goal}</span>}
            </div>
          </div>
          <div className="ck-r-ring"><ScoreRing value={shown} total={total} tone={g.tone} /></div>
        </section>

        {/* ---------- alpha wheel + scorecard ---------- */}
        <section className="ck-r-grid">
          <div className="ck-r-wheel glass edge">
            <p className="eyebrow">מפת האלפא שלך</p>
            <AlphaWheel scores={scores} />
            <div className="ck-legend"><span className="t-bad">1–4 חירום</span><span className="t-warn">4–6 סיכון</span><span className="t-mid">6–8 דליפות</span><span className="t-ok">8–10 חזק</span></div>
          </div>
          <div className="ck-r-card glass edge">
            <p className="eyebrow">ציון לכל פרמטר</p>
            <ul className="ck-score-list">
              {STATIONS.map((s) => {
                const qs = QUESTIONS.filter((q) => q.station === s.id);
                const isOpen = open === s.id;
                return (
                  <li key={s.id} className={isOpen ? "open" : ""}>
                    <button className="ck-score-row" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen}>
                      <span className="ck-sn">{s.n}</span>
                      <span className="ck-sl">{s.label}</span>
                      <span className="ck-bar"><i className={`t-${scoreTone(scores[s.id])}`} style={{ width: `${scores[s.id] * 10}%` }} /></span>
                      <b className={`t-${scoreTone(scores[s.id])}`}>{scores[s.id]}</b>
                      <Icon name="chevron" size={16} className="ck-chev" />
                    </button>
                    {isOpen && (
                      <div className="ck-score-more">
                        <ul className="ck-params">
                          {qs.map((q) => { const v = OPTION_SCORE[answers[q.id] ?? 0]; return <li key={q.id}><span>{q.param}</span><b className={`t-${scoreTone(v)}`}>{v}/10</b></li>; })}
                        </ul>
                        <p className="ck-good"><Icon name="check" size={15} /> {report.feedback[s.id].good}</p>
                        <p className="ck-fix"><Icon name="alert" size={15} /> {report.feedback[s.id].fix}</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ---------- top 3 ---------- */}
        <section className="ck-r-sec">
          <p className="eyebrow">3 המהלכים שיזיזו לך את 2027</p>
          <h2 className="h-display ck-h2">מתחילים מהדליפות הגדולות</h2>
          <div className="ck-top3">
            {report.top3.map((m, i) => (
              <article key={i} className="ck-move glass edge">
                <span className="ck-move-n">{i + 1}</span>
                <h3>{m.title}</h3>
                <p>{m.why}</p>
                <p className="ck-move-act"><Icon name="arrowLeft" size={15} /> {m.action}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ---------- the 2027 plan ---------- */}
        <section className="ck-plan">
          <div className="ck-plan-head">
            <p className="eyebrow">התוכנית העסקית שלך</p>
            <h2 className="h-display ck-h2 ck-year">2027</h2>
            <p className="ck-plan-goal">{report.plan.goal}</p>
          </div>
          <div className="ck-north">
            {report.plan.north_star.map((n, i) => <div key={i}><small>{n.label}</small><b>{n.value}</b></div>)}
          </div>

          <div className="ck-quarters">
            {report.plan.quarters.map((q, i) => (
              <article key={i} className="ck-quarter">
                <span className="ck-qn">Q{i + 1}</span>
                <small>{q.q}</small>
                <h3>{q.theme}</h3>
                <ul>{q.actions.map((a, j) => <li key={j}>{a}</li>)}</ul>
              </article>
            ))}
          </div>

          <div className="ck-r-grid">
            <div className="ck-r-card glass edge">
              <p className="eyebrow">90 הימים הראשונים</p>
              <ol className="ck-90">{report.plan.first90.map((f, i) => <li key={i}><Check90 /><span><small>{f.when}</small>{f.task}</span></li>)}</ol>
            </div>
            <div className="ck-r-card glass edge">
              <p className="eyebrow">המדדים שאתה מודד כל שבוע</p>
              <div className="ck-kpi-wrap">
                <table className="ck-kpis">
                  <thead><tr><th>מדד</th><th>היום</th><th>יעד 2027</th></tr></thead>
                  <tbody>{report.plan.kpis.map((k, i) => <tr key={i}><td>{k.name}</td><td>{k.now}</td><td><b>{k.target}</b></td></tr>)}</tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="ck-capital glass edge">
            <div className="ck-capital-ico"><Icon name="vault" size={26} /></div>
            <div>
              <p className="eyebrow">הון ונדל״ן · ציון {scores.capital}/10</p>
              <h3>תוכנית ההון שלך ל-10 השנים הקרובות</h3>
              <p>{report.plan.capital.verdict}</p>
              <ol>{report.plan.capital.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </div>
          </div>
        </section>

        {/* ---------- Nir's note ---------- */}
        <section className="ck-note">
          <img src="/nir/home-yes.webp" alt="ניר דובדבני" />
          <blockquote>
            <p>״{report.nir_note}״</p>
            <cite>ניר דובדבני</cite>
          </blockquote>
        </section>

        {/* ---------- CTA ---------- */}
        {viewer === "owner" ? (
          <section className="ck-cta glass edge">
            <div>
              <p className="eyebrow">עכשיו, ביצוע</p>
              <h2 className="h-display ck-h2">תוכנית בלי יישום נשארת על הנייר</h2>
              <p>יועץ מהצוות שלי יעבור איתך על התוכנית ויראה לך איך מיישמים אותה. רבע שעה, במתנה. בחר מתי נוח שנתקשר:</p>
              {called ? <p className="ck-good"><Icon name="check" size={16} /> נקבע. נתקשר אליך בזמן שבחרת.</p> : <CallPicker onPicked={() => setCalled(true)} />}
            </div>
            <div className="ck-cta-side">
              <small>מעדיף ליישם לבד, עם השיטה שלי 24/6?</small>
              <Link className="btn btn-primary" href="/plans">למסלולים <Icon name="arrowLeft" size={16} /></Link>
              <Link className="btn btn-glass" href="/chat">לעבוד על מהלך 1 עם הבוט</Link>
            </div>
          </section>
        ) : (
          <section className="ck-cta glass edge">
            <div>
              <p className="eyebrow">לנציג · איך פותחים את השיחה</p>
              <p>״ראיתי את הצ׳קאפ שעשית. יצא לך {total}/10, והדליפה הכי גדולה אצלך היא {sorted[0].label}. בניתי לך בתוכנית צעד ראשון לזה: {report.top3[0]?.action}. בוא נראה איך מיישמים את זה, במסלול או בפגישה עם יועץ.״</p>
            </div>
          </section>
        )}

        <footer className="ck-foot">
          <Link href="/checkup">צ׳קאפ חדש</Link>
          <span>התוכנית מבוססת על התשובות שלך ונועדה לכוון. היא לא ייעוץ פיננסי, משפטי או השקעות.</span>
        </footer>
      </main>
    </div>
  );
}

function Check90() {
  const [on, setOn] = useState(false);
  return <button className={`ck-cb ${on ? "on" : ""}`} onClick={() => setOn(!on)} aria-pressed={on} aria-label="סמן כבוצע">{on && <Icon name="check" size={13} />}</button>;
}

function ScoreRing({ value, total, tone }: { value: number; total: number; tone: string }) {
  const r = 92, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 220 220" width="100%" height="100%" role="img" aria-label={`ציון ${total} מתוך 10`}>
      <defs><linearGradient id="ckr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f8ecd0" /><stop offset=".5" stopColor="#e2c68e" /><stop offset="1" stopColor="#8c6f42" /></linearGradient></defs>
      <circle cx="110" cy="110" r={r + 14} fill="none" stroke="rgba(226,198,142,.12)" strokeWidth="1" strokeDasharray="2 6" />
      <circle cx="110" cy="110" r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="12" />
      <circle cx="110" cy="110" r={r} fill="none" stroke="url(#ckr)" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 10)} transform="rotate(-90 110 110)" />
      <text x="110" y="122" textAnchor="middle" fill="#f6e6c2" fontFamily="Karantina, sans-serif" fontSize="84" fontWeight="700">{value.toFixed(1)}</text>
      <text x="110" y="152" textAnchor="middle" className={`t-${tone}`} fill="currentColor" fontFamily="Assistant, sans-serif" fontSize="15" fontWeight="800">מתוך 10</text>
    </svg>
  );
}

/** 10 radial petals, one per station, length = score. */
function AlphaWheel({ scores }: { scores: Scores }) {
  const cx = 160, cy = 160, r0 = 34, R = 128;
  const n = STATIONS.length;
  const col = (s: number) => (s >= 8 ? "#8fd9b4" : s >= 6 ? "#e2c68e" : s >= 4 ? "#f0a96a" : "#ff8d8d");
  const arc = (a0: number, a1: number, rr: number) => {
    const p = (a: number, rad: number) => `${cx + rad * Math.sin(a)},${cy - rad * Math.cos(a)}`;
    return `M${p(a0, r0)} L${p(a0, rr)} A${rr},${rr} 0 0 1 ${p(a1, rr)} L${p(a1, r0)} A${r0},${r0} 0 0 0 ${p(a0, r0)}Z`;
  };
  return (
    <svg viewBox="0 0 320 320" className="ck-wheel" role="img" aria-label="ציונים לפי תחנה">
      {[2, 4, 6, 8, 10].map((v) => <circle key={v} cx={cx} cy={cy} r={r0 + ((R - r0) * v) / 10} fill="none" stroke="rgba(255,255,255,.06)" />)}
      {STATIONS.map((s, i) => {
        const a0 = (i / n) * 2 * Math.PI + 0.03, a1 = ((i + 1) / n) * 2 * Math.PI - 0.03;
        const rr = r0 + ((R - r0) * Math.max(0.6, scores[s.id])) / 10;
        const mid = (a0 + a1) / 2;
        const lx = cx + (R + 16) * Math.sin(mid), ly = cy - (R + 16) * Math.cos(mid);
        return (
          <g key={s.id}>
            <path d={arc(a0, a1, R)} fill="rgba(255,255,255,.025)" />
            <path d={arc(a0, a1, rr)} fill={col(scores[s.id])} fillOpacity=".85" className="ck-petal" style={{ animationDelay: `${i * 70}ms` }} />
            <text x={lx} y={ly + 4} textAnchor="middle" fontSize="12" fontWeight="800" fill="#c2b9a8" fontFamily="Assistant, sans-serif">{s.n}</text>
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={r0 - 4} fill="#0c0c0e" stroke="rgba(226,198,142,.35)" />
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize="18" fontWeight="700" fill="#e2c68e" fontFamily="Karantina, sans-serif">ALPHA</text>
    </svg>
  );
}

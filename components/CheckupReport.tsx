"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Icon from "./Icon";
import { Brand } from "./BrandBar";
import { CallPicker } from "./OnboardingCard";
import Confetti from "./Confetti";
import { PART_LABEL, QUESTIONS, STATIONS, answerScore, grade, leaks, nis, partScores, scoreTone, stationsIn, type Profile, type Report, type Scores } from "@/lib/checkup";
import { renderCheckupCard } from "@/lib/checkupCard";

type Props = { token: string; loggedIn: boolean; name: string; profile: Profile; answers: Record<string, number>; scores: Scores; total: number; report: Report; finishedAt: string; viewer: "owner" | "admin"; bench?: { n: number; avg: number; totals: number[] } | null };

export default function CheckupReport({ token, loggedIn, name, profile, answers, scores, total, report, finishedAt, viewer, bench }: Props) {
  const lk = leaks(profile, scores);
  const ST = stationsIn(scores);
  const ps = partScores(scores);
  const hasMe = ST.some((s) => s.part === "me");
  const pct = bench ? Math.round((bench.totals.filter((t) => t < total).length / bench.n) * 100) : null;
  const [intro, setIntro] = useState(false);
  const [asked, setAsked] = useState<Record<number, "busy" | "done">>({});
  useEffect(() => {
    if (viewer === "owner" && new URLSearchParams(window.location.search).get("new") === "1") {
      setIntro(true);
      const t = setTimeout(() => setIntro(false), 4200);
      window.history.replaceState(null, "", window.location.pathname);
      return () => clearTimeout(t);
    }
  }, [viewer]);
  async function askAdvisor(i: number, move: string) {
    setAsked((a) => ({ ...a, [i]: "busy" }));
    try { await fetch("/api/checkup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "callback", token, move }) }); } catch {}
    setAsked((a) => ({ ...a, [i]: "done" }));
  }
  const [card, setCard] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/checkup/r/${token}` : "";
  async function makeCard() {
    setBusy(true);
    const b = await renderCheckupCard({ total, scores, business: profile.business });
    setBusy(false);
    if (!b) return;
    const f = new File([b], "checkup-2027.png", { type: "image/png" });
    const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
    if (nav.canShare?.({ files: [f] })) { try { await navigator.share({ files: [f], title: "הצ׳קאפ שלי ל-2027" }); return; } catch {} }
    setCard(URL.createObjectURL(b));
  }
  useEffect(() => {
    const els = document.querySelectorAll(".ck-r .ck-rv");
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    const safety = setTimeout(() => els.forEach((el) => el.classList.add("in")), 4000);
    return () => { io.disconnect(); clearTimeout(safety); };
  }, []);
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

  const sorted = [...ST].sort((a, b) => scores[a.id] - scores[b.id]);
  const date = new Date(finishedAt).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="ck ck-report">
      {intro && <Reveal total={total} word={g.word} leak={lk.total} />}
      {viewer === "owner" && !intro && <Confetti />}
      <header className="ck-top">
        <Brand sub={false} size={34} />
        <span className="ck-date">{viewer === "admin" ? "תצוגת נציג · " : ""}{date}</span>
        <Link href={viewer === "admin" ? "/admin" : loggedIn ? "/home" : "/"} className="btn btn-ghost btn-sm">{viewer === "admin" ? "ל-CRM" : "לבית"}</Link>
      </header>

      <main className="ck-r">
        {/* ---------- hero score ---------- */}
        <section className="ck-r-hero">
          <div className="ck-r-hero-copy">
            <p className="eyebrow">{hasMe ? "הצ׳קאפ האישי והעסקי" : "הצ׳קאפ העסקי"} · {profile.business || "העסק שלך"}{profile.field ? ` · ${profile.field}` : ""}</p>
            <h1 className="h-display ck-r-h1">{name ? `${name}, ` : ""}{hasMe ? "אתה והעסק" : "העסק שלך"}<br /><span className={`ck-grade t-${g.tone}`}>{g.word}</span></h1>
            <p className="ck-lede">{report.headline}</p>
            <div className="ck-meta">
              {profile.years && <span>{profile.years}</span>}
              {profile.team && <span>צוות: {profile.team}</span>}
              {profile.revenue && <span>{profile.revenue}</span>}
              {profile.home && profile.home !== "מעדיף לא לציין" && <span>בית: {profile.home}</span>}
              {profile.goal && <span><Icon name="target" size={14} /> {profile.goal}</span>}
            </div>
            {(lk.total > 0 || pct !== null || hasMe) && (
              <div className="ck-r-facts">
                {hasMe && <div className="ck-fact"><small>ציון עסקי · ציון אישי</small><b><span className={`t-${scoreTone(ps.biz)}`}>{ps.biz}</span> · <span className={`t-${scoreTone(ps.me)}`}>{ps.me}</span></b><em>{ps.me < ps.biz ? "העסק לפניך. הגיע הזמן שגם אתה תרוויח ממנו" : "אתה מסודר. עכשיו מאיצים את העסק"}</em></div>}
                {lk.total > 0 && <div className="ck-fact bad"><small>הדליפה המשוערת</small><b>{nis(lk.total)}</b><em>בחודש · {nis(lk.total * 12)} בשנה</em></div>}
                {pct !== null && <div className="ck-fact"><small>מול {bench!.n} עסקים בתחום שלך</small><b>{pct}%</b><em>קיבלו ציון נמוך משלך · ממוצע {bench!.avg}</em></div>}
              </div>
            )}
          </div>
          <div className="ck-r-ring"><ScoreRing value={shown} total={total} tone={g.tone} /></div>
        </section>

        <nav className="ck-actions ck-rv" aria-label="פעולות">
          <a className="ck-act" href={`/checkup/r/${token}/print`} target="_blank" rel="noopener"><Icon name="download" size={18} /><span>PDF של התוכנית</span></a>
          <button className="ck-act" onClick={makeCard} disabled={busy}><Icon name="image" size={18} /><span>{busy ? "מכין..." : "כרטיס לסטורי"}</span></button>
          <a className="ck-act" href={`https://wa.me/?text=${encodeURIComponent(`עשיתי את הצ׳קאפ האישי והעסקי של ניר דובדבני ויצא לי ${total}/10. אתה עוקף אותי? בדוק כמה אתה והעסק שלך מוכנים ל-2027: https://dubdebot.vercel.app/checkup?ref=${token}`)}`} target="_blank" rel="noopener"><Icon name="share" size={18} /><span>שתף בוואטסאפ</span></a>
          <button className="ck-act" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {} }}><Icon name={copied ? "check" : "link"} size={18} /><span>{copied ? "הועתק" : "קישור לתוכנית"}</span></button>
        </nav>
        {card && (
          <div className="ck-cardmodal" onClick={() => setCard(null)}>
            <div onClick={(e) => e.stopPropagation()}>
              <img src={card} alt="כרטיס הציון" />
              <a className="btn btn-primary" href={card} download="checkup-2027.png">שמור תמונה</a>
              <button className="btn btn-ghost btn-sm" onClick={() => setCard(null)}>סגור</button>
            </div>
          </div>
        )}

        {/* ---------- alpha wheel + scorecard ---------- */}
        <section className="ck-r-grid ck-rv">
          <div className="ck-r-wheel glass edge">
            <p className="eyebrow">מפת האלפא שלך</p>
            <AlphaWheel scores={scores} stations={ST} />
            <div className="ck-legend"><span className="t-bad">1–4 חירום</span><span className="t-warn">4–6 סיכון</span><span className="t-mid">6–8 דליפות</span><span className="t-ok">8–10 חזק</span></div>
          </div>
          <div className="ck-r-card glass edge">
            <p className="eyebrow">ציון לכל פרמטר</p>
            <ul className="ck-score-list">
              {ST.map((s, i) => {
                const qs = QUESTIONS.filter((q) => q.station === s.id);
                const isOpen = open === s.id;
                const head = hasMe && (i === 0 || ST[i - 1].part !== s.part);
                return (
                  <li key={s.id} className={`${isOpen ? "open" : ""}${head ? " ck-parthead" : ""}`} data-part={head ? `${PART_LABEL[s.part]} · ${s.part === "biz" ? ps.biz : ps.me}/10` : undefined}>
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
                          {qs.map((q) => { const v = answerScore(q, answers[q.id]) ?? 1; return <li key={q.id}><span>{q.param}</span><b className={`t-${scoreTone(v)}`}>{v}/10</b></li>; })}
                        </ul>
                        {report.feedback[s.id] && <>
                          <p className="ck-good"><Icon name="check" size={15} /> {report.feedback[s.id].good}</p>
                          <p className="ck-fix"><Icon name="alert" size={15} /> {report.feedback[s.id].fix}</p>
                        </>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ---------- top 3 ---------- */}
        <section className="ck-r-sec ck-rv">
          <p className="eyebrow">3 המהלכים שיזיזו לך את 2027</p>
          <h2 className="h-display ck-h2">מתחילים מהדליפות הגדולות</h2>
          <div className="ck-top3">
            {report.top3.map((m, i) => (
              <article key={i} className="ck-move glass edge">
                <span className="ck-move-n">{i + 1}</span>
                <h3>{m.title}</h3>
                <p>{m.why}</p>
                <p className="ck-move-act"><Icon name="arrowLeft" size={15} /> {m.action}</p>
                {(lk.per[(STATIONS.find((s) => s.label === m.title)?.id ?? "vision")] ?? 0) > 0 && <p className="ck-move-cost">שווה לך כ-{nis(lk.per[STATIONS.find((s) => s.label === m.title)!.id] * 12)} בשנה</p>}
                {viewer === "owner" && (asked[i] === "done"
                  ? <p className="ck-good"><Icon name="check" size={15} /> קיבלנו. יועץ יחזור אליך היום.</p>
                  : <button className="ck-move-btn" disabled={asked[i] === "busy"} onClick={() => askAdvisor(i, m.title)}>ליישם את זה עם יועץ <Icon name="arrowLeft" size={15} /></button>)}
              </article>
            ))}
          </div>
        </section>

        {/* ---------- the 2027 plan ---------- */}
        <section className="ck-plan ck-rv">
          <div className="ck-plan-head">
            <p className="eyebrow">{hasMe ? "התוכנית העסקית והאישית שלך" : "התוכנית העסקית שלך"}</p>
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

          <div className="ck-r-grid ck-rv">
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

          {report.plan.personal && (
            <div className="ck-capital ck-personal glass edge">
              <div className="ck-capital-ico"><Icon name="target" size={26} /></div>
              <div>
                <p className="eyebrow">התוכנית האישית · ציון אישי {ps.me}/10</p>
                <h3>אתה, לא רק העסק: התוכנית שלך ל-2027</h3>
                <p>{report.plan.personal.goal}</p>
                <ol>{report.plan.personal.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                {(["household", "credit", "future"] as const).some((id) => (scores[id] ?? 10) < 6) && <p className="ck-move-cost">מומלץ: בדיקת משכנתא, אשראי ופנסיה עם יועץ מהצוות של ניר. לחיצה על ״ליישם עם יועץ״ במהלכים למעלה, או בשיחה עם הנציג.</p>}
              </div>
            </div>
          )}

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
        <section className="ck-note ck-rv">
          <img src="/nir/home-yes.webp" alt="ניר דובדבני" />
          <blockquote>
            <p>״{report.nir_note}״</p>
            <cite>ניר דובדבני</cite>
          </blockquote>
        </section>

        {/* ---------- CTA ---------- */}
        {viewer === "owner" ? (
          <section className="ck-cta glass edge ck-rv">
            <div>
              <p className="eyebrow">עכשיו, ביצוע</p>
              <h2 className="h-display ck-h2">תוכנית בלי יישום נשארת על הנייר</h2>
              <p>יועץ מהצוות שלי יעבור איתך על התוכנית ויראה לך איך מיישמים אותה. רבע שעה, במתנה. בחר מתי נוח שנתקשר:</p>
              {!loggedIn ? <p className="ck-good"><Icon name="phone" size={16} /> יועץ מהצוות של ניר יתקשר אליך בימים הקרובים כדי לעבור איתך על התוכנית.</p> : called ? <p className="ck-good"><Icon name="check" size={16} /> נקבע. נתקשר אליך בזמן שבחרת.</p> : <CallPicker onPicked={() => setCalled(true)} />}
            </div>
            <div className="ck-cta-side">
              <small>מעדיף ליישם לבד, עם השיטה שלי 24/6?</small>
              {loggedIn ? <>
                <Link className="btn btn-primary" href="/plans">למסלולים <Icon name="arrowLeft" size={16} /></Link>
                <Link className="btn btn-glass" href="/chat">לעבוד על מהלך 1 עם הבוט</Link>
              </> : <>
                <Link className="btn btn-primary" href="/?from=checkup#signup">30 יום ייעוץ עסקי במתנה <Icon name="arrowLeft" size={16} /></Link>
                <small>הבוט של ניר יעבוד איתך על התוכנית הזאת, צעד אחרי צעד.</small>
              </>}
            </div>
          </section>
        ) : (
          <section className="ck-cta glass edge ck-rv">
            <div>
              <p className="eyebrow">לנציג · איך פותחים את השיחה</p>
              {hasMe && <p><b>מסלול:</b> {sorted[0].part === "me" ? "אישי → בדיקת משכנתא / נדל״ן / כלכלת משפחה" : "עסקי → פלטפורמה / ליווי"} · עסקי {ps.biz} · אישי {ps.me}</p>}
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

/** Radial petals, one per station, length = score. */
function AlphaWheel({ scores, stations }: { scores: Scores; stations: typeof STATIONS }) {
  const cx = 160, cy = 160, r0 = 34, R = 128;
  const n = stations.length;
  const col = (s: number) => (s >= 8 ? "#8fd9b4" : s >= 6 ? "#e2c68e" : s >= 4 ? "#f0a96a" : "#ff8d8d");
  const arc = (a0: number, a1: number, rr: number) => {
    const p = (a: number, rad: number) => `${cx + rad * Math.sin(a)},${cy - rad * Math.cos(a)}`;
    return `M${p(a0, r0)} L${p(a0, rr)} A${rr},${rr} 0 0 1 ${p(a1, rr)} L${p(a1, r0)} A${r0},${r0} 0 0 0 ${p(a0, r0)}Z`;
  };
  return (
    <svg viewBox="0 0 320 320" className="ck-wheel" role="img" aria-label="ציונים לפי תחנה">
      {[2, 4, 6, 8, 10].map((v) => <circle key={v} cx={cx} cy={cy} r={r0 + ((R - r0) * v) / 10} fill="none" stroke="rgba(255,255,255,.06)" />)}
      {stations.map((s, i) => {
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


/** Full-screen climax when the plan opens for the first time. */
function Reveal({ total, word, leak }: { total: number; word: string; leak: number }) {
  const [n, setN] = useState(0);
  const [stage, setStage] = useState(0);
  useEffect(() => {
    let raf = 0; const t0 = performance.now() + 500;
    const f = (t: number) => { const p = Math.max(0, Math.min(1, (t - t0) / 1600)); setN(Math.round(total * (1 - Math.pow(1 - p, 4)) * 10) / 10); if (p < 1) raf = requestAnimationFrame(f); else setStage(1); };
    raf = requestAnimationFrame(f);
    const t2 = setTimeout(() => setStage(2), 3200);
    return () => { cancelAnimationFrame(raf); clearTimeout(t2); };
  }, [total]);
  return (
    <div className={`ck-reveal s${stage}`} aria-live="polite">
      <div className="ck-reveal-rays" aria-hidden />
      <p>הציון שלך ל-2027</p>
      <b>{n.toFixed(1)}</b>
      <h2 className={stage ? "on" : ""}>{word}</h2>
      {leak > 0 && <em className={stage ? "on" : ""}>דליפה משוערת: {nis(leak)} בחודש</em>}
      <small className={stage ? "on" : ""}>התוכנית שלך ל-2027 נפתחת...</small>
    </div>
  );
}

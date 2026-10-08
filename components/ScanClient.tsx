"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Mascot from "./Mascot";
import NirPose from "./NirPose";
import Icon from "./Icon";
import Spotlight from "./Spotlight";
import { Brand } from "./BrandBar";
import { prepareFile, Prepared } from "@/lib/attach";
import type { ScanReport } from "@/lib/scan";
import { DISCLAIMER_SHORT } from "@/lib/disclaimer";

const PLATFORMS: [string, RegExp][] = [
  ["אינסטגרם", /instagram\.com|^@/i],
  ["פייסבוק", /facebook\.com|fb\.com/i],
  ["טיקטוק", /tiktok\.com/i],
  ["לינקדאין", /linkedin\.com/i],
  ["יוטיוב", /youtube\.com|youtu\.be/i],
  ["אתר", /^(?!.*(instagram|facebook|tiktok|linkedin|youtube|youtu\.be))[\w-]+\.[\w.]+/i],
];
const STEPS = ["פותח את הפרופיל", "קורא את הביו וההצעה", "בודק את התוכן וההוקים", "מחפש CTA ומשפך", "משווה לשיטה של ניר", "כותב לך את השורה התחתונה"];

export default function ScanClient() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [shots, setShots] = useState<Prepared[]>([]);
  const [phase, setPhase] = useState<"start" | "run" | "done">("start");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [data, setData] = useState<{ report: ScanReport; url: string; deliverableId: string | null } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase !== "run") return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(STEPS.length - 1, s + 1)), 4200);
    return () => clearInterval(t);
  }, [phase]);

  async function addShots(list: FileList) {
    const out: Prepared[] = [];
    for (const f of Array.from(list).slice(0, 4 - shots.length)) {
      if (!f.type.startsWith("image/")) continue;
      try {
        out.push(await prepareFile(f));
      } catch {}
    }
    setShots((s) => [...s, ...out]);
  }

  async function run(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return setError("הדבק קישור לפרופיל או לאתר");
    setError("");
    setPhase("run");
    const r = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, shots: shots.map((s) => ({ mime: s.mime, data: s.data })) }),
    }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : { error: "אין חיבור כרגע. נסה שוב." };
    if (r?.status === 402) return window.location.reload();
    if (!r || !r.ok) {
      setError(j.error ?? "משהו השתבש. נסה שוב.");
      setPhase("start");
      return;
    }
    setData(j);
    setPhase("done");
    window.scrollTo({ top: 0 });
  }

  function discuss() {
    if (!data) return;
    const r = data.report;
    const msg = `עשיתי סריקה ל${r.display_name || r.handle} (${data.url}). ציון ${r.score}/100.
הכשלים שעלו: ${r.failures.map((f) => f.title).join("; ")}.
תבנה לי תוכנית תיקון ל-30 יום, עם לו"ז תוכן שבועי ו-3 הוקים מוכנים לכל שבוע.`;
    try {
      sessionStorage.setItem("dd_prompt", msg);
    } catch {}
    router.push("/chat?new=1");
  }

  const detected = PLATFORMS.find(([, re]) => re.test(url.trim()))?.[0];
  const r = data?.report;

  return (
    <>
      <Spotlight />
      <div className="xr">
        <header className="xr-top">
          <Brand sub={false} size={34} />
          <span />
          <Link href="/chat" className="icon-btn" aria-label="סגירה"><Icon name="close" size={20} /></Link>
        </header>

        <main className="xr-stage">
          {phase === "start" && (
            <div className="scan-start">
              <NirPose pose="leads" width={150} className="scan-nir" eager />
              <span className="eyebrow">סריקת רשתות חברתיות</span>
              <h1 className="h-display">איפה אתה <span className="gold">נכשל שיווקית?</span></h1>
              <p className="lead" style={{ margin: 0 }}>מדביקים קישור לפרופיל. דובדבוט סורק את הביו, ההצעה, התוכן וה-CTA – ואומר לך בדיוק מה מבריח לקוחות ומה לתקן היום.</p>
              <form className="scan-form glass edge" onSubmit={run}>
                <div className="url-box">
                  <Icon name="link" size={20} />
                  <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="instagram.com/your_business" aria-label="קישור לפרופיל" inputMode="url" autoFocus />
                  <button className="btn btn-primary btn-sm" type="submit">לסרוק <Icon name="radar" size={16} /></button>
                </div>
                <div className="platforms">
                  {PLATFORMS.map(([name]) => <span key={name} className={detected === name ? "on" : ""}>{name}</span>)}
                </div>
                <div className="field">
                  <label>רוצה סריקה מדויקת יותר? צרף 1–4 צילומי מסך של הפרופיל (לא חובה)</label>
                  <div className="shots">
                    {shots.map((s) => (
                      <span className="shot" key={s.id}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.preview} alt="" />
                        <button type="button" onClick={() => setShots((x) => x.filter((y) => y.id !== s.id))} aria-label="הסרה"><Icon name="close" size={12} /></button>
                      </span>
                    ))}
                    {shots.length < 4 && (
                      <button type="button" className="shot-add" onClick={() => fileRef.current?.click()} aria-label="הוספת צילום מסך"><Icon name="plus" size={20} /></button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) addShots(e.target.files); e.target.value = ""; }} />
                  </div>
                </div>
                {error && <span className="err">{error}</span>}
              </form>
              <p className="muted" style={{ fontSize: 14, margin: 0 }}>רשתות חברתיות מסתירות חלק מהמידע ממי שלא מחובר. צילומי מסך של הביו ושל 6–9 הפוסטים האחרונים נותנים את התמונה הכי מלאה.</p>
            </div>
          )}

          {phase === "run" && (
            <div className="scan-run">
              <div className="scan-ring"><Mascot size={110} mood="thinking" track={false} /></div>
              <h2 className="h-display">סורק<span className="gold">…</span></h2>
              <ul className="scan-steps">
                {STEPS.map((s, i) => (
                  <li key={s} className={i < step ? "done" : i === step ? "on" : ""}>
                    <i>{i < step && <Icon name="check" size={12} stroke={2.6} />}</i> {s}
                  </li>
                ))}
              </ul>
              <p className="muted" style={{ margin: 0 }}>זה לוקח פחות מדקה.</p>
            </div>
          )}

          {phase === "done" && r && data && (
            <div className="report">
              <section className="rep-head glass edge">
                <NirPose pose={r.score >= 70 ? "celebrate" : "alarm"} width={130} />
                <div>
                  <span className="eyebrow">{r.handle}</span>
                  <h2 className="h-display">{r.display_name || "השורה התחתונה"}</h2>
                  <p>{r.summary}</p>
                  {r.stats.length > 0 && (
                    <div className="rep-stats">{r.stats.map((s) => <span key={s.label}>{s.label}: <b>{s.value}</b></span>)}</div>
                  )}
                </div>
                <div className="rep-score">
                  <b className="gold num">{r.score}</b>
                  <small>ציון שיווקי / 100</small>
                </div>
              </section>

              <section className="rep-card glass edge half">
                <h3><Icon name="alert" size={22} /> איפה אתה נכשל</h3>
                <div>
                  {r.failures.map((f, i) => (
                    <div className="fail" key={i}>
                      <span className="fail-n">{i + 1}</span>
                      <div>
                        <b>{f.title}</b>
                        <p>{f.why}</p>
                        <div className="fix"><Icon name="arrow" size={15} /> {f.fix}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rep-card glass edge half">
                <h3><Icon name="chart" size={22} /> ציון לפי קטגוריה</h3>
                <div className="cat-list">
                  {r.categories.map((c, i) => (
                    <div className="cat" key={c.name}>
                      <span>{c.name}</span>
                      <b>{c.score}</b>
                      <span className="track"><i className={c.score < 45 ? "low" : ""} style={{ width: `${Math.max(4, c.score)}%`, animationDelay: `${0.1 + i * 0.07}s` }} /></span>
                      <small>{c.note}</small>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rep-card glass edge half">
                <h3><Icon name="bolt" size={22} /> מה עושים היום</h3>
                <ul className="wins">{r.quick_wins.map((w) => <li key={w}><Icon name="check" size={16} /> {w}</li>)}</ul>
                <small className="muted">המשימות נשמרו לך בתיק העסקי.</small>
              </section>

              <section className="rep-card glass edge half">
                <h3><Icon name="spark" size={22} /> 3 רעיונות לתוכן</h3>
                <div style={{ display: "grid", gap: 10 }}>
                  {r.ideas.map((i) => (
                    <div className="idea" key={i.hook}>
                      <small>{i.format}</small>
                      <b>״{i.hook}״</b>
                      <span>{i.why}</span>
                    </div>
                  ))}
                </div>
              </section>

              <div className="rep-actions">
                <button className="btn btn-primary btn-lg" onClick={discuss}>תוכנית תיקון ל-30 יום <Icon name="arrow" size={18} className="ico-move" /></button>
                <Link className="btn btn-glass btn-lg" href="/vault"><Icon name="vault" size={18} /> לתיק העסקי</Link>
                <button className="btn btn-ghost" onClick={() => { setPhase("start"); setData(null); setShots([]); }}>סריקה נוספת</button>
              </div>
              <p className="rep-note">{r.data_note} · רמת ודאות: {r.confidence === "high" ? "גבוהה" : r.confidence === "low" ? "נמוכה" : "בינונית"}<br />{DISCLAIMER_SHORT}</p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

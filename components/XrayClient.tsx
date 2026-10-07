"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Mascot, { Mood } from "./Mascot";
import Icon from "./Icon";
import Radar from "./Radar";
import Spotlight from "./Spotlight";
import Confetti from "./Confetti";
import { Brand } from "./BrandBar";
import { AXES, QUESTIONS, archetype, insights, score } from "@/lib/xray";
import { renderShareCard } from "@/lib/shareCard";

export default function XrayClient({ loggedIn }: { loggedIn: boolean }) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);
  const [card, setCard] = useState<{ url: string; blob: Blob } | null>(null);
  const [cardBusy, setCardBusy] = useState(false);
  const mascotRef = useRef<HTMLDivElement>(null);

  const q = QUESTIONS[idx];
  const axis = q ? AXES.find((a) => a.id === q.axis)! : null;
  const result = useMemo(() => (done ? score(answers) : null), [done, answers]);
  const arch = result ? archetype(result.total) : null;
  const ins = result ? insights(result.scores) : null;

  const choose = useCallback(
    (v: number) => {
      if (leaving || !q) return;
      const next = { ...answers, [q.id]: v };
      setAnswers(next);
      setLeaving(true);
      setTimeout(() => {
        setLeaving(false);
        if (idx < QUESTIONS.length - 1) setIdx(idx + 1);
        else finish(next);
      }, 380);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [answers, idx, leaving, q]
  );

  useEffect(() => {
    if (done) return;
    const on = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 4) choose(n - 1);
      if (e.key === "Backspace" && idx > 0) setIdx(idx - 1);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [choose, done, idx]);

  async function finish(all: Record<string, number>) {
    setDone(true);
    window.scrollTo({ top: 0 });
    try {
      sessionStorage.setItem("dd_xray", JSON.stringify(all));
    } catch {}
    const res = await fetch("/api/xray", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: all }),
    }).catch(() => null);
    const data = res && res.ok ? await res.json().catch(() => null) : null;
    if (data?.id) {
      setResultId(data.id);
      try {
        sessionStorage.setItem("dd_xray_id", data.id);
      } catch {}
    }
  }

  // build the share card once results are in
  useEffect(() => {
    if (!result || !arch || card || cardBusy) return;
    setCardBusy(true);
    const svg = mascotRef.current?.querySelector("svg") ?? null;
    renderShareCard({ total: result.total, archetype: arch.name, line: arch.line, scores: result.scores, mascotSvg: svg }).then((blob) => {
      if (blob) setCard({ blob, url: URL.createObjectURL(blob) });
      setCardBusy(false);
    });
  }, [result, arch, card, cardBusy]);

  async function share() {
    if (!card) return;
    const file = new File([card.blob], "dubdebot-xray.png", { type: "image/png" });
    const text = `עשיתי רנטגן עסקי בדובדבוט. יצאתי "${arch?.name}" עם ${result?.total}/100. כמה העסק שלך מקבל? ${location.origin}/xray`;
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], text }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
    fetch("/api/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "xray_shared", meta: {} }) }).catch(() => {});
  }

  function download() {
    if (!card) return;
    const a = document.createElement("a");
    a.href = card.url;
    a.download = "dubdebot-xray.png";
    a.click();
  }

  function getPlan() {
    if (loggedIn) router.push("/chat?xray=1");
    else router.push("/#signup");
  }

  const mood: Mood = done ? "celebrate" : leaving ? "thinking" : idx > 8 ? "wink" : "curious";
  const progress = done ? 100 : Math.round((idx / QUESTIONS.length) * 100);

  return (
    <>
      <Spotlight />
      <div className="xr">
        <header className="xr-top">
          <Brand sub={false} size={34} />
          <div className="xr-progress" aria-label={`התקדמות ${progress}%`}>
            <span className="num">{done ? "סיום" : `${idx + 1} / ${QUESTIONS.length}`}</span>
            <div className="xr-bar"><i style={{ width: `${progress}%` }} /></div>
          </div>
          <Link href={loggedIn ? "/chat" : "/"} className="icon-btn" aria-label="סגירה"><Icon name="close" size={20} /></Link>
        </header>

        <main className="xr-stage">
          {!done && q && axis && (
            <div key={q.id} className={`xr-q ${leaving ? "out" : ""}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div ref={mascotRef}><Mascot size={56} mood={mood} /></div>
                <span className="badge xr-axis">{axis.label}</span>
              </div>
              <h2 className="h-display">{q.q}</h2>
              {q.hint && <p className="hint">{q.hint}</p>}
              <div className="xr-opts" role="radiogroup" aria-label={q.q}>
                {q.options.map((o, i) => (
                  <button key={i} className="xr-opt" role="radio" aria-checked={answers[q.id] === i} aria-pressed={answers[q.id] === i} onClick={() => choose(i)}>
                    <kbd>{i + 1}</kbd>
                    <span>{o}</span>
                    <span className="meter" aria-hidden="true">
                      {[0, 1, 2].map((k) => <i key={k} className={k < i ? "on" : ""} />)}
                    </span>
                  </button>
                ))}
              </div>
              <div className="xr-nav">
                {idx > 0 ? (
                  <button className="btn btn-ghost btn-sm" onClick={() => setIdx(idx - 1)}><Icon name="arrowLeft" size={16} /> הקודמת</button>
                ) : <span />}
                <span>אפשר גם במקלדת: 1–4</span>
              </div>
            </div>
          )}

          {done && result && arch && ins && (
            <div className="xr-result">
              <section className="xr-score glass edge">
                <span className="eyebrow">הציון שלך</span>
                <div className="big">
                  <b className="gold num">{result.total}</b>
                  <span>/ 100</span>
                </div>
                <div className="xr-arch">
                  <span className="badge cherry">הפרופיל שלך</span>
                  <h3>{arch.name}</h3>
                  <p>{arch.line}</p>
                </div>
                <div className="axis-list">
                  {AXES.map((a, i) => (
                    <div className="axis-row" key={a.id}>
                      <span>{a.label}</span>
                      <span className="track">
                        <i className={result.scores[a.id] < 40 ? "low" : ""} style={{ width: `${Math.max(4, result.scores[a.id])}%`, animationDelay: `${0.2 + i * 0.08}s` }} />
                      </span>
                      <b>{result.scores[a.id]}</b>
                    </div>
                  ))}
                </div>
              </section>

              <section className="xr-radar glass edge">
                <Radar scores={result.scores} />
                <div style={{ position: "absolute", top: 20, insetInlineEnd: 20 }} ref={mascotRef}>
                  <Mascot size={64} mood="celebrate" track={false} />
                </div>
              </section>

              <section className="xr-insight glass edge">
                <Mascot size={72} mood="wink" track={false} />
                <div>
                  <span className="eyebrow">צוואר הבקבוק: {ins.weakest.label}</span>
                  <h4 style={{ marginTop: 10 }}>{ins.weakLine}</h4>
                  <p>הצד החזק שלך: {ins.strongLine}. עכשיו בוא נתקן את מה שמאט אותך.</p>
                </div>
                <button className="btn btn-primary btn-lg" onClick={getPlan}>
                  {loggedIn ? "תוכנית 30 יום מדובדבוט" : "קבל תוכנית 30 יום – חינם"} <Icon name="arrow" size={18} className="ico-move" />
                </button>
              </section>

              <section className="xr-share">
                {card ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="share-prev" src={card.url} alt="כרטיס הרנטגן שלי" />
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, justifyContent: "center", maxWidth: 320 }}>
                      <span className="eyebrow">כרטיס לשיתוף</span>
                      <h4 className="h-display" style={{ fontSize: 30 }}>תאתגר חבר בעל עסק.</h4>
                      <p className="muted" style={{ margin: 0 }}>מוכן לסטורי ולוואטסאפ, בפורמט 1080×1920.</p>
                      <button className="btn btn-primary" onClick={share}><Icon name="share" size={18} /> שיתוף</button>
                      <button className="btn btn-glass" onClick={download}><Icon name="download" size={18} /> הורדת תמונה</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setDone(false); setIdx(0); setAnswers({}); setCard(null); setResultId(null); }}>לעשות מחדש</button>
                    </div>
                  </>
                ) : (
                  <span className="shimmer">מכין לך כרטיס…</span>
                )}
              </section>
              {resultId && <input type="hidden" value={resultId} readOnly />}
            </div>
          )}
        </main>
      </div>
      {done && <Confetti />}
    </>
  );
}

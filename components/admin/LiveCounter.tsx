"use client";

import { useEffect, useRef, useState } from "react";

type Live = { total: number; today: number; lastHour: number; active15: number; latest: { name: string; at: string }[]; at: string };

const GOAL = 1000;
const POLL_MS = 15_000;

/** Smoothly animate a number toward its target. */
function useTween(target: number, ms = 1200) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      setV(Math.round(a + (target - a) * e));
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "עכשיו";
  if (m < 60) return `לפני ${m} דק׳`;
  const h = Math.round(m / 60);
  return h < 24 ? `לפני ${h} שע׳` : new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" });
};

export default function LiveCounter({ initial }: { initial?: Live }) {
  const [live, setLive] = useState<Live | null>(initial ?? null);
  const [pulse, setPulse] = useState(false);
  const prev = useRef<number | null>(initial?.total ?? null);

  useEffect(() => {
    if (initial) return;
    let alive = true;
    const tick = async () => {
      const r = await fetch("/api/backoffice/live", { cache: "no-store" }).catch(() => null);
      if (!alive || !r?.ok) return;
      const j: Live = await r.json();
      if (prev.current !== null && j.total > prev.current) {
        setPulse(true);
        setTimeout(() => setPulse(false), 1400);
      }
      prev.current = j.total;
      setLive(j);
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [initial]);

  const total = useTween(live?.total ?? 0);
  const pct = Math.min(100, ((live?.total ?? 0) / GOAL) * 100);

  return (
    <section className={`lc glass edge ${pulse ? "lc-pulse" : ""}`} aria-live="polite">
      <div className="lc-main">
        <div className="lc-head">
          <span className="lc-dot" aria-hidden /> <span>מונה משתמשים חי</span>
          <span className="lc-upd muted">{live ? `עודכן ${new Date(live.at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "טוען..."}</span>
        </div>
        <div className="lc-num num">{total.toLocaleString("he-IL")}</div>
        <div className="lc-goal">
          <div className="lc-bar"><i style={{ width: `${pct}%` }} /></div>
          <span><b>{Math.round(pct)}%</b> מהיעד · {GOAL.toLocaleString("he-IL")} משתמשים</span>
        </div>
      </div>
      <div className="lc-side">
        <div className="lc-kpi"><b className="num">+{live?.today ?? 0}</b><span>היום</span></div>
        <div className="lc-kpi"><b className="num">+{live?.lastHour ?? 0}</b><span>בשעה האחרונה</span></div>
        <div className="lc-kpi"><b className="num">{live?.active15 ?? 0}</b><span>פעילים עכשיו (15 דק׳)</span></div>
      </div>
      <ul className="lc-feed">
        {(live?.latest ?? []).map((u, i) => (
          <li key={u.at + i}><span>🍒 {u.name} הצטרף</span><small className="muted">{ago(u.at)}</small></li>
        ))}
      </ul>
    </section>
  );
}

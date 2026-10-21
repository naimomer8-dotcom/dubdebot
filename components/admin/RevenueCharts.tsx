"use client";

import { useEffect, useRef, useState } from "react";

/** Chart series colors (validated on the dark surface: CVD ΔE 25, both ≥ 3:1). Text never wears these. */
export const C_SELF = "#b8892f";
export const C_REP = "#4f8fe6";
export const C_ONE = "#b8892f";

export const nis = (n: number, digits = 0) => `₪${(Math.round(n * 100) / 100).toLocaleString("he-IL", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
export const nisShort = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `₪${(n / 1_000_000).toLocaleString("he-IL", { maximumFractionDigits: 1 })}M`;
  if (a >= 10_000) return `₪${(n / 1000).toLocaleString("he-IL", { maximumFractionDigits: 0 })}K`;
  if (a >= 1000) return `₪${(n / 1000).toLocaleString("he-IL", { maximumFractionDigits: 1 })}K`;
  return nis(n);
};

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** "Nice" axis maximum and 4 ticks. */
function niceMax(v: number) {
  if (v <= 0) return 1000;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * p;
}

export type Bucket = { key: string; label: string; long: string; self: number; rep: number; deals: number };

/** Revenue over time: stacked bars (self at the base, rep on top), 2px surface gap, crosshair tooltip. */
export function StackedBars({ data, empty }: { data: Bucket[]; empty?: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 240, padL = 52, padR = 8, padT = 12, padB = 28;
  const w = Math.max(280, width);
  const innerW = w - padL - padR, innerH = H - padT - padB;
  const max = niceMax(Math.max(0, ...data.map((d) => d.self + d.rep)));
  const n = Math.max(1, data.length);
  const slot = innerW / n;
  const bw = Math.max(2, Math.min(28, slot * 0.62));
  const y = (v: number) => padT + innerH - (v / max) * innerH;
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(innerW / 54))));
  const h = hover != null ? data[hover] : null;

  return (
    <div className="rv-chart" dir="ltr" ref={ref} onMouseLeave={() => setHover(null)}>
      <svg width={w} height={H} role="img" aria-label="הכנסות לאורך זמן, לפי ערוץ">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={padL} x2={w - padR} y1={y(max * t)} y2={y(max * t)} className={t === 0 ? "rv-base" : "rv-grid"} />
            <text x={padL - 8} y={y(max * t) + 4} textAnchor="end" className="rv-tick">{nisShort(max * t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = padL + slot * i + slot / 2;
          const x = cx - bw / 2;
          const hs = d.self > 0 ? Math.max(2, (d.self / max) * innerH) : 0;
          const hr = d.rep > 0 ? Math.max(2, (d.rep / max) * innerH) : 0;
          const gap = hs && hr ? 2 : 0;
          const base = padT + innerH;
          const r = Math.min(4, bw / 2);
          return (
            <g key={d.key}>
              {hover === i && <rect x={padL + slot * i} y={padT} width={slot} height={innerH} className="rv-hoverband" />}
              {hs > 0 && <path d={roundTop(x, base - hs, bw, hs, hr ? 0 : r)} fill={C_SELF} />}
              {hr > 0 && <path d={roundTop(x, base - hs - gap - hr, bw, hr, r)} fill={C_REP} />}
              {i % labelEvery === 0 && <text x={cx} y={H - 8} textAnchor="middle" className="rv-tick">{d.label}</text>}
              <rect x={padL + slot * i} y={padT} width={slot} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
            </g>
          );
        })}
        {empty && <text x={padL + innerW / 2} y={padT + innerH / 2} textAnchor="middle" className="rv-ghost-t">עוד אין הכנסות בתקופה הזו</text>}
      </svg>
      {h && (
        <div className="rv-tip" dir="rtl" style={{ left: Math.min(w - 190, Math.max(0, padL + slot * (hover as number) + slot / 2 - 90)) }}>
          <b>{h.long}</b>
          <span><i style={{ background: C_SELF }} /> סליקה עצמית <em className="num">{nis(h.self)}</em></span>
          <span><i style={{ background: C_REP }} /> דרך נציג <em className="num">{nis(h.rep)}</em></span>
          <span className="rv-tip-sum">סה״כ <em className="num">{nis(h.self + h.rep)}</em> · {h.deals} עסקאות</span>
        </div>
      )}
    </div>
  );
}

/** Rounded top corners only; the bar stays square on the baseline. */
function roundTop(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`;
}

/** Two-slice donut (self vs rep) with a 2px surface gap and the total in the middle. */
export function ChannelDonut({ self, rep }: { self: number; rep: number }) {
  const total = self + rep;
  const R = 70, r = 50, cx = 84, cy = 84;
  const parts = total > 0 ? [{ v: self, c: C_SELF, k: "self" }, { v: rep, c: C_REP, k: "rep" }].filter((p) => p.v > 0) : [];
  let a0 = -Math.PI / 2;
  const gapA = parts.length > 1 ? 0.03 : 0;
  return (
    <svg width={168} height={168} viewBox="0 0 168 168" role="img" aria-label={`סליקה עצמית ${nis(self)}, דרך נציג ${nis(rep)}`}>
      <circle cx={cx} cy={cy} r={(R + r) / 2} fill="none" stroke="rgba(255,248,235,.06)" strokeWidth={R - r} />
      {parts.map((p) => {
        const sweep = (p.v / total) * Math.PI * 2;
        const s = a0 + gapA / 2, e = a0 + sweep - gapA / 2;
        a0 += sweep;
        if (parts.length === 1) return <circle key={p.k} cx={cx} cy={cy} r={(R + r) / 2} fill="none" stroke={p.c} strokeWidth={R - r} />;
        const large = e - s > Math.PI ? 1 : 0;
        const P = (rad: number, a: number) => `${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`;
        return <path key={p.k} d={`M${P(R, s)} A${R},${R} 0 ${large} 1 ${P(R, e)} L${P(r, e)} A${r},${r} 0 ${large} 0 ${P(r, s)} Z`} fill={p.c} />;
      })}
      <text x={cx} y={cy - 2} textAnchor="middle" className="rv-donut-v">{nisShort(total)}</text>
      <text x={cx} y={cy + 18} textAnchor="middle" className="rv-donut-l">לפני החזרים</text>
    </svg>
  );
}

/** Horizontal bars (RTL), one hue, value label at the end of each bar. */
export function HBars({ rows, empty }: { rows: { key: string; label: string; value: number; sub?: string }[]; empty: string }) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  if (!rows.length || max <= 0)
    return (
      <div className="rv-hb rv-hb-ghost" aria-hidden="false">
        {rows.slice(0, 4).map((r, i) => (
          <div className="rv-hb-row" key={r.key}>
            <span className="rv-hb-l">{r.label}</span>
            <span className="rv-hb-track"><span className="rv-hb-bar ghost" style={{ width: `${[62, 44, 30, 18][i] ?? 12}%` }} /></span>
            <span className="rv-hb-v num">₪0</span>
          </div>
        ))}
        <p className="rv-empty-note">{empty}</p>
      </div>
    );
  return (
    <div className="rv-hb">
      {rows.map((r) => (
        <div className="rv-hb-row" key={r.key} title={`${r.label}: ${nis(r.value)}${r.sub ? ` · ${r.sub}` : ""}`}>
          <span className="rv-hb-l">{r.label}{r.sub && <small>{r.sub}</small>}</span>
          <span className="rv-hb-track"><span className="rv-hb-bar" style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%`, background: C_ONE }} /></span>
          <span className="rv-hb-v num">{nis(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Funnel: each step's width is relative to the first; conversion from the previous step on the side. */
export function Funnel({ steps }: { steps: { label: string; value: number; hint: string }[] }) {
  const top = Math.max(1, steps[0]?.value ?? 1);
  return (
    <ol className="rv-funnel">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].value : null;
        const conv = prev ? Math.round((s.value / prev) * 1000) / 10 : null;
        return (
          <li key={s.label}>
            <div className="rv-f-head">
              <b>{s.label}</b>
              <span className="num">{s.value.toLocaleString("he-IL")}</span>
            </div>
            <div className="rv-f-track"><span style={{ width: `${steps[0]?.value ? Math.max(2, (s.value / top) * 100) : 0}%`, opacity: 1 - i * 0.16 }} /></div>
            <small className="muted">{s.hint}{conv != null && prev && conv <= 100 ? ` · ${conv.toLocaleString("he-IL")}% מהשלב הקודם` : ""}</small>
          </li>
        );
      })}
    </ol>
  );
}

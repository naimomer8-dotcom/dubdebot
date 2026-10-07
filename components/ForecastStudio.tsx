"use client";

import { useMemo, useState } from "react";
import Mascot from "./Mascot";
import { DEFAULT_INPUT, ForecastInput, ils, ilsShort, summarize, verdict } from "@/lib/forecast";

type SliderDef = { key: keyof ForecastInput; label: string; min: number; max: number; step: number; fmt: (n: number) => string };

const SLIDERS: SliderDef[] = [
  { key: "price", label: "מחיר ממוצע לעסקה", min: 100, max: 10000, step: 50, fmt: ils },
  { key: "deals", label: "עסקאות בחודש היום", min: 1, max: 200, step: 1, fmt: (n) => String(n) },
  { key: "growth", label: "צמיחה חודשית", min: 0, max: 20, step: 0.5, fmt: (n) => `${n}%` },
  { key: "margin", label: "רווח גולמי", min: 10, max: 95, step: 1, fmt: (n) => `${n}%` },
  { key: "fixed", label: "הוצאות קבועות בחודש", min: 2000, max: 150000, step: 1000, fmt: ilsShort },
  { key: "marketing", label: "תקציב שיווק בחודש", min: 0, max: 50000, step: 500, fmt: ilsShort },
];

export default function ForecastStudio({
  initial,
  ctaLabel,
  onCta,
  ctaNote,
}: {
  initial?: Partial<ForecastInput>;
  ctaLabel: string;
  onCta: (input: ForecastInput) => void;
  ctaNote?: string;
}) {
  const [inp, setInp] = useState<ForecastInput>({ ...DEFAULT_INPUT, ...initial });
  const [hover, setHover] = useState<number | null>(null);
  const s = useMemo(() => summarize(inp), [inp]);
  const v = useMemo(() => verdict(inp), [inp]);

  // ---- chart geometry ----
  const W = 640, H = 260, PAD_L = 8, PAD_R = 8, PAD_T = 16, PAD_B = 30;
  const maxRev = Math.max(...s.months.map((m) => m.revenue), 1);
  const minProfit = Math.min(0, ...s.months.map((m) => m.profit));
  const top = maxRev;
  const bottom = minProfit;
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const y = (val: number) => r1(PAD_T + ((top - val) / (top - bottom || 1)) * (H - PAD_T - PAD_B));
  const slot = (W - PAD_L - PAD_R) / 12;
  const barW = r1(slot * 0.56);
  const x = (i: number) => r1(PAD_L + slot * i + slot / 2);
  const line = s.months.map((m, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(m.profit).toFixed(1)}`).join(" ");
  const mood = s.breakEven === -1 || inp.margin < 35 ? "curious" : s.netMargin > 0.2 ? "celebrate" : "idle";

  return (
    <div className="studio glass edge">
      <div className="studio-controls">
        {SLIDERS.map((d) => {
          const val = inp[d.key];
          const pct = ((val - d.min) / (d.max - d.min)) * 100;
          return (
            <label className="slider" key={d.key}>
              <span className="slider-top">
                <span>{d.label}</span>
                <output>{d.fmt(val)}</output>
              </span>
              <input
                className="range"
                type="range"
                min={d.min}
                max={d.max}
                step={d.step}
                value={val}
                style={{ ["--p" as string]: `${pct}%` }}
                onChange={(e) => setInp((p) => ({ ...p, [d.key]: Number(e.target.value) }))}
                aria-label={d.label}
              />
            </label>
          );
        })}
      </div>

      <div className="studio-out">
        <div className="kpis">
          <div className="kpi">
            <small>הכנסות ב-12 חודש</small>
            <strong className="gold">{ilsShort(s.revenue)}</strong>
          </div>
          <div className="kpi">
            <small>רווח נקי ב-12 חודש</small>
            <strong className={s.profit < 0 ? "neg" : ""}>{ilsShort(s.profit)}</strong>
          </div>
          <div className="kpi">
            <small>נקודת איזון</small>
            <strong>{s.breakEven === -1 ? "לא השנה" : s.breakEven === 0 ? "מיד" : `חודש ${s.breakEven + 1}`}</strong>
          </div>
        </div>

        <div style={{ position: "relative" }} dir="ltr">
          <svg className="chart" viewBox={`0 0 ${W} ${H}`} onMouseLeave={() => setHover(null)} role="img" aria-label="גרף הכנסות ורווח ל-12 חודשים">
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f6e6c2" />
                <stop offset="100%" stopColor="#8c6f42" stopOpacity=".35" />
              </linearGradient>
            </defs>
            <line className="zero" x1={PAD_L} x2={W - PAD_R} y1={y(0)} y2={y(0)} />
            {s.months.map((m, i) => (
              <g key={i} onMouseEnter={() => setHover(i)}>
                <rect x={r1(x(i) - slot / 2)} y={0} width={r1(slot)} height={H} fill="transparent" />
                <rect className="bar" x={r1(x(i) - barW / 2)} y={y(m.revenue)} width={barW} height={Math.max(1, r1(y(0) - y(m.revenue)))} rx={4} opacity={hover === null || hover === i ? 1 : 0.4} />
                <text x={x(i)} y={H - 8} textAnchor="middle">{m.label}</text>
              </g>
            ))}
            <path className="profit-line" d={line} />
            {s.months.map((m, i) => (
              <circle key={i} cx={x(i)} cy={y(m.profit)} r={hover === i ? 5.5 : 3} fill={m.profit < 0 ? "#ff8d8d" : "#fff4dc"} />
            ))}
            {s.breakEven > 0 && <circle className="be-dot" cx={x(s.breakEven)} cy={y(s.months[s.breakEven].profit)} r={8} />}
          </svg>
          {hover !== null && (
            <div className="chart-tip" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(s.months[hover].revenue) / H) * 100}%` }} dir="rtl">
              <b>{s.months[hover].label}</b> · הכנסות {ils(s.months[hover].revenue)} · רווח{" "}
              <span style={{ color: s.months[hover].profit < 0 ? "#ff7b86" : "#f1d9a4" }}>{ils(s.months[hover].profit)}</span>
            </div>
          )}
        </div>
        <div className="legend">
          <span><i style={{ width: 10, height: 10, borderRadius: 3, background: "var(--gold)" }} />הכנסות</span>
          <span><i style={{ width: 14, height: 2, background: "#fff4dc" }} />רווח נקי</span>
          <span><i style={{ width: 9, height: 9, borderRadius: 9, background: "var(--cherry)" }} />נקודת איזון</span>
        </div>

        <div className="verdict" aria-live="polite">
          <Mascot size={52} mood={mood} track={false} />
          <p>
            <b>{v.bold}</b>
            {v.rest}
          </p>
        </div>

        <div className="studio-cta">
          <button className="btn btn-primary" onClick={() => onCta(inp)}>{ctaLabel}</button>
          {ctaNote && <small>{ctaNote}</small>}
        </div>
      </div>
    </div>
  );
}

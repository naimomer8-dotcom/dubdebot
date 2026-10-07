"use client";

import { useEffect, useId, useRef, useState } from "react";

export type Mood = "idle" | "thinking" | "talking" | "wink" | "celebrate" | "curious";

/**
 * דובדבוט – the cherry. Eyes follow the pointer (or finger) when `track` is on.
 */
export default function Mascot({
  size = 120,
  mood = "idle",
  track = true,
  className = "",
}: {
  size?: number;
  mood?: Mood;
  track?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const ref = useRef<SVGSVGElement>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!track) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height * 0.58;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, d / 260);
        setLook({ x: (dx / d) * 4.2 * k, y: (dy / d) * 4.2 * k });
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [track]);

  const thinking = mood === "thinking";
  const p = thinking ? { x: 3, y: -4 } : look;
  const pupil = { transform: `translate(${p.x}px, ${p.y}px)` };
  const g = (n: string) => `url(#${uid}-${n})`;

  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label="דובדבוט"
      className={`mascot mascot--${mood} ${className}`}
    >
      <defs>
        <radialGradient id={`${uid}-body`} cx="36%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#ff5a68" />
          <stop offset="40%" stopColor="#c4162f" />
          <stop offset="100%" stopColor="#4a000c" />
        </radialGradient>
        <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f1d9a4" />
          <stop offset="45%" stopColor="#d9b574" />
          <stop offset="100%" stopColor="#8a6d3b" />
        </linearGradient>
        <radialGradient id={`${uid}-shadow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000" stopOpacity=".55" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="100" cy="190" rx="52" ry="7" fill={g("shadow")} />

      <g className="mascot__bob">
        {/* stem + leaf */}
        <path d="M100 60 C 101 40, 111 22, 133 11" stroke={g("gold")} strokeWidth="5.5" strokeLinecap="round" fill="none" />
        <path d="M119 21 C 138 7, 164 12, 172 26 C 155 37, 131 37, 119 21 Z" fill={g("gold")} />
        <path d="M121 22 C 138 21, 154 24, 170 26" stroke="#6b5226" strokeWidth="1.3" fill="none" opacity=".55" />

        {/* body */}
        <path
          d="M100 62 C 72 50, 32 64, 32 113 C 32 154, 64 184, 100 184 C 136 184, 168 154, 168 113 C 168 64, 128 50, 100 62 Z"
          fill={g("body")}
          stroke={g("gold")}
          strokeWidth="2.2"
        />
        <path d="M87 66 C 94 71, 106 71, 113 66" stroke="#2c0007" strokeWidth="2" fill="none" opacity=".5" />
        <ellipse cx="64" cy="94" rx="12" ry="21" fill="#fff" opacity=".22" transform="rotate(-26 64 94)" />
        <circle cx="76" cy="77" r="4.2" fill="#fff" opacity=".6" />

        {/* brows */}
        <path
          d={mood === "curious" ? "M63 96 C 70 88, 81 88, 88 93" : "M63 100 C 71 93, 82 93, 88 97"}
          stroke="#22000a" strokeWidth="4.2" strokeLinecap="round" fill="none"
        />
        <path
          d={thinking || mood === "curious" ? "M112 92 C 120 87, 131 88, 138 95" : "M112 97 C 118 93, 129 93, 137 100"}
          stroke="#22000a" strokeWidth="4.2" strokeLinecap="round" fill="none"
        />

        {/* eyes */}
        <g className="mascot__lids">
          <ellipse cx="76" cy="117" rx="10.5" ry="12.5" fill="#fff9ee" />
          {mood === "wink" ? (
            <path d="M113 118 C 119 111, 130 111, 136 118" stroke="#22000a" strokeWidth="4.2" strokeLinecap="round" fill="none" />
          ) : mood === "celebrate" ? (
            <path d="M113 120 C 119 110, 130 110, 136 120" stroke="#22000a" strokeWidth="4.2" strokeLinecap="round" fill="none" />
          ) : (
            <ellipse cx="124" cy="117" rx="10.5" ry="12.5" fill="#fff9ee" />
          )}
          {mood === "celebrate" ? (
            <path d="M65 120 C 71 110, 82 110, 88 120" stroke="#22000a" strokeWidth="4.2" strokeLinecap="round" fill="none" />
          ) : (
            <g className="mascot__pupil" style={pupil}>
              <circle cx="76" cy="118" r="5.8" fill="#14000a" />
              <circle cx="78.2" cy="115.4" r="1.9" fill="#f1d9a4" />
            </g>
          )}
          {mood !== "wink" && mood !== "celebrate" && (
            <g className="mascot__pupil" style={pupil}>
              <circle cx="124" cy="118" r="5.8" fill="#14000a" />
              <circle cx="126.2" cy="115.4" r="1.9" fill="#f1d9a4" />
            </g>
          )}
        </g>

        {/* cheeks */}
        <ellipse cx="58" cy="138" rx="9" ry="5" fill="#ff8d98" opacity=".33" />
        <ellipse cx="142" cy="138" rx="9" ry="5" fill="#ff8d98" opacity=".33" />

        {/* mouth */}
        <g className="mascot__mouth">
          {mood === "talking" ? (
            <>
              <path d="M85 142 C 91 160, 109 160, 115 142 Z" fill="#22000a" />
              <path d="M92 151 C 96 156, 104 156, 108 151" fill="#ff6371" />
            </>
          ) : mood === "celebrate" ? (
            <>
              <path d="M80 138 C 86 164, 114 164, 120 138 Z" fill="#22000a" />
              <path d="M90 152 C 95 159, 105 159, 110 152" fill="#ff6371" />
            </>
          ) : thinking ? (
            <path d="M90 149 C 96 146, 106 147, 112 143" stroke="#22000a" strokeWidth="3.6" strokeLinecap="round" fill="none" />
          ) : mood === "curious" ? (
            <ellipse cx="100" cy="148" rx="6" ry="7" fill="#22000a" />
          ) : (
            <path d="M83 140 C 91 155, 110 155, 118 140" stroke="#22000a" strokeWidth="4.2" strokeLinecap="round" fill="none" />
          )}
        </g>

        {/* thinking bubbles */}
        {thinking && (
          <g fill={g("gold")}>
            <circle cx="160" cy="70" r="4"><animate attributeName="opacity" values=".2;1;.2" dur="1.2s" repeatCount="indefinite" /></circle>
            <circle cx="172" cy="56" r="5.5"><animate attributeName="opacity" values=".2;1;.2" dur="1.2s" begin=".2s" repeatCount="indefinite" /></circle>
            <circle cx="186" cy="38" r="7.5"><animate attributeName="opacity" values=".2;1;.2" dur="1.2s" begin=".4s" repeatCount="indefinite" /></circle>
          </g>
        )}
      </g>
    </svg>
  );
}

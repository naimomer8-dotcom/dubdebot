"use client";
import { useEffect, useRef, useState } from "react";
import Mascot, { Mood } from "./Mascot";
import { TOOLS } from "@/lib/persona";

// positions around the ring (percent of stage), clockwise from top-right
const POS = [
  { top: "6%", left: "60%" },
  { top: "34%", left: "84%" },
  { top: "78%", left: "70%" },
  { top: "82%", left: "6%" },
  { top: "30%", left: "-6%" },
];

export default function HeroStage() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [mood, setMood] = useState<Mood>("idle");

  useEffect(() => {
    const t = setTimeout(() => setMood("wink"), 1400);
    const t2 = setTimeout(() => setMood("idle"), 2600);
    let raf = 0;
    const on = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
        const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
        setTilt({ x: dx * 22, y: dy * 22 });
      });
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
      window.removeEventListener("pointermove", on);
    };
  }, []);

  function pick(id: string) {
    window.dispatchEvent(new CustomEvent("dd:tool", { detail: id }));
    document.getElementById("tools")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="stage" ref={ref}>
      <svg className="rings" viewBox="0 0 400 400" aria-hidden="true">
        <defs>
          <linearGradient id="ringG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f1d9a4" />
            <stop offset="1" stopColor="#a6884f" stopOpacity=".2" />
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="55%" r="50%">
            <stop offset="0" stopColor="#b3132b" stopOpacity=".28" />
            <stop offset=".6" stopColor="#d9b574" stopOpacity=".06" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="200" cy="200" r="200" fill="url(#glow)" />
        <g className="ring ring-a">
          <circle cx="200" cy="200" r="168" fill="none" stroke="url(#ringG)" strokeWidth="1.2" strokeDasharray="2 10" />
          <circle cx="368" cy="200" r="4" fill="#d9b574" />
        </g>
        <g className="ring ring-b">
          <circle cx="200" cy="200" r="132" fill="none" stroke="url(#ringG)" strokeWidth="1" />
          <circle cx="200" cy="68" r="3" fill="#f1d9a4" />
          <circle cx="107" cy="293" r="2.5" fill="#b3132b" />
        </g>
      </svg>
      <div className="mascot-slot" style={{ transform: `translate(${tilt.x}px, ${tilt.y}px)` }}>
        <Mascot size={260} mood={mood} />
      </div>
      {TOOLS.filter((t) => t.id !== "chat").map((t, i) => (
        <button
          key={t.id}
          className="orbit-chip"
          style={{ ...POS[i], animationDelay: `${0.5 + i * 0.12}s` }}
          onMouseEnter={() => setMood("curious")}
          onMouseLeave={() => setMood("idle")}
          onFocus={() => setMood("curious")}
          onBlur={() => setMood("idle")}
          onClick={() => pick(t.id)}
        >
          <i>{t.icon}</i>
          {t.title}
        </button>
      ))}
    </div>
  );
}

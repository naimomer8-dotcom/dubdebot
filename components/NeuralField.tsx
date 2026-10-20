"use client";
import { useEffect, useRef } from "react";

/**
 * A quiet neural field behind every page: gold nodes that drift and link when close.
 * Small on purpose: ≤ 56 nodes on desktop, ≤ 24 on phones, DPR capped at 1.5, paused when the tab is hidden.
 * Under prefers-reduced-motion it paints one still frame.
 */
export default function NeuralField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, lastW = 0, raf = 0, running = true;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    type N = { x: number; y: number; vx: number; vy: number; r: number; p: number };
    let nodes: N[] = [];
    const pointer = { x: -9999, y: -9999 };

    const size = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // phones fire resize when the address bar slides; keep the nodes unless the width really changed
      if (nodes.length && Math.abs(w - lastW) < 40) return;
      lastW = w;
      const target = Math.min(w < 700 ? 24 : 56, Math.round((w * h) / 26000));
      nodes = Array.from({ length: target }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: 0.6 + Math.random() * 1.4,
        p: Math.random() * Math.PI * 2,
      }));
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const L = w < 700 ? 110 : 150;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (!reduce) {
          a.x += a.vx; a.y += a.vy;
          if (a.x < -20) a.x = w + 20; else if (a.x > w + 20) a.x = -20;
          if (a.y < -20) a.y = h + 20; else if (a.y > h + 20) a.y = -20;
        }
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < L * L) {
            const k = 1 - Math.sqrt(d2) / L;
            ctx.strokeStyle = `rgba(226,198,142,${(k * 0.16).toFixed(3)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        const pd = Math.hypot(a.x - pointer.x, a.y - pointer.y);
        const near = pd < 160 ? 1 - pd / 160 : 0;
        const tw = 0.35 + 0.25 * Math.sin(t / 1400 + a.p);
        ctx.fillStyle = `rgba(246,230,194,${Math.min(0.9, tw + near * 0.5).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r + near * 1.2, 0, Math.PI * 2); ctx.fill();
      }
    };

    const loop = (t: number) => {
      if (!running) return;
      draw(t);
      raf = requestAnimationFrame(loop);
    };

    size();
    if (reduce) draw(0);
    else raf = requestAnimationFrame(loop);

    const onResize = () => { size(); if (reduce) draw(0); };
    const onVis = () => {
      running = !document.hidden && !reduce;
      cancelAnimationFrame(raf);
      if (running) raf = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) => { pointer.x = e.clientX; pointer.y = e.clientY; };
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={ref} className="neural" aria-hidden="true" />;
}

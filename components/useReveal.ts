"use client";
import { useEffect } from "react";

/**
 * Adds `.in` to every `.reveal` element when it scrolls into view.
 * Safety net: anything already above the fold line (fast scroll, anchor jump, slow hydration) is revealed on scroll,
 * so content can never stay invisible.
 */
export function useReveal(dep?: unknown) {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.in)"));
    const show = (e: Element) => e.classList.add("in");
    if (!("IntersectionObserver" in window)) {
      els.forEach(show);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => en.isIntersecting && (show(en.target), io.unobserve(en.target))),
      { rootMargin: "0px 0px -8% 0px", threshold: 0 }
    );
    els.forEach((e) => io.observe(e));
    let raf = 0;
    const sweep = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const line = window.innerHeight * 0.92;
        els.forEach((e) => { if (!e.classList.contains("in") && e.getBoundingClientRect().top < line) { show(e); io.unobserve(e); } });
      });
    };
    window.addEventListener("scroll", sweep, { passive: true, capture: true });
    window.addEventListener("hashchange", sweep);
    const t = setTimeout(sweep, 600);
    return () => { io.disconnect(); clearTimeout(t); cancelAnimationFrame(raf); window.removeEventListener("scroll", sweep, true); window.removeEventListener("hashchange", sweep); };
  }, [dep]);
}

"use client";
import { useEffect } from "react";

/** Ambient light blobs + a soft champagne light that follows the pointer. */
export default function Spotlight() {
  useEffect(() => {
    let raf = 0;
    const on = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--mx", `${e.clientX}px`);
        document.documentElement.style.setProperty("--my", `${e.clientY}px`);
      });
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => window.removeEventListener("pointermove", on);
  }, []);
  return (
    <>
      <div className="ambient" aria-hidden="true" />
      <div className="spot" aria-hidden="true" />
    </>
  );
}

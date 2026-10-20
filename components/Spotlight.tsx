"use client";
import { useEffect } from "react";
import NeuralField from "./NeuralField";

/** Background stack for every page: aurora, a quiet neural field, ambient light, and a soft light that follows the pointer. */
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
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="ambient" aria-hidden="true" />
      <NeuralField />
      <div className="spot" aria-hidden="true" />
    </>
  );
}

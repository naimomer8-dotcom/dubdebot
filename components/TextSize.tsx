"use client";

import { useEffect, useState } from "react";

/** "A+" toggle: bigger text across the whole app, remembered on this device. */
export default function TextSize() {
  const [big, setBig] = useState(false);
  useEffect(() => { setBig(document.documentElement.dataset.fs === "lg"); }, []);
  function toggle() {
    const next = !big;
    setBig(next);
    if (next) document.documentElement.dataset.fs = "lg";
    else delete document.documentElement.dataset.fs;
    try { localStorage.setItem("dd_fs", next ? "lg" : ""); } catch {}
  }
  return (
    <button className="text-size" onClick={toggle} aria-pressed={big} aria-label={big ? "החזרת גודל טקסט רגיל" : "הגדלת הטקסט"} title={big ? "טקסט רגיל" : "הגדלת טקסט"}>
      <span aria-hidden="true">{big ? "A-" : "A+"}</span>
    </button>
  );
}

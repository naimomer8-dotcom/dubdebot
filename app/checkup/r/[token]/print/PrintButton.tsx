"use client";
import { useEffect } from "react";

export default function PrintButton() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 900);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="pp-bar">
      <button onClick={() => window.print()}>שמירה כ-PDF</button>
      <span>בחלון ההדפסה בחר ״שמירה כ-PDF״</span>
    </div>
  );
}

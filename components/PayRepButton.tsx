"use client";

import { useState } from "react";

/** "A rep will call me" from the failed-payment page: opens the same rep checkout as on /plans. */
export default function PayRepButton({ tier, billing }: { tier: string; billing: "onetime" | "installments" }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "err">("idle");
  async function go() {
    setState("busy");
    const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier, billing, via: "rep" }) }).catch(() => null);
    setState(r?.ok ? "done" : "err");
  }
  if (state === "done") return <span className="btn btn-glass" aria-live="polite">קיבלנו. נציג יחזור אליך תוך 24 שעות</span>;
  return (
    <button className="btn btn-ghost" onClick={go} disabled={state === "busy"}>
      {state === "busy" ? "שולח..." : state === "err" ? "משהו השתבש, לנסות שוב" : "שנציג יחזור אליי"}
    </button>
  );
}

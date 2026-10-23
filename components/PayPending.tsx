"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** While Cardcom confirms the payment, re-check the order every few seconds (server-side verification). */
export default function PayPending() {
  const router = useRouter();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= 20) return;
    const t = setTimeout(() => { setN((x) => x + 1); router.refresh(); }, 3000);
    return () => clearTimeout(t);
  }, [n, router]);
  return (
    <div className="pay-pending" role="status" aria-live="polite">
      <span className="pay-spin" aria-hidden="true" />
      <p>{n < 20 ? "מאשרים את התשלום מול חברת האשראי. זה לוקח כמה שניות." : "האישור לוקח יותר זמן מהרגיל. אם חויבת, המנוי ייפתח אוטומטית ונעדכן אותך במייל ובוואטסאפ."}</p>
    </div>
  );
}

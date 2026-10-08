"use client";

import { useEffect } from "react";

/** Branded error screen. A failed JS chunk (deploy in progress / flaky network) reloads once by itself. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    const chunk = /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(`${error?.name} ${error?.message}`);
    try {
      if (chunk && !sessionStorage.getItem("dd_reloaded")) {
        sessionStorage.setItem("dd_reloaded", "1");
        window.location.reload();
        return;
      }
    } catch {}
    console.error(error);
  }, [error]);
  return (
    <div className="auth-page">
      <div className="auth-card glass edge" style={{ textAlign: "center" }}>
        <h1 className="h-display" style={{ fontSize: 52 }}>משהו נתקע <span className="gold">רגע.</span></h1>
        <p className="muted">זה לא אתה, זה אנחנו. נסה שוב – בדרך כלל זה מסתדר מיד.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18 }}>
          <button className="btn btn-primary" onClick={() => { try { sessionStorage.removeItem("dd_reloaded"); } catch {} reset(); }}>נסה שוב</button>
          <a className="btn btn-ghost" href="/">לדף הבית</a>
        </div>
      </div>
    </div>
  );
}

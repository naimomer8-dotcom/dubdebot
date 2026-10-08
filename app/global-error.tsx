"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ background: "#070708", color: "#f4eee3", fontFamily: "system-ui, sans-serif", minHeight: "100dvh", display: "grid", placeItems: "center", margin: 0, padding: 16 }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <h1 style={{ fontSize: 34, margin: "0 0 8px" }}>משהו נתקע רגע.</h1>
          <p style={{ color: "#a59d8f" }}>נסה לטעון שוב את הדף.</p>
          <button onClick={() => (reset ? reset() : window.location.reload())} style={{ marginTop: 14, padding: "12px 22px", borderRadius: 12, border: 0, background: "#e2c68e", color: "#17110a", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>טעינה מחדש</button>
        </div>
      </body>
    </html>
  );
}

/** Instant placeholder while an app screen loads on the server (route loading.tsx). Same frame as the app, no layout jump. */
export default function AppSkeleton({ variant = "page" }: { variant?: "page" | "chat" }) {
  return (
    <div className="app app-skel" aria-busy="true" aria-label="טוען">
      <aside className="app-skel-side" aria-hidden="true">
        <span className="skel" style={{ width: "60%", height: 22 }} />
        <span className="skel" style={{ width: "85%" }} />
        <span className="skel" style={{ width: "75%" }} />
        <span className="skel" style={{ width: "80%" }} />
        <span className="skel" style={{ width: "55%" }} />
      </aside>
      <main className="app-skel-main" aria-hidden="true">
        {variant === "chat" ? (
          <>
            <div className="app-skel-bubble me"><span className="skel" style={{ width: "70%" }} /></div>
            <div className="app-skel-bubble"><span className="skel" style={{ width: "92%" }} /><span className="skel" style={{ width: "80%" }} /><span className="skel" style={{ width: "60%" }} /></div>
            <div className="app-skel-composer"><span className="skel" style={{ width: "40%" }} /></div>
          </>
        ) : (
          <>
            <span className="skel" style={{ width: "45%", height: 30 }} />
            <span className="skel" style={{ width: "30%" }} />
            <div className="app-skel-grid">
              {[0, 1, 2, 3].map((i) => <div key={i} className="app-skel-card"><span className="skel" style={{ width: "50%" }} /><span className="skel" style={{ width: "80%" }} /></div>)}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

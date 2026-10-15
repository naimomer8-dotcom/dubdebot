"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Spotlight from "./Spotlight";
import PlanCube from "./PlanCube";
import Icon from "./Icon";
import { LIBRARY, type Course } from "@/lib/courses";
import type { ConvItem, ShellUser } from "@/lib/data";

export default function CoursesClient({ user, conversations, leadSent, links: initialLinks }: { user: ShellUser; conversations: ConvItem[]; leadSent: boolean; links: Record<string, string> }) {
  const [side, setSide] = useState(false);
  const [links, setLinks] = useState(initialLinks);
  const [syncing, setSyncing] = useState(false);
  const [err, setErr] = useState("");
  const [zq, setZq] = useState("");
  const [zqState, setZqState] = useState<"" | "sending" | "sent" | string>("");
  const paid = user.access.status === "paid";
  const ready = Object.keys(links).length;

  async function sendZoomQ() {
    setZqState("sending");
    try {
      const r = await fetch("/api/zoom-question", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: zq }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setZqState("sent"); setZq(""); } else setZqState(d.error || "לא הצלחנו לשלוח. נסה שוב.");
    } catch { setZqState("אין חיבור כרגע. נסה שוב."); }
  }

  async function sync() {
    setSyncing(true); setErr("");
    try {
      const r = await fetch("/api/courses", { method: "POST" });
      const d = await r.json();
      if (d.links) setLinks(d.links);
      if (!r.ok || !d.links || !Object.keys(d.links).length) setErr("לא הצלחנו לפתוח את הקורסים כרגע. נסה שוב בעוד כמה דקות, או כתוב לנו בשיחה.");
    } catch {
      setErr("אין חיבור כרגע. נסה שוב בעוד רגע.");
    }
    setSyncing(false);
  }

  // a paid member who has no links yet (enrolled before links were saved) gets them on first visit
  useEffect(() => { if (paid && !ready) sync(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const courses = LIBRARY.filter((c) => c.kind === "course" && !c.bonus);
  const bonus = LIBRARY.filter((c) => c.bonus);
  const books = LIBRARY.filter((c) => c.kind === "book");

  const Card = ({ c, i }: { c: Course; i: number }) => {
    const href = links[String(c.id)];
    const open = paid && !!href;
    const ping = () => { try { navigator.sendBeacon("/api/courses/open", new Blob([JSON.stringify({ id: c.id })], { type: "application/json" })); } catch {} };
    return (
      <div className={`crs crs-${c.kind} ${c.bonus ? "crs-bonus" : ""} ${open ? "" : paid ? "is-pending" : "is-locked"}`}>
        <div className="crs-top">
          <span className="crs-num num">{String(i + 1).padStart(2, "0")}</span>
          <span className="crs-tag">{c.tag}</span>
        </div>
        <b className="crs-title">{c.title}</b>
        <p className="crs-blurb">{c.about ?? c.blurb}</p>
        {c.learn && (
          <details className="crs-more">
            <summary>{c.kind === "book" ? "מה תיקח מהספר" : "מה לומדים בקורס"} <Icon name="chevron" size={14} /></summary>
            <ul>{c.learn.map((l) => <li key={l}><Icon name="check" size={14} /> {l}</li>)}</ul>
            {c.forWho && <p className="crs-who"><b>למי זה מתאים:</b> {c.forWho}</p>}
          </details>
        )}
        {open ? (
          <a className="crs-cta" href={href} target="_blank" rel="noopener noreferrer" onClick={ping}>{c.kind === "book" ? "לקריאה" : "כניסה לקורס"} <Icon name="arrowLeft" size={16} className="ico-move" /></a>
        ) : (
          <span className="crs-cta" aria-disabled="true">{paid ? <><Icon name="clock" size={15} /> נפתח עבורך…</> : <><Icon name="lock" size={15} /> נפתח במנוי הפלטפורמה</>}</span>
        )}
      </div>
    );
  };

  return (
    <>
      <Spotlight />
      <div className="app">
        <Sidebar active="courses" conversations={conversations} user={user} leadSent={leadSent} open={side} onClose={() => setSide(false)} />
        <main className="main" style={{ gridTemplateRows: "auto auto 1fr" }}>
          <PlanCube access={user.access} />
          <header className="topbar">
            <div className="who">
              <button className="icon-btn mobile-only" onClick={() => setSide(true)} aria-label="תפריט"><Icon name="menu" size={20} /></button>
              <Icon name="layers" size={22} className="gold-ico" />
              <div><b>הקורסים שלי</b><small>{LIBRARY.length} קורסים וספרים של ניר</small></div>
            </div>
            <div className="topbar-actions">
              <Link className="btn btn-glass btn-sm" href="/chat"><Icon name="chat" size={16} /> לשיחה</Link>
            </div>
          </header>

          <div className="vault">
            <div className="vault-in">
              <div className="crs-head">
                <span className="eyebrow">{user.firstName} · הספרייה של הפלטפורמה</span>
                <h1 className="h-display">כל מה שניר לימד, <span className="gold">בלחיצה אחת.</span></h1>
                <p className="lead" style={{ margin: 0 }}>
                  {paid
                    ? "כל קורס נפתח ישר בחשבון האישי שלך, בלי סיסמה ובלי לחפש מיילים. הקורסים זמינים כל עוד המנוי פעיל."
                    : "8 קורסים דיגיטליים, קורס בונוס ורבי המכר של ניר מחכים לך. הם נפתחים אוטומטית ברגע שמצטרפים לפלטפורמה."}
                </p>
              </div>

              {!paid && (
                <div className="crs-unlock">
                  <div>
                    <b>הספרייה המלאה נפתחת במנוי הפלטפורמה</b>
                    <span>מכירות, ניהול, כסף, נדל״ן ו-AI. הכל במקום אחד, נפתח מיד עם ההצטרפות.</span>
                  </div>
                  <Link className="btn btn-primary" href="/plans">לבחירת מסלול <Icon name="arrowLeft" size={18} className="ico-move" /></Link>
                </div>
              )}
              {paid && !ready && (
                <div className="notice" role="status">
                  <Icon name={syncing ? "clock" : "alert"} size={18} />
                  <span>{syncing ? "פותחים לך את הקורסים, זה לוקח כמה שניות…" : err || "הקורסים עוד לא נפתחו."}</span>
                  {!syncing && <button className="btn btn-glass btn-sm" onClick={sync}>לנסות שוב</button>}
                </div>
              )}

              {paid && (
                <section className="zq glass edge" aria-labelledby="zq-h">
                  <div>
                    <h2 id="zq-h">שאלה לזום החודשי עם ניר</h2>
                    <p>שולחים עד 24 שעות לפני הזום, וניר עונה עליה ספציפית בזום. עד 3 שאלות לכל זום.</p>
                  </div>
                  {zqState === "sent" ? (
                    <p className="zq-ok"><Icon name="check" size={16} /> השאלה אצל ניר. נתראה בזום.</p>
                  ) : (
                    <div className="zq-form">
                      <textarea className="input" rows={3} maxLength={1200} value={zq} onChange={(e) => setZq(e.target.value)} placeholder="מה הכי בוער לך בעסק? כמה שיותר ספציפי, ככה התשובה תהיה מדויקת יותר." />
                      <button className="btn btn-primary" disabled={zq.trim().length < 8 || zqState === "sending"} onClick={sendZoomQ}>{zqState === "sending" ? "שולח…" : "שליחה לניר"}</button>
                      {zqState && zqState !== "sending" && <span className="err">{zqState}</span>}
                    </div>
                  )}
                </section>
              )}
              <section className="crs-sec" aria-labelledby="crs-c">
                <div className="crs-sec-h"><h2 id="crs-c">קורסים דיגיטליים</h2><span className="num">{courses.length}</span></div>
                <div className="crs-grid">{courses.map((c, i) => <Card key={c.id} c={c} i={i} />)}</div>
              </section>
              <section className="crs-sec" aria-labelledby="crs-x">
                <div className="crs-sec-h"><h2 id="crs-x">בונוס</h2><span className="num">{bonus.length}</span></div>
                <div className="crs-grid">{bonus.map((c, i) => <Card key={c.id} c={c} i={i} />)}</div>
              </section>
              <section className="crs-sec" aria-labelledby="crs-b">
                <div className="crs-sec-h"><h2 id="crs-b">רבי המכר של ניר</h2><span className="num">{books.length}</span></div>
                <div className="crs-grid crs-grid-books">{books.map((c, i) => <Card key={c.id} c={c} i={i} />)}</div>
              </section>
              {paid && ready > 0 && <p className="muted" style={{ fontSize: 14, margin: 0 }}>הקישורים אישיים לחשבון שלך. אל תעביר אותם לאחרים.</p>}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

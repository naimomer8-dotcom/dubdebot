"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Brand } from "../BrandBar";
import Icon from "../Icon";
import Spotlight from "../Spotlight";

type Video = {
  id: string; name: string; duration: number | null; link: string | null; thumb: string | null; texttracks: number;
  vimeo_created_at: string | null; course_id: number | null; lesson: number | null; hidden: boolean;
  indexed_chunks: number; indexed_at: string | null; index_error: string | null;
};
type Course = { id: number; title: string };
type Filter = "all" | "unmapped" | "mapped" | "hidden";

const mmss = (s: number | null) => (s == null ? "" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
const dshort = (s: string | null) => (s ? new Date(s).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "");

/** Back-office: every Vimeo video, and which course + lesson it belongs to. The app reads this mapping. */
export default function LibraryDashboard({ adminName }: { adminName: string }) {
  const [videos, setVideos] = useState<Video[] | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("unmapped");

  const load = useCallback(async () => {
    const r = await fetch("/api/backoffice/vimeo").then((x) => x.json()).catch(() => null);
    if (r?.videos) { setVideos(r.videos); setCourses(r.courses ?? []); } else setNote(r?.error ?? "שגיאה בטעינה");
  }, []);
  useEffect(() => { load(); }, [load]);

  async function sync() {
    setBusy(true); setNote("מושך את הסרטונים מ-Vimeo…");
    const r = await fetch("/api/backoffice/vimeo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync" }) }).then((x) => x.json()).catch(() => null);
    setBusy(false);
    setNote(r?.ok ? `סונכרנו ${r.synced} סרטונים מהחשבון "${r.account}". ל-${r.withCaptions} מהם יש כתוביות ב-Vimeo.` : `הסנכרון נכשל: ${r?.error ?? "שגיאה"}`);
    if (r?.ok) load();
  }

  async function indexAll() {
    setBusy(true);
    let total = 0;
    for (let round = 0; round < 200; round++) {
      const r = await fetch("/api/backoffice/vimeo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "index" }) }).then((x) => x.json()).catch(() => null);
      if (!r?.ok) { setNote(`האינדוקס נעצר: ${r?.error ?? "שגיאה"}`); break; }
      total += (r.done ?? []).length;
      setNote(`מאנדקס תמלולים… ${total} סרטונים, נשארו ${r.left}`);
      if (!r.left || !(r.done ?? []).length) { setNote(`אינדוקס הסתיים: ${total} סרטונים נכנסו לידע של הבוט.`); break; }
    }
    setBusy(false);
    load();
  }

  async function allowDomain() {
    setBusy(true); setNote("פותח את הסרטונים לניגון באפליקציה…");
    const r = await fetch("/api/backoffice/vimeo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "allow_domain" }) }).then((x) => x.json()).catch(() => null);
    setBusy(false);
    if (!r?.ok) return setNote(`נכשל: ${r?.error ?? "שגיאה"}`);
    const scope = r.sample?.some((f: { status?: number }) => f.status === 403 || f.status === 401);
    setNote(r.failed === 0 ? `כל ${r.allowed} הסרטונים פתוחים לניגון ב-${r.domain}.` : scope ? `לטוקן של Vimeo אין הרשאת Edit. צריך טוקן חדש עם Public, Private, Edit ו-Video Files. (${r.allowed} הצליחו, ${r.failed} נכשלו)` : `${r.allowed} הצליחו, ${r.failed} נכשלו (${r.sample?.[0]?.error ?? ""})`);
  }

  async function save(v: Video, patch: Partial<Video>) {
    const next = { ...v, ...patch };
    setVideos((all) => (all ?? []).map((x) => (x.id === v.id ? next : x)));
    const r = await fetch("/api/backoffice/vimeo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "map", id: v.id, course_id: next.course_id, lesson: next.lesson, hidden: next.hidden }) }).then((x) => x.json()).catch(() => null);
    if (!r?.ok) { setNote(`השמירה נכשלה: ${r?.error ?? "שגיאה"}`); load(); }
  }

  async function logout() {
    await fetch("/api/backoffice/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  const counts = useMemo(() => {
    const v = videos ?? [];
    return { all: v.length, unmapped: v.filter((x) => !x.hidden && x.course_id == null).length, mapped: v.filter((x) => x.course_id != null).length, hidden: v.filter((x) => x.hidden).length };
  }, [videos]);

  const shown = useMemo(() => (videos ?? []).filter((v) => {
    if (filter === "unmapped" && (v.hidden || v.course_id != null)) return false;
    if (filter === "mapped" && v.course_id == null) return false;
    if (filter === "hidden" && !v.hidden) return false;
    return !q || v.name.toLowerCase().includes(q.toLowerCase());
  }), [videos, filter, q]);

  const FILTERS: [Filter, string][] = [["unmapped", `לא משויכים (${counts.unmapped})`], ["mapped", `משויכים (${counts.mapped})`], ["hidden", `לא קורס (${counts.hidden})`], ["all", `הכל (${counts.all})`]];

  return (
    <>
      <Spotlight />
      <div className="adm">
        <header className="adm-top">
          <Brand sub={false} size={30} href="/admin" />
          <span className="badge">ספריית וידאו</span>
          <nav className="rv-nav" aria-label="ניווט בניהול">
            <a href="/admin">ניהול מנויים</a>
            <a href="/admin/payments">הכנסות</a>
            <a href="/admin/library" className="on" aria-current="page">ספריית וידאו</a>
          </nav>
          <span style={{ flex: 1 }} />
          <span className="muted">שלום, {adminName}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}><Icon name="logout" size={16} /> יציאה</button>
        </header>

        <div className="adm-bar">
          <div className="adm-tabs" role="tablist" aria-label="סינון">
            {FILTERS.map(([k, label]) => (
              <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{label}</button>
            ))}
          </div>
          <input className="input adm-filter" placeholder="חיפוש לפי שם סרטון" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-primary btn-sm" onClick={sync} disabled={busy}><Icon name="download" size={16} /> {busy ? "עובד…" : "סנכרון מ-Vimeo"}</button>
          <button className="btn btn-glass btn-sm" onClick={indexAll} disabled={busy}><Icon name="spark" size={16} /> אינדוקס לבוט</button>
          <button className="btn btn-glass btn-sm" onClick={allowDomain} disabled={busy}><Icon name="play" size={16} /> פתיחה לניגון באפליקציה</button>
        </div>
        {note && <p className="adm-note">{note}</p>}

        {videos === null ? (
          <div className="adm-card glass edge skel-card" />
        ) : !videos.length ? (
          <div className="adm-empty glass edge"><p>עוד אין סרטונים. לחצו "סנכרון מ-Vimeo" כדי למשוך את כל הסרטונים מהחשבון.</p></div>
        ) : (
          <div className="adm-table glass edge">
            <table>
              <thead><tr><th>סרטון</th><th>אורך</th><th>הועלה</th><th>כתוביות</th><th>בבוט</th><th>קורס</th><th>שיעור</th><th>לא קורס</th></tr></thead>
              <tbody>
                {shown.map((v) => (
                  <tr key={v.id}>
                    <td>{v.link ? <a href={v.link} target="_blank" rel="noreferrer">{v.name}</a> : v.name}</td>
                    <td className="num">{mmss(v.duration)}</td>
                    <td className="num">{dshort(v.vimeo_created_at)}</td>
                    <td>{v.texttracks > 0 ? <span className="pill ok">יש</span> : <span className="muted">אין</span>}</td>
                    <td>{v.indexed_chunks > 0 ? <span className="pill ok">{v.indexed_chunks} קטעים</span> : v.index_error ? <span className="muted" title={v.index_error}>שגיאה</span> : <span className="muted">-</span>}</td>
                    <td>
                      <select className="input" value={v.course_id ?? ""} onChange={(e) => save(v, { course_id: e.target.value ? Number(e.target.value) : null, hidden: false })}>
                        <option value="">בחרו קורס</option>
                        {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                    </td>
                    <td>
                      <input className="input num" style={{ width: 72 }} type="number" min={1} max={999} defaultValue={v.lesson ?? ""}
                        onBlur={(e) => { const n = e.target.value ? Number(e.target.value) : null; if (n !== v.lesson) save(v, { lesson: n }); }} />
                    </td>
                    <td><input type="checkbox" checked={v.hidden} onChange={(e) => save(v, { hidden: e.target.checked, course_id: e.target.checked ? null : v.course_id })} aria-label="לא סרטון של קורס" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

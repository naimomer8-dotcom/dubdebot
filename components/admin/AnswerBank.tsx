"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Item = { id: number; question: string; answer: string; status: "pending" | "approved" | "rejected"; asked: number; hits: number; created_at: string; reviewed_by: string | null };
type View = "pending" | "approved" | "rejected";

const LABEL: Record<View, string> = { pending: "ממתינות לאישור", approved: "מאושרות (עונות בלי AI)", rejected: "נפסלו" };

export default function AnswerBank({ flash }: { flash: (t: string) => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [view, setView] = useState<View>("pending");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<number, { q: string; a: string }>>({});
  const [adding, setAdding] = useState<{ q: string; a: string } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/backoffice/bank", { cache: "no-store" }).catch(() => null);
    const j = r?.ok ? await r.json() : null;
    if (j) setItems(j.items);
    setLoading(false);
  }, []);
  useEffect(() => {
    // incremental scan every time the tab opens (only new conversations since the last scan)
    load().then(() => fetch("/api/backoffice/bank", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mine" }) }).then((r) => r.ok && r.json()).then((j) => j && (j.added || j.merged) && load()).catch(() => {}));
  }, [load]);

  const shown = useMemo(() => items.filter((i) => i.status === view), [items, view]);
  const hitsTotal = items.filter((i) => i.status === "approved").reduce((a, i) => a + i.hits, 0);

  async function call(method: string, body?: unknown, url = "/api/backoffice/bank") {
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    return { ok: !!r?.ok, j };
  }

  async function mine() {
    setBusy("mine");
    const { ok, j } = await call("POST", { action: "mine" });
    setBusy(null);
    if (!ok) return flash(j.error ?? "הסריקה נכשלה");
    flash(j.added || j.merged ? `נסרקו ${j.scanned} שאלות · ${j.added} חדשות · ${j.merged} חוזרות` : "אין שאלות חדשות מאז הסריקה האחרונה");
    load();
  }

  async function setStatus(it: Item, status: View) {
    setBusy(`${it.id}`);
    const d = draft[it.id];
    const { ok } = await call("PATCH", { id: it.id, status, ...(d && d.a !== it.answer ? { answer: d.a } : {}), ...(d && d.q !== it.question ? { question: d.q } : {}) });
    setBusy(null);
    if (!ok) return flash("השמירה נכשלה");
    setDraft((x) => { const n = { ...x }; delete n[it.id]; return n; });
    flash(status === "approved" ? "אושר – מעכשיו נענה בלי AI" : status === "rejected" ? "נפסל" : "הוחזר לממתינים");
    load();
  }

  async function remove(it: Item) {
    if (!confirm("למחוק את השאלה מהמאגר?")) return;
    setBusy(`${it.id}`);
    await call("DELETE", undefined, `/api/backoffice/bank?id=${it.id}`);
    setBusy(null);
    load();
  }

  async function add() {
    if (!adding) return;
    setBusy("add");
    const { ok, j } = await call("POST", { action: "add", question: adding.q, answer: adding.a });
    setBusy(null);
    if (!ok) return flash(j.error ?? "השמירה נכשלה");
    setAdding(null);
    flash("נוסף ואושר");
    load();
  }

  return (
    <div>
      <div className="adm-empty glass edge" style={{ textAlign: "right", marginBottom: 14 }}>
        <b>איך זה עובד:</b> שאלות כלליות שחוזרות על עצמן נאספות מהשיחות. תשובה שאושרה כאן נשלחת מיד לכל מי ששואל שאלה דומה – בלי קריאה ל-AI.
        שאלות עם מספרים או פרטים אישיים תמיד עוברות ל-AI. אפשר לכתוב <code>{"{name}"}</code> בתשובה כדי לפנות בשם הפרטי.
        <div style={{ marginTop: 8 }} className="muted">תשובות שנחסכו עד עכשיו: <b className="num">{hitsTotal}</b></div>
      </div>

      <div className="adm-bar">
        <div className="adm-tabs" role="tablist">
          {(Object.keys(LABEL) as View[]).map((k) => (
            <button key={k} role="tab" aria-selected={view === k} className={view === k ? "on" : ""} onClick={() => setView(k)}>
              {LABEL[k]} <small>{items.filter((i) => i.status === k).length}</small>
            </button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={mine}>{busy === "mine" ? "סורק…" : "סריקת שאלות חדשות"}</button>
        <button className="btn btn-glass btn-sm" onClick={() => setAdding({ q: "", a: "" })}>+ הוספה ידנית</button>
      </div>

      {adding && (
        <article className="adm-card glass edge" style={{ display: "block" }}>
          <input className="input" placeholder="השאלה (למשל: איך מעלים מחירים בלי לאבד לקוחות?)" value={adding.q} onChange={(e) => setAdding({ ...adding, q: e.target.value })} />
          <textarea className="input" rows={6} style={{ marginTop: 8, width: "100%" }} placeholder="התשובה בסגנון של ניר" value={adding.a} onChange={(e) => setAdding({ ...adding, a: e.target.value })} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" disabled={busy === "add"} onClick={add}>שמירה ואישור</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAdding(null)}>ביטול</button>
          </div>
        </article>
      )}

      {loading ? (
        <div className="adm-empty shimmer">טוען…</div>
      ) : shown.length === 0 ? (
        <div className="adm-empty glass edge">{view === "pending" ? "אין שאלות ממתינות. לחצו על \"סריקת שאלות חדשות\" אחרי שיש שיחות." : "אין כאן כלום עדיין."}</div>
      ) : (
        <div className="adm-list">
          {shown.map((it) => {
            const d = draft[it.id] ?? { q: it.question, a: it.answer };
            const dirty = d.q !== it.question || d.a !== it.answer;
            return (
              <article key={it.id} className="adm-card glass edge" style={{ display: "block" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                  <span className="pill">נשאלה {it.asked} פעמים</span>
                  {it.status === "approved" && <span className="pill gold">נענתה מהמאגר {it.hits} פעמים</span>}
                  {it.reviewed_by && <span className="muted" style={{ fontSize: 13 }}>טופל ע״י {it.reviewed_by}</span>}
                </div>
                <input className="input" value={d.q} onChange={(e) => setDraft((x) => ({ ...x, [it.id]: { ...d, q: e.target.value } }))} style={{ fontWeight: 700 }} />
                <textarea className="input" rows={Math.min(14, Math.max(4, Math.ceil(d.a.length / 70)))} style={{ marginTop: 8, width: "100%" }} value={d.a} onChange={(e) => setDraft((x) => ({ ...x, [it.id]: { ...d, a: e.target.value } }))} />
                <div className="adm-actions" style={{ marginTop: 8 }}>
                  {it.status !== "approved" && <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => setStatus(it, "approved")}>{dirty ? "שמירה ואישור" : "אישור"}</button>}
                  {it.status === "approved" && dirty && <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => setStatus(it, "approved")}>שמירת עריכה</button>}
                  {it.status !== "rejected" && <button className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => setStatus(it, "rejected")}>{it.status === "approved" ? "הפסקת שימוש" : "פסילה"}</button>}
                  {it.status === "rejected" && <button className="btn btn-glass btn-sm" disabled={!!busy} onClick={() => setStatus(it, "pending")}>החזרה לממתינים</button>}
                  <button className="btn btn-ghost btn-sm danger" disabled={!!busy} onClick={() => remove(it)}>מחיקה</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

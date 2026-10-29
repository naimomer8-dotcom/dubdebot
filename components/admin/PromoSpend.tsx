"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Row = { id: string; spent_on: string; amount: number; network: string; note: string | null; created_by: string | null };
const NET: Record<string, string> = { instagram: "אינסטגרם", facebook: "פייסבוק", tiktok: "טיקטוק", youtube: "יוטיוב", other: "אחר" };
const ils = (n: number) => `₪${n.toLocaleString("he-IL", { maximumFractionDigits: 2 })}`;
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });

/** Manual log of budget spent on boosting organic posts, with cost per signup. */
export default function PromoSpend() {
  const [rows, setRows] = useState<Row[]>([]);
  const [signups, setSignups] = useState(0);
  const [since, setSince] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [network, setNetwork] = useState("instagram");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [del, setDel] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/backoffice/promo", { cache: "no-store" }).catch(() => null);
    if (!r?.ok) return;
    const j = await r.json();
    setRows(j.rows.map((x: Row) => ({ ...x, amount: Number(x.amount) })));
    setSignups(j.signups);
    setSince(j.since);
  }, []);
  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const total = rows.reduce((a, r) => a + r.amount, 0);
    const t = today();
    const todaySum = rows.filter((r) => r.spent_on === t).reduce((a, r) => a + r.amount, 0);
    const byNet = Object.entries(rows.reduce<Record<string, number>>((m, r) => ((m[r.network] = (m[r.network] ?? 0) + r.amount), m), {})).sort((a, b) => b[1] - a[1]);
    return { total, todaySum, byNet, cps: signups ? total / signups : null };
  }, [rows, signups]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!(Number(amount) > 0)) return setErr("תכניס סכום");
    setBusy(true);
    const r = await fetch("/api/backoffice/promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, date, network, note }) }).catch(() => null);
    setBusy(false);
    if (!r?.ok) return setErr("השמירה נכשלה. נסה שוב.");
    setAmount("");
    setNote("");
    load();
  }
  async function remove(id: string) {
    await fetch("/api/backoffice/promo", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => null);
    setDel(null);
    load();
  }

  return (
    <section className="ps glass edge">
      <header className="ps-h">
        <div>
          <h2>תקציב קידום אורגני</h2>
          <p className="muted">כמה הוצאנו על קידום פוסטים וריילס, ומה עלה כל משתמש חדש</p>
        </div>
      </header>

      <div className="ps-kpis">
        <div><b className="num">{ils(stats.total)}</b><span>סה״כ הוצא{since ? ` מאז ${new Date(since).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" })}` : ""}</span></div>
        <div><b className="num">{ils(stats.todaySum)}</b><span>היום</span></div>
        <div><b className="num">{signups}</b><span>נרשמו מאז ההוצאה הראשונה</span></div>
        <div className="gold"><b className="num">{stats.cps === null ? "אין" : ils(Math.round(stats.cps * 100) / 100)}</b><span>עלות למשתמש</span></div>
      </div>

      <form className="ps-form" onSubmit={add}>
        <label><span>סכום (₪)</span><input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="200" /></label>
        <label><span>תאריך</span><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label><span>רשת</span>
          <select className="input" value={network} onChange={(e) => setNetwork(e.target.value)}>
            {Object.entries(NET).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="ps-note"><span>על מה (לא חובה)</span><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="למשל: קידום ריל הסוס" /></label>
        <button className="btn btn-primary" disabled={busy}>{busy ? "שומר..." : "הוספה"}</button>
      </form>
      {err && <p className="ps-err">{err}</p>}

      {stats.byNet.length > 0 && (
        <div className="ps-nets">{stats.byNet.map(([k, v]) => <span key={k}>{NET[k] ?? k} <b className="num">{ils(v)}</b></span>)}</div>
      )}

      {rows.length > 0 ? (
        <div className="ps-table"><table>
          <thead><tr><th>תאריך</th><th>רשת</th><th>סכום</th><th>על מה</th><th>הזין</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="num">{new Date(r.spent_on).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit" })}</td>
                <td>{NET[r.network] ?? r.network}</td>
                <td className="num">{ils(r.amount)}</td>
                <td>{r.note ?? ""}</td>
                <td className="muted">{r.created_by ?? ""}</td>
                <td>{del === r.id
                  ? <><button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(r.id)}>למחוק?</button> <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDel(null)}>ביטול</button></>
                  : <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDel(r.id)}>מחיקה</button>}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      ) : <p className="muted" style={{ margin: 0 }}>עוד לא הוזנה הוצאה. תכניס סכום ותלחץ הוספה.</p>}
    </section>
  );
}

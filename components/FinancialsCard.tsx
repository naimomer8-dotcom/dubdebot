"use client";

import { useMemo, useState } from "react";
import Icon from "./Icon";
import { FIN_FIELDS, calc, type FinData, type FinRow } from "@/lib/financials";

const nf = new Intl.NumberFormat("he-IL");
const money = (n: number) => `₪${nf.format(Math.round(n))}`;
const monthName = (p: string) => {
  const [y, m] = p.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("he-IL", { month: "long", year: "numeric" });
};
const lastMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** "My financial numbers": monthly P&L + balance basics. Calculations happen here – no AI calls. */
export default function FinancialsCard({ initial }: { initial: FinRow[] }) {
  const [rows, setRows] = useState<FinRow[]>(initial);
  const [period, setPeriod] = useState(initial[0]?.period ?? lastMonth());
  const existing = rows.find((r) => r.period === period);
  const [form, setForm] = useState<Record<string, string>>(() => toForm(existing?.data));
  const [editing, setEditing] = useState(!initial.length);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const live = useMemo(() => calc(fromForm(form)), [form]);
  const sorted = useMemo(() => [...rows].sort((a, b) => b.period.localeCompare(a.period)), [rows]);

  function pick(p: string) {
    setPeriod(p);
    setForm(toForm(rows.find((r) => r.period === p)?.data));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const r = await fetch("/api/financials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ period, data: fromForm(form) }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r?.ok) return setMsg(j.error ?? "לא נשמר. נסה שוב.");
    setRows((x) => [...x.filter((y) => y.period !== period), { period, data: j.data }]);
    setEditing(false);
    setMsg("נשמר. דובדבוט יתייחס למספרים האלה בשיחות.");
  }

  const prev = sorted.find((r) => r.period < period);
  const prevCalc = prev ? calc(prev.data) : null;
  const delta = (a: number, b: number | undefined) => (b === undefined || !b ? null : Math.round(((a - b) / Math.abs(b)) * 100));

  return (
    <section className="vcard w12 glass edge fin">
      <div className="vcard-h">
        <h3><Icon name="chart" size={20} /> הנתונים הכספיים שלי</h3>
        <span className="muted" style={{ fontSize: 13.5 }}>רווח והפסד + מאזן בסיסי, חודש אחרי חודש</span>
      </div>

      <div className="fin-top">
        <label className="fin-month">
          <span>חודש</span>
          <input type="month" value={period} onChange={(e) => e.target.value && pick(e.target.value)} className="input" dir="ltr" />
        </label>
        {!editing && <button className="btn btn-glass btn-sm" onClick={() => setEditing(true)}><Icon name="plus" size={15} /> {existing ? "עדכון החודש" : "הזנת החודש"}</button>}
        {sorted.length > 0 && (
          <div className="fin-months">
            {sorted.slice(0, 6).map((r) => (
              <button key={r.period} className={`chip ${r.period === period ? "on" : ""}`} onClick={() => pick(r.period)}>{monthName(r.period)}</button>
            ))}
          </div>
        )}
      </div>

      <div className="fin-kpis">
        {[
          ["הכנסות", live.revenue, delta(live.revenue, prevCalc?.revenue)],
          ["רווח גולמי", live.gross, null, `${live.grossPct}%`],
          ["רווח תפעולי", live.operating, delta(live.operating, prevCalc?.operating), `${live.operatingPct}%`],
          ["נשאר בכיס", live.net, null, `${live.netPct}%`],
        ].map(([label, v, d, sub]) => (
          <div className="fin-kpi" key={label as string}>
            <span>{label as string}</span>
            <b className={`num ${(v as number) < 0 ? "neg" : ""}`}>{money(v as number)}</b>
            <small>
              {sub ? `${sub} מההכנסות` : ""}
              {d !== null && d !== undefined ? <em className={(d as number) >= 0 ? "up" : "down"}> {(d as number) >= 0 ? "▲" : "▼"} {Math.abs(d as number)}% מהחודש הקודם</em> : null}
            </small>
          </div>
        ))}
      </div>

      {editing ? (
        <form className="fin-form" onSubmit={save}>
          <div className="fin-grid">
            {FIN_FIELDS.map((f, i) => (
              <label key={f.key} className="field">
                <span>{f.label}{i === 7 ? <i className="fin-sep">מאזן</i> : null}</span>
                <input className="input" inputMode="numeric" dir="ltr" placeholder="0" value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value.replace(/[^\d.,-]/g, "") })} />
              </label>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-primary" disabled={busy}>{busy ? "שומר…" : `שמירת ${monthName(period)}`}</button>
            {rows.length > 0 && <button type="button" className="btn btn-ghost" onClick={() => { setEditing(false); pick(period); }}>ביטול</button>}
            <small className="muted">החישובים נעשים אצלך – בלי AI ובלי עלות. אפשר להשאיר שדות ריקים.</small>
          </div>
        </form>
      ) : (
        <div className="fin-actions">
          <a className="btn btn-glass btn-sm" href={`/chat?new=1&tool=financials`}><Icon name="spark" size={15} /> ניתוח עם דובדבוט</a>
          {live.marketingPct > 0 && <span className="pill">שיווק: {live.marketingPct}% מההכנסות</span>}
          {live.salariesPct > 0 && <span className="pill">שכר: {live.salariesPct}% מההכנסות</span>}
          {live.cash > 0 && <span className="pill">בבנק: {money(live.cash)}</span>}
          {live.debts > 0 && <span className="pill expired">חובות: {money(live.debts)}</span>}
        </div>
      )}
      {msg && <p className="muted" style={{ margin: 0, fontSize: 14 }}>{msg}</p>}
    </section>
  );
}

function toForm(d?: FinData): Record<string, string> {
  const o: Record<string, string> = {};
  for (const f of FIN_FIELDS) if (d?.[f.key]) o[f.key] = String(d[f.key]);
  return o;
}
function fromForm(f: Record<string, string>): FinData {
  const o: FinData = {};
  for (const x of FIN_FIELDS) {
    const v = Number(String(f[x.key] ?? "").replace(/,/g, ""));
    if (Number.isFinite(v) && v) o[x.key] = v;
  }
  return o;
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Brand } from "../BrandBar";
import Icon from "../Icon";
import AnswerBank from "./AnswerBank";
import LiveCounter from "./LiveCounter";
import PromoSpend from "./PromoSpend";
import Spotlight from "../Spotlight";
import { PLANS, planById, priceOf, ils } from "@/lib/plans";

type Row = {
  id: string; name: string; email: string; phone: string; createdAt: string;
  status: "trial" | "paid" | "expired"; tier: string | null; billing: string | null; accessUntil: string; daysLeft: number;
  paidAt: string | null; paidBy: string | null; renewalRequestedAt: string | null; note: string | null;
  business: string | null; conversations: number; lastActive: string | null;
  answers30: number; answersToday: number; cost30: number;
  money?: number | null; moneyLevel?: string | null;
  consent?: boolean; consentAt?: string | null; consentSource?: string | null; consentVersion?: string | null;
};
const CONSENT_SRC: Record<string, string> = { signup: "בהרשמה", signup_claim: "בהרשמה", gate: "במסך האישור", meta_lead_form: "בטופס מטא" };
type Lead = { id: string; user_id: string | null; meeting_type: string; full_name: string; phone: string; email: string | null; note: string | null; created_at: string; status: string };
type Tab = "requests" | "all" | "trial" | "paid" | "expired" | "leads" | "bank";

const STATUS: Record<Row["status"], string> = { trial: "מתנה 30 יום", paid: "מנוי שנתי", expired: "חסום" };
const d = (s: string | null) => (s ? new Date(s).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "אין");
const MEET: Record<string, string> = { renewal: "חידוש / מנוי", nir: "פגישה עם ניר", advisor: "פגישת יועץ" };

export default function AdminDashboard({ adminName, preview }: { adminName: string; preview?: { users: Row[]; leads: Lead[] } }) {
  const [rows, setRows] = useState<Row[]>(preview?.users ?? []);
  const [leads, setLeads] = useState<Lead[]>(preview?.leads ?? []);
  const [dl, setDl] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("requests");
  const [q, setQ] = useState("");
  const [consentF, setConsentF] = useState<"all" | "yes" | "no">("all");
  const [loading, setLoading] = useState(!preview);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ row: Row; action: string } | null>(null);
  const [toast, setToast] = useState("");
  const [payTier, setPayTier] = useState("basic");
  const [payBilling, setPayBilling] = useState<"onetime" | "installments">("onetime");

  const load = useCallback(async () => {
    if (preview) return setLoading(false);
    const r = await fetch("/api/backoffice/users", { cache: "no-store" }).catch(() => null);
    if (r?.status === 401) return (window.location.href = "/admin/login");
    const j = r?.ok ? await r.json() : null;
    if (j) {
      setRows(j.users);
      setLeads(j.leads);
    }
    setLoading(false);
  }, [preview]);
  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => ({
      requests: rows.filter((r) => r.renewalRequestedAt).length,
      all: rows.length,
      trial: rows.filter((r) => r.status === "trial").length,
      paid: rows.filter((r) => r.status === "paid").length,
      expired: rows.filter((r) => r.status === "expired").length,
      leads: leads.length,
      bank: 0,
    }),
    [rows, leads]
  );

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows
      .filter((r) => (tab === "requests" ? !!r.renewalRequestedAt : tab === "all" || tab === "leads" ? true : r.status === tab))
      .filter((r) => consentF === "all" || (consentF === "yes" ? r.consent === true : r.consent !== true))
      .filter((r) => !s || [r.name, r.email, r.phone, r.business ?? ""].some((x) => x.toLowerCase().includes(s)))
      .sort((a, b) => (tab === "requests" ? (b.renewalRequestedAt ?? "").localeCompare(a.renewalRequestedAt ?? "") : 0));
  }, [rows, tab, q, consentF]);

  async function act(row: Row, action: string, note?: string) {
    setBusy(row.id + action);
    const r = await fetch("/api/backoffice/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: row.id, action, note, tier: payTier, billing: payBilling }) }).catch(() => null);
    setBusy(null);
    setConfirm(null);
    if (!r?.ok) return flash("הפעולה נכשלה. נסה שוב.");
    flash(action === "paid" ? `${planById(payTier)?.name} נפתח ל${row.name}` : action === "extend30" ? `הוארך ב-30 יום ל${row.name}` : action === "block" ? `הגישה של ${row.name} נחסמה` : "נשמר");
    load();
  }
  /** Download the full business file (.docx). Same admin cookie as every back-office call. */
  async function dossier(row: Row) {
    setDl(row.id);
    try {
      const r = await fetch(`/api/backoffice/dossier?userId=${row.id}`, { cache: "no-store" });
      if (r.status === 401) return void (window.location.href = "/admin/login");
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `התיק-העסקי-${row.name.replace(/\s+/g, "-")}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      flash(`התיק העסקי של ${row.name} ירד`);
    } catch {
      flash("לא הצלחנו להפיק את התיק. נסה שוב.");
    }
    setDl(null);
  }
  function flash(t: string) {
    setToast(t);
    setTimeout(() => setToast(""), 2600);
  }
  async function logout() {
    await fetch("/api/backoffice/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  const TABS: [Tab, string][] = [["requests", "ביקשו להמשיך"], ["all", "כל המשתמשים"], ["trial", "במתנה"], ["paid", "משלמים"], ["expired", "חסומים"], ["leads", "כל הפניות"], ["bank", "מאגר תשובות"]];

  return (
    <>
    <Spotlight />
    <div className="adm">
      <header className="adm-top">
        <Brand sub={false} size={30} href="/admin" />
        <span className="badge">ניהול מנויים</span>
        <nav className="rv-nav" aria-label="ניווט בניהול">
          <a href="/admin" className="on" aria-current="page">ניהול מנויים</a>
          <a href="/admin/payments">דשבורד הכנסות</a>
        </nav>
        <span style={{ flex: 1 }} />
        <span className="muted" style={{ fontSize: 14 }}>שלום, {adminName}</span>
        <button className="btn btn-ghost btn-sm" onClick={logout}><Icon name="logout" size={16} /> יציאה</button>
      </header>

      {!preview && <LiveCounter />}
      {!preview && <PromoSpend />}

      <section className="adm-stats">
        {([["requests", "ממתינים לנציג", "cherry"], ["trial", "במנוי מתנה", ""], ["paid", "מנוי שנתי", "gold"], ["expired", "חסומים", ""], ["all", "סה״כ משתמשים", ""]] as [Tab, string, string][]).map(([k, label, tone]) => (
          <button key={k} className={`adm-stat glass edge ${tone} ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>
            <b className="num">{counts[k]}</b>
            <span>{label}</span>
          </button>
        ))}
      </section>

      <p className="muted" style={{ margin: "0 0 14px", fontSize: 14 }}>
        עלות AI משוערת ב-30 הימים האחרונים (טקסט, בלי קול): ₪{rows.reduce((a, r) => a + r.cost30, 0).toFixed(2)} · {rows.reduce((a, r) => a + r.answers30, 0)} תשובות
      </p>

      <div className="adm-bar">
        <div className="adm-tabs" role="tablist">
          {TABS.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l} {k !== "bank" && <small>{counts[k]}</small>}</button>
          ))}
        </div>
        <div className="adm-search"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי שם, טלפון, מייל או עסק" /></div>
        <select className="input adm-filter" value={consentF} onChange={(e) => setConsentF(e.target.value as "all" | "yes" | "no")} aria-label="סינון לפי אישור דיוור">
          <option value="all">דיוור: כולם</option>
          <option value="yes">אישרו דיוור ({rows.filter((r) => r.consent).length})</option>
          <option value="no">לא אישרו ({rows.filter((r) => !r.consent).length})</option>
        </select>
        <button className="btn btn-glass btn-sm" onClick={() => { setLoading(true); load(); }}>רענון</button>
      </div>

      {tab === "bank" ? (
        <AnswerBank flash={flash} />
      ) : loading ? (
        <div className="adm-list" aria-busy="true" aria-label="טוען משתמשים">
          {[0, 1, 2].map((i) => (
            <div key={i} className="adm-card glass edge skel-card"><span className="skel" style={{ width: "40%" }} /><span className="skel" style={{ width: "70%" }} /><span className="skel" style={{ width: "55%" }} /></div>
          ))}
        </div>
      ) : tab === "leads" ? (
        <div className="adm-table glass edge">
          <table>
            <thead><tr><th>תאריך</th><th>סוג</th><th>שם</th><th>טלפון</th><th>מייל</th><th>הערה</th></tr></thead>
            <tbody>
              {leads.filter((l) => !q || [l.full_name, l.phone, l.email ?? ""].some((x) => x.toLowerCase().includes(q.toLowerCase()))).map((l) => (
                <tr key={l.id}>
                  <td className="num">{d(l.created_at)}</td>
                  <td><span className={`pill ${l.meeting_type === "renewal" ? "cherry" : ""}`}>{MEET[l.meeting_type] ?? l.meeting_type}</span></td>
                  <td>{l.full_name}</td>
                  <td><a href={`tel:${l.phone}`} dir="ltr">{l.phone}</a></td>
                  <td dir="ltr">{l.email ?? ""}</td>
                  <td className="muted">{l.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : shown.length === 0 ? (
        <div className="adm-empty glass edge">{tab === "requests" ? "אין כרגע בקשות פתוחות. הכל טופל." : "אין משתמשים בתצוגה הזו."}</div>
      ) : (
        <div className="adm-list">
          {shown.map((r) => (
            <article key={r.id} className={`adm-card glass edge ${r.renewalRequestedAt ? "req" : ""}`}>
              <div className="adm-who">
                <b>{r.name}</b>
                <span className="muted">{r.business ?? "העסק עוד לא ידוע"}</span>
                <span className="adm-contact">
                  <a href={`tel:${r.phone}`} dir="ltr">{r.phone}</a>
                  <a href={`https://wa.me/972${r.phone.replace(/^0/, "")}`} target="_blank" rel="noreferrer">וואטסאפ</a>
                  <a href={`mailto:${r.email}`} dir="ltr">{r.email}</a>
                </span>
              </div>
              <div className="adm-meta">
                <span className="adm-pills">
                  <span className={`pill ${r.status}`}>{r.status === "paid" ? planById(r.tier)?.name ?? STATUS.paid : STATUS[r.status]}</span>
                  {r.consent
                    ? <span className="pill ok" title={[r.consentSource ? CONSENT_SRC[r.consentSource] ?? r.consentSource : "", r.consentVersion ?? ""].filter(Boolean).join(" · ")}>דיוור מאושר {d(r.consentAt ?? null)}</span>
                    : <span className="pill cherry" title="יראה את מסך האישור בכניסה הבאה">דיוור לא אושר</span>}
                  {r.money != null && <span className="pill money" title={r.moneyLevel ?? ""}>כסף {r.money}/100{r.moneyLevel ? ` · ${r.moneyLevel}` : ""}</span>}
                </span>
                <span>{r.status === "expired" ? `הסתיים ${d(r.accessUntil)}` : `עד ${d(r.accessUntil)} · ${r.daysLeft} ימים`}</span>
                <span className="muted">נרשם {d(r.createdAt)} · {r.conversations} שיחות · פעיל לאחרונה {d(r.lastActive)}</span>
                <span className={r.cost30 >= 10 ? "adm-req" : "muted"}>שימוש 30 יום: {r.answers30} תשובות ({r.answersToday} היום) · עלות AI משוערת ₪{r.cost30.toFixed(2)}</span>
                {r.paidAt && <span className="muted">שולם {d(r.paidAt)}{r.paidBy ? ` · סומן ע״י ${r.paidBy}` : ""}</span>}
                {r.renewalRequestedAt && <span className="adm-req"><Icon name="bolt" size={14} /> ביקש להמשיך ב-{d(r.renewalRequestedAt)}</span>}
              </div>
              <div className="adm-actions">
                <button className="btn btn-glass btn-sm adm-file" disabled={dl === r.id} onClick={() => dossier(r)} aria-label={`הורדת התיק העסקי של ${r.name}`}><Icon name="download" size={16} /> {dl === r.id ? "מפיק את התיק…" : "הורדת התיק העסקי"}</button>
                <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => { setPayTier(r.tier && r.status === "paid" ? r.tier : "basic"); setConfirm({ row: r, action: "paid" }); }}><Icon name="check" size={16} /> {r.status === "paid" ? "שדרוג / חידוש" : "שולם: פתיחת מסלול"}</button>
                <button className="btn btn-glass btn-sm" disabled={!!busy} onClick={() => act(r, "extend30")}>+30 יום</button>
                {r.renewalRequestedAt && <button className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => act(r, "clear_request")}>טופל</button>}
                {r.status !== "expired" && <button className="btn btn-ghost btn-sm danger" disabled={!!busy} onClick={() => setConfirm({ row: r, action: "block" })}>חסימה</button>}
                <button className="btn btn-ghost btn-sm" onClick={() => { const n = prompt("הערה פנימית על המשתמש", r.note ?? ""); if (n !== null) act(r, "note", n); }}>{r.note ? "הערה ✎" : "הוספת הערה"}</button>
              </div>
              {r.note && <p className="adm-note">{r.note}</p>}
            </article>
          ))}
        </div>
      )}

      {confirm && (
        <div className="overlay" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && setConfirm(null)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <h3 style={{ marginTop: 0 }}>{confirm.action === "paid" ? "איזה מסלול נסגר?" : "לחסום את הגישה?"}</h3>
            {confirm.action === "paid" && (
              <div style={{ display: "grid", gap: 8, margin: "8px 0 4px" }}>
                <select className="input" value={payTier} onChange={(e) => setPayTier(e.target.value)} aria-label="מסלול">
                  {PLANS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select className="input" value={payBilling} onChange={(e) => setPayBilling(e.target.value as "onetime" | "installments")} aria-label="אופן תשלום">
                  <option value="onetime">תשלום אחד</option>
                  <option value="installments">12 תשלומים</option>
                </select>
                <small className="muted">{ils(priceOf(payTier as "basic", payBilling).total, 2)} כולל מע״מ · הקורסים נפתחים והאוטומציות יוצאות לבד</small>
              </div>
            )}
            <p className="sub">
              {confirm.action === "paid"
                ? `${confirm.row.name} יקבל את המסלול לשנה${confirm.row.status === "trial" ? ", החל מסוף חודש המתנה" : ""}. אחרי השנה: ₪69 + מע״מ לחודש אוטומטית.`
                : `${confirm.row.name} יראה מיד את מסך "רוצה להמשיך?" ולא יוכל להשתמש בכלים.`}
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button className={`btn ${confirm.action === "paid" ? "btn-primary" : "btn-glass danger"}`} disabled={!!busy} onClick={() => act(confirm.row, confirm.action)}>{busy ? "רגע…" : confirm.action === "paid" ? "כן, שולם" : "כן, לחסום"}</button>
              <button className="btn btn-ghost" onClick={() => setConfirm(null)}>ביטול</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="saved-toast" role="status">{toast}</div>}
    </div>
    </>
  );
}

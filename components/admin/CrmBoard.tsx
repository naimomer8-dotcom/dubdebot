"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Brand } from "../BrandBar";
import Icon from "../Icon";
import { CRM_STATUSES, MEETING_LABEL, PARTNERS, statusLabel } from "@/lib/crmShared";

type Lead = {
  id: string; user_id: string | null; meeting_type: string; full_name: string; phone: string; email: string | null;
  note: string | null; summary: string | null; trigger: string | null; status: string; created_at: string; updated_at: string | null;
  assigned_to: string | null; meeting_at: string | null; next_call_at: string | null;
  user: { status: "trial" | "paid" | "expired" | "lead"; tier: string | null; signedUp: string } | null;
};
type Act = { id: string; lead_id: string | null; user_id: string | null; admin_id: string | null; kind: string; body: string | null; synced_at: string | null; created_at: string };
type Admin = { id: string; display_name: string; username: string };
type Sale = { id: string; user_id: string | null; customer_name: string; customer_phone: string | null; partner: string; product: string; amount_net: number; commission_pct: number; commission_amount: number; commission_paid: boolean; sold_at: string; admin_id: string | null; note: string | null };

const USER_ST: Record<string, string> = { trial: "במתנה", paid: "משלם", expired: "חסום", lead: "ליד" };
const KIND_ICO: Record<string, string> = { note: "📝", call: "📞", status: "🔄", meeting: "📅", sale: "💰", assign: "👤" };
const ils = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;
const when = (s: string | null) => (s ? new Date(s).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "");
function ago(s: string) {
  const m = Math.round((Date.now() - Date.parse(s)) / 60000);
  if (m < 60) return `לפני ${Math.max(1, m)} דק׳`;
  const h = Math.round(m / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  return `לפני ${Math.round(h / 24)} ימים`;
}
/** datetime-local value in Israel time */
function localInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
const wa = (phone: string) => `https://wa.me/972${phone.replace(/\D/g, "").replace(/^0/, "")}`;

export default function CrmBoard({ adminName }: { adminName: string }) {
  const [data, setData] = useState<{ me: { id: string }; admins: Admin[]; leads: Lead[]; activities: Act[]; sales: Sale[] } | null>(null);
  const [view, setView] = useState<"leads" | "sales">("leads");
  const [status, setStatus] = useState<string>("open");
  const [type, setType] = useState<string>("all");
  const [mine, setMine] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/backoffice/crm", { cache: "no-store" }).catch(() => null);
    if (r?.status === 401) return void (window.location.href = "/admin/login");
    if (r?.ok) setData(await r.json());
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(""), 2600); };

  const leads = data?.leads ?? [];
  const now = Date.now();
  const isOpen = (l: Lead) => !["met", "sold", "not_relevant"].includes(l.status);
  const late = (l: Lead) => l.status === "new" && now - Date.parse(l.created_at) > 24 * 3600_000;
  const dueCall = (l: Lead) => !!l.next_call_at && Date.parse(l.next_call_at) <= now + 3600_000 && isOpen(l);
  const kpi = useMemo(() => {
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const sales = (data?.sales ?? []).filter((s) => Date.parse(s.sold_at) >= monthStart.getTime());
    return {
      fresh: leads.filter((l) => l.status === "new").length,
      late: leads.filter(late).length,
      due: leads.filter(dueCall).length,
      upcoming: leads.filter((l) => l.status === "scheduled" && l.meeting_at && Date.parse(l.meeting_at) >= now - 3600_000).length,
      met: leads.filter((l) => (l.status === "met" || l.status === "sold") && Date.parse(l.updated_at ?? l.created_at) >= monthStart.getTime()).length,
      commission: sales.reduce((a, s) => a + Number(s.commission_amount), 0),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { open: leads.filter(isOpen).length, all: leads.length, due: leads.filter(dueCall).length };
    for (const s of CRM_STATUSES) c[s.id] = leads.filter((l) => l.status === s.id).length;
    return c;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return leads
      .filter((l) => (status === "all" ? true : status === "open" ? isOpen(l) : status === "due" ? dueCall(l) : l.status === status))
      .filter((l) => type === "all" || l.meeting_type === type)
      .filter((l) => !mine || l.assigned_to === data?.me.id)
      .filter((l) => !s || [l.full_name, l.phone, l.email ?? ""].some((x) => x.toLowerCase().includes(s)))
      // people who picked a time for their call come first (Nir, 23.11), then leads waiting more than 24h
      .sort((a, b) => Number(dueCall(b)) - Number(dueCall(a)) || Number(late(b)) - Number(late(a)) || b.created_at.localeCompare(a.created_at));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, status, type, mine, q]);

  const adminName_ = (id: string | null) => data?.admins.find((a) => a.id === id)?.display_name ?? "";
  const cur = leads.find((l) => l.id === open) ?? null;

  async function logout() {
    await fetch("/api/backoffice/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <div className="adm">
      <header className="adm-top">
        <Brand sub={false} size={30} href="/admin" />
        <span className="badge">CRM פלטפורמה</span>
        <nav className="rv-nav" aria-label="ניווט בניהול">
          <a href="/admin">ניהול מנויים</a>
          <a href="/admin/crm" className="on" aria-current="page">CRM לידים</a>
          <a href="/admin/payments">דשבורד הכנסות</a>
          <a href="/admin/library">ספריית וידאו</a>
        </nav>
        <span style={{ flex: 1 }} />
        <span className="muted" style={{ fontSize: 14 }}>שלום, {adminName}</span>
        <button className="btn btn-ghost btn-sm" onClick={logout}><Icon name="logout" size={16} /> יציאה</button>
      </header>

      <section className="crm-kpis">
        <button className={`crm-kpi cherry ${status === "new" ? "on" : ""}`} onClick={() => { setView("leads"); setStatus("new"); }}><b className="num">{kpi.fresh}</b><span>חדשים לטיפול</span>{kpi.late > 0 && <em>{kpi.late} מעל 24 שעות</em>}</button>
        <button className={`crm-kpi ${status === "due" ? "on" : ""}`} onClick={() => { setView("leads"); setStatus("due"); }}><b className="num">{kpi.due}</b><span>שיחות חוזרות עכשיו</span></button>
        <button className={`crm-kpi gold ${status === "scheduled" ? "on" : ""}`} onClick={() => { setView("leads"); setStatus("scheduled"); }}><b className="num">{kpi.upcoming}</b><span>פגישות שנקבעו</span></button>
        <div className="crm-kpi"><b className="num">{kpi.met}</b><span>פגישות שהתקיימו החודש</span></div>
        <button className={`crm-kpi gold ${view === "sales" ? "on" : ""}`} onClick={() => setView("sales")}><b className="num">{ils(kpi.commission)}</b><span>עמלות ממכירות חיצוניות החודש</span></button>
      </section>

      <div className="adm-bar">
        <div className="adm-tabs" role="tablist">
          <button role="tab" aria-selected={view === "leads"} className={view === "leads" ? "on" : ""} onClick={() => setView("leads")}>לידים <small>{counts.open}</small></button>
          <button role="tab" aria-selected={view === "sales"} className={view === "sales" ? "on" : ""} onClick={() => setView("sales")}>מכירות חיצוניות <small>{data?.sales.length ?? 0}</small></button>
        </div>
        <div className="adm-search"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי שם, טלפון או מייל" /></div>
        <button className="btn btn-glass btn-sm" onClick={() => { load(); flash("רוענן"); }}>רענון</button>
      </div>

      {!data ? (
        <div className="adm-list" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="adm-card glass edge skel-card"><span className="skel" style={{ width: "40%" }} /><span className="skel" style={{ width: "70%" }} /></div>)}</div>
      ) : view === "sales" ? (
        <SalesView sales={data.sales} leads={leads} adminName={adminName_} reload={load} flash={flash} />
      ) : (
        <>
          <div className="crm-chips" role="group" aria-label="סינון לפי סטטוס">
            {[["open", "פתוחים"], ["due", "לחזור עכשיו"], ...CRM_STATUSES.map((s) => [s.id, s.label]), ["all", "הכל"]].map(([k, l]) => (
              <button key={k} className={status === k ? "on" : ""} onClick={() => setStatus(k)}>{l} <small>{counts[k] ?? 0}</small></button>
            ))}
            <span style={{ flex: 1 }} />
            <select className="input crm-sel" value={type} onChange={(e) => setType(e.target.value)} aria-label="סוג פנייה">
              <option value="all">כל סוגי הפניות</option>
              {Object.entries(MEETING_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <label className="crm-mine"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> רק שלי</label>
          </div>

          {shown.length === 0 ? (
            <div className="adm-empty glass edge">אין לידים בתצוגה הזו.</div>
          ) : (
            <div className="crm-list">
              {shown.slice(0, 400).map((l) => (
                <button key={l.id} className={`crm-row glass edge ${late(l) ? "late" : ""} ${open === l.id ? "on" : ""}`} onClick={() => setOpen(l.id)}>
                  <span className={`crm-dot s-${l.status}`} aria-hidden="true" />
                  <span className="crm-who">
                    <b>{l.full_name}</b>
                    <small dir="ltr">{l.phone}</small>
                  </span>
                  <span className="crm-type">{MEETING_LABEL[l.meeting_type] ?? l.meeting_type}</span>
                  <span className={`pill ${CRM_STATUSES.find((s) => s.id === l.status)?.tone ?? ""}`}>{statusLabel(l.status)}</span>
                  <span className="crm-when">
                    {l.status === "scheduled" && l.meeting_at ? <>📅 {when(l.meeting_at)}</> : dueCall(l) ? <>📞 {when(l.next_call_at)}</> : <>{ago(l.created_at)}</>}
                    {late(l) && <em>מעל 24 שעות</em>}
                  </span>
                  <span className="crm-user">{l.user ? USER_ST[l.user.status] : ""}{l.user?.tier ? ` · ${l.user.tier}` : ""}</span>
                  <span className="crm-owner">{adminName_(l.assigned_to)}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {cur && data && (
        <LeadDrawer key={cur.id} lead={cur} acts={data.activities.filter((a) => a.lead_id === cur.id || (cur.user_id && a.user_id === cur.user_id))} sales={data.sales.filter((s) => (cur.user_id && s.user_id === cur.user_id))} admins={data.admins} adminName={adminName_} onClose={() => setOpen(null)} reload={load} flash={flash} />
      )}
      {toast && <div className="saved-toast" role="status">{toast}</div>}
    </div>
  );
}

function LeadDrawer({ lead, acts, sales, admins, adminName, onClose, reload, flash }: { lead: Lead; acts: Act[]; sales: Sale[]; admins: Admin[]; adminName: (id: string | null) => string; onClose: () => void; reload: () => Promise<void>; flash: (t: string) => void }) {
  const [note, setNote] = useState("");
  const [meeting, setMeeting] = useState(localInput(lead.meeting_at));
  const [callAt, setCallAt] = useState(localInput(lead.next_call_at));
  const [busy, setBusy] = useState(false);
  const [sale, setSale] = useState(false);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  async function patch(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    const r = await fetch("/api/backoffice/crm", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId: lead.id, ...body }) }).catch(() => null);
    setBusy(false);
    if (!r?.ok) return flash("לא נשמר. נסה שוב.");
    const j = await r.json();
    flash(j.synced ? `${ok} · עודכן בפיירברי` : ok);
    setNote("");
    await reload();
  }
  const toIso = (v: string) => (v ? new Date(v).toISOString() : null);

  return (
    <div className="crm-drawer-wrap" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="crm-drawer" role="dialog" aria-modal="true" aria-label={`כרטיס ${lead.full_name}`}>
        <header className="crm-dh">
          <div>
            <h2>{lead.full_name}</h2>
            <p className="muted">{MEETING_LABEL[lead.meeting_type] ?? lead.meeting_type} · נכנס {ago(lead.created_at)}{lead.user ? ` · ${USER_ST[lead.user.status]}${lead.user.tier ? ` (${lead.user.tier})` : ""}` : ""}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="סגירה"><Icon name="close" size={18} /></button>
        </header>

        <div className="crm-contact">
          <a className="btn btn-primary btn-sm" href={`tel:${lead.phone}`}><Icon name="phone" size={15} /> <span dir="ltr">{lead.phone}</span></a>
          <a className="btn btn-glass btn-sm" href={wa(lead.phone)} target="_blank" rel="noopener noreferrer"><Icon name="chat" size={15} /> וואטסאפ</a>
          {lead.email && <span className="muted crm-mail" dir="ltr">{lead.email}</span>}
        </div>
        {(lead.summary || lead.note) && <p className="crm-sum">{lead.summary || lead.note}</p>}
        {lead.meeting_type === "onboarding" && <CallScript />}

        <section className="crm-sec">
          <h3>סטטוס</h3>
          <div className="crm-stbtns">
            {CRM_STATUSES.map((s) => (
              <button key={s.id} disabled={busy} className={`crm-st ${lead.status === s.id ? "on" : ""} ${s.tone}`} onClick={() => patch({ status: s.id, note, call: ["no_answer", "callback", "not_relevant"].includes(s.id) }, statusLabel(s.id))}>{s.label}</button>
            ))}
          </div>
        </section>

        <section className="crm-sec crm-2">
          <label>
            <span>מועד הפגישה</span>
            <input className="input" type="datetime-local" value={meeting} onChange={(e) => setMeeting(e.target.value)} />
            <button className="btn btn-primary btn-sm" disabled={busy || !meeting} onClick={() => patch({ meetingAt: toIso(meeting), note }, "הפגישה נקבעה")}>קביעת פגישה</button>
          </label>
          <label>
            <span>לחזור אליו ב-</span>
            <input className="input" type="datetime-local" value={callAt} onChange={(e) => setCallAt(e.target.value)} />
            <button className="btn btn-glass btn-sm" disabled={busy || !callAt} onClick={() => patch({ nextCallAt: toIso(callAt), status: "callback", note, call: true }, "נשמרה שיחה חוזרת")}>שמירת תזכורת</button>
          </label>
        </section>

        <section className="crm-sec">
          <h3>תיעוד</h3>
          <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="מה עלה בשיחה? (נשמר גם בפיירברי)" />
          <div className="crm-row-btns">
            <button className="btn btn-glass btn-sm" disabled={busy || !note.trim()} onClick={() => patch({ note, call: true }, "השיחה תועדה")}>📞 תיעוד שיחה</button>
            <button className="btn btn-ghost btn-sm" disabled={busy || !note.trim()} onClick={() => patch({ note }, "ההערה נשמרה")}>📝 הערה</button>
            <span style={{ flex: 1 }} />
            <select className="input crm-sel" value={lead.assigned_to ?? ""} onChange={(e) => patch({ assignTo: e.target.value || null }, "השיוך עודכן")} aria-label="שיוך לנציג">
              <option value="">ללא שיוך</option>
              {admins.map((a) => <option key={a.id} value={a.id}>{a.display_name}</option>)}
            </select>
          </div>
        </section>

        <section className="crm-sec">
          <div className="crm-h3row"><h3>מכירות חיצוניות</h3><button className="link-btn" onClick={() => setSale(!sale)}>{sale ? "ביטול" : "+ דיווח מכירה"}</button></div>
          {sale && <SaleForm leadId={lead.id} onDone={async () => { setSale(false); await reload(); }} flash={flash} />}
          {sales.length === 0 && !sale && <p className="muted crm-small">אין מכירות חיצוניות ללקוח הזה.</p>}
          {sales.map((s) => <p key={s.id} className="crm-small">💰 {s.product} · {ils(Number(s.amount_net))} · {PARTNERS[s.partner] ?? s.partner} · עמלה {ils(Number(s.commission_amount))}{s.commission_paid ? " ✓ שולמה" : ""}</p>)}
        </section>

        <section className="crm-sec">
          <h3>היסטוריה</h3>
          <ol className="crm-tl">
            {acts.length === 0 && <li className="muted">אין עדיין פעילות.</li>}
            {acts.map((a) => (
              <li key={a.id}>
                <span className="crm-tl-ico" aria-hidden="true">{KIND_ICO[a.kind] ?? "•"}</span>
                <div>
                  <p>{a.body}</p>
                  <small className="muted">{when(a.created_at)}{a.admin_id ? ` · ${adminName(a.admin_id)}` : " · אוטומטי"}{a.synced_at ? " · ✓ פיירברי" : ""}</small>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </aside>
    </div>
  );
}

function SaleForm({ leadId, onDone, flash }: { leadId?: string; onDone: () => Promise<void>; flash: (t: string) => void }) {
  const [f, setF] = useState({ partner: "olmo", product: "", amountNet: "", commissionPct: "", soldAt: new Date().toISOString().slice(0, 10), customerName: "", customerPhone: "", note: "" });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const commission = Number(f.amountNet) * Number(f.commissionPct) / 100;
  async function save() {
    setBusy(true);
    const r = await fetch("/api/backoffice/crm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, leadId }) }).catch(() => null);
    setBusy(false);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) return setErr(j.errors ?? { form: "לא נשמר" });
    flash(j.synced ? "המכירה נשמרה · עודכן בפיירברי" : "המכירה נשמרה");
    await onDone();
  }
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="crm-sale">
      {!leadId && (
        <div className="crm-2">
          <label><span>שם הלקוח</span><input className="input" value={f.customerName} onChange={set("customerName")} />{err.customerName && <em>{err.customerName}</em>}</label>
          <label><span>טלפון</span><input className="input" dir="ltr" value={f.customerPhone} onChange={set("customerPhone")} /></label>
        </div>
      )}
      <div className="crm-2">
        <label><span>מי מכר</span><select className="input" value={f.partner} onChange={set("partner")}>{Object.entries(PARTNERS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label><span>מה נמכר</span><input className="input" value={f.product} onChange={set("product")} placeholder="שם החבילה" />{err.product && <em>{err.product}</em>}</label>
      </div>
      <div className="crm-3">
        <label><span>סכום לפני מע״מ</span><input className="input num" inputMode="decimal" value={f.amountNet} onChange={set("amountNet")} />{err.amountNet && <em>{err.amountNet}</em>}</label>
        <label><span>אחוז עמלה לנו</span><input className="input num" inputMode="decimal" value={f.commissionPct} onChange={set("commissionPct")} />{err.commissionPct && <em>{err.commissionPct}</em>}</label>
        <label><span>תאריך</span><input className="input" type="date" value={f.soldAt} onChange={set("soldAt")} /></label>
      </div>
      <textarea className="input" rows={2} value={f.note} onChange={set("note")} placeholder="הערה (לא חובה)" />
      <div className="crm-row-btns">
        <span className="muted">עמלה: <b className="num">{Number.isFinite(commission) ? ils(commission) : "₪0"}</b></span>
        <span style={{ flex: 1 }} />
        <button className="btn btn-primary btn-sm" disabled={busy} onClick={save}>{busy ? "שומר…" : "שמירת מכירה"}</button>
      </div>
      {err.form && <p className="evp-err">{err.form}</p>}
    </div>
  );
}

function SalesView({ sales, leads, adminName, reload, flash }: { sales: Sale[]; leads: Lead[]; adminName: (id: string | null) => string; reload: () => Promise<void>; flash: (t: string) => void }) {
  const [add, setAdd] = useState(false);
  const byMonth = useMemo(() => {
    const m = new Map<string, { amount: number; commission: number; open: number; n: number }>();
    for (const s of sales) {
      const k = s.sold_at.slice(0, 7);
      const v = m.get(k) ?? { amount: 0, commission: 0, open: 0, n: 0 };
      v.amount += Number(s.amount_net); v.commission += Number(s.commission_amount); v.n++;
      if (!s.commission_paid) v.open += Number(s.commission_amount);
      m.set(k, v);
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [sales]);
  async function togglePaid(s: Sale) {
    const r = await fetch("/api/backoffice/crm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "commission_paid", saleId: s.id, paid: !s.commission_paid }) }).catch(() => null);
    if (!r?.ok) return flash("לא נשמר");
    flash(s.commission_paid ? "סומן כלא שולם" : "העמלה סומנה כשולמה");
    await reload();
  }
  void leads;
  return (
    <>
      <div className="crm-months">
        {byMonth.length === 0 && <p className="muted">עוד לא דווחו מכירות חיצוניות.</p>}
        {byMonth.map(([k, v]) => (
          <div key={k} className="crm-month glass edge">
            <small>{new Date(k + "-01").toLocaleDateString("he-IL", { month: "long", year: "numeric" })}</small>
            <b className="num">{ils(v.commission)}</b>
            <span>עמלות מ-{v.n} מכירות ({ils(v.amount)})</span>
            {v.open > 0 && <em>{ils(v.open)} עוד לא שולמו</em>}
          </div>
        ))}
      </div>
      <div className="crm-h3row" style={{ margin: "18px 0 10px" }}>
        <h3>כל המכירות</h3>
        <button className="btn btn-glass btn-sm" onClick={() => setAdd(!add)}>{add ? "ביטול" : "+ דיווח מכירה ללקוח חדש"}</button>
      </div>
      {add && <div className="glass edge" style={{ padding: 16, marginBottom: 14, borderRadius: 16 }}><SaleForm onDone={async () => { setAdd(false); await reload(); }} flash={flash} /></div>}
      <div className="adm-table glass edge">
        <table>
          <thead><tr><th>תאריך</th><th>לקוח</th><th>מי מכר</th><th>מה נמכר</th><th>סכום</th><th>עמלה</th><th>שולמה</th><th>דווח ע״י</th></tr></thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id}>
                <td className="num">{new Date(s.sold_at).toLocaleDateString("he-IL")}</td>
                <td>{s.customer_name}{s.customer_phone && <small className="muted" dir="ltr"> {s.customer_phone}</small>}</td>
                <td>{PARTNERS[s.partner] ?? s.partner}</td>
                <td>{s.product}</td>
                <td className="num">{ils(Number(s.amount_net))}</td>
                <td className="num">{ils(Number(s.commission_amount))} <small className="muted">({Number(s.commission_pct)}%)</small></td>
                <td><button className={`pill ${s.commission_paid ? "gold" : "cherry"}`} onClick={() => togglePaid(s)}>{s.commission_paid ? "שולמה" : "לא שולמה"}</button></td>
                <td className="muted">{adminName(s.admin_id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Nir's call script for the 15-minute explanation call (23.11): six parts, in this order. */
const SCRIPT: [string, string][] = [
  ["הסבר בלייב", "פותחים איתו את המערכת: שאלה אמיתית מהעסק שלו, רנטגן, תיק עסקי, תסריט מכירה. שיראה תוצר על העסק שלו."],
  ["מכירה", "\"כדי שזה ימשיך לעבוד בשבילך אחרי 30 הימים\": מסלול מתאים, קישור לסליקה עצמית או סגירה בטלפון."],
  ["פגישה", "מי שצריך עומק: פגישת אסטרטגיה. ניר 2,500 ₪, נדב/תומר 279 ₪, כלולה ב-Private. הרצליה או צפון."],
  ["כנס", "הזמנה לכנס הקרוב של ניר."],
  ["פולואו-אפ", "לא סגר? \"לחזור אליו\" עם מועד וסיבה."],
  ["חבר מביא חבר", "\"מי עוד בעל עסק שצריך את זה?\" שם וטלפון, ומקבל 30 יום ייעוץ במתנה."],
];
function CallScript() {
  return (
    <details className="crm-script">
      <summary>תסריט שיחה · רבע שעה · 6 שלבים</summary>
      <ol>{SCRIPT.map(([t, d]) => <li key={t}><b>{t}</b> {d}</li>)}</ol>
    </details>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Brand } from "../BrandBar";
import Icon from "../Icon";
import AiCore from "../AiCore";
import Spotlight from "../Spotlight";
import { PLANS, planById, priceOf, RENEWAL_MONTHLY, type Billing, type Tier } from "@/lib/plans";
import { CHANNEL_LABEL, METHOD_LABEL, PAY_METHODS, PAY_STATUSES, STATUS_LABEL, VAT_RATE, round2, type Payment, type PaymentsData, type PayStatus, type RepRequest } from "@/lib/payments";
import { C_REP, C_SELF, ChannelDonut, Funnel, HBars, StackedBars, nis, type Bucket } from "./RevenueCharts";

type PeriodKey = "today" | "7d" | "30d" | "month" | "lastMonth" | "quarter" | "year" | "custom";
const PERIODS: [PeriodKey, string][] = [["today", "היום"], ["7d", "7 ימים"], ["30d", "30 יום"], ["month", "החודש"], ["lastMonth", "חודש שעבר"], ["quarter", "רבעון"], ["year", "שנה"], ["custom", "טווח"]];
type Gran = "day" | "week" | "month";
type SortKey = "date" | "amount" | "name" | "status";

const DAY = 86400_000;
const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dshort = (s: string | null) => (s ? new Date(s).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "");
const dlong = (d: Date) => d.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });

function rangeOf(k: PeriodKey, from: string, to: string): { start: Date; end: Date } {
  const now = new Date();
  const today = sod(now);
  const tomorrow = new Date(today.getTime() + DAY);
  switch (k) {
    case "today": return { start: today, end: tomorrow };
    case "7d": return { start: new Date(today.getTime() - 6 * DAY), end: tomorrow };
    case "30d": return { start: new Date(today.getTime() - 29 * DAY), end: tomorrow };
    case "month": return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: tomorrow };
    case "lastMonth": return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 1) };
    case "quarter": return { start: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1), end: tomorrow };
    case "year": return { start: new Date(now.getFullYear(), 0, 1), end: tomorrow };
    case "custom": {
      const s = from ? new Date(`${from}T00:00:00`) : new Date(today.getTime() - 29 * DAY);
      const e = to ? new Date(new Date(`${to}T00:00:00`).getTime() + DAY) : tomorrow;
      return e > s ? { start: s, end: e } : { start: e, end: s };
    }
  }
}

const STATUS_TONE: Record<PayStatus, string> = { paid: "ok", pending: "warn", failed: "cherry", refunded: "muted", cancelled: "muted" };

type Draft = {
  orderId: string | null; userId: string | null; userQuery: string; name: string; phone: string; email: string;
  tier: Tier; installments: number; amount: string; includesVat: boolean; channel: "rep" | "self"; repName: string;
  status: PayStatus; paidAt: string; method: string; ref: string; notes: string; activate: boolean;
};

export default function PaymentsDashboard({ adminName, preview }: { adminName: string; preview?: PaymentsData }) {
  const [data, setData] = useState<PaymentsData>(preview ?? { payments: [], users: [], requests: [], repLeads: [] });
  const [loading, setLoading] = useState(!preview);
  const [failed, setFailed] = useState(false);
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [channelF, setChannelF] = useState<"all" | "self" | "rep">("all");
  const [planF, setPlanF] = useState<"all" | Tier>("all");
  const [repF, setRepF] = useState("all");
  const [withVat, setWithVat] = useState(false);
  const [gran, setGran] = useState<Gran | "auto">("auto");
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState<"all" | PayStatus>("all");
  const [allTime, setAllTime] = useState(false);
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "date", dir: -1 });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [refund, setRefund] = useState<{ p: Payment; amount: string; date: string; note: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    if (preview) return setLoading(false);
    const r = await fetch("/api/backoffice/payments", { cache: "no-store" }).catch(() => null);
    if (r?.status === 401) return void (window.location.href = "/admin/login");
    if (!r?.ok) {
      setFailed(true);
      setLoading(false);
      return;
    }
    const j = await r.json();
    setData({ payments: j.payments, users: j.users, requests: j.requests, repLeads: j.repLeads });
    setFailed(false);
    setLoading(false);
  }, [preview]);
  useEffect(() => {
    load();
  }, [load]);

  function flash(t: string) {
    setToast(t);
    setTimeout(() => setToast(""), 2800);
  }
  async function logout() {
    await fetch("/api/backoffice/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  const range = useMemo(() => rangeOf(period, from, to), [period, from, to]);
  const prevRange = useMemo(() => {
    const len = range.end.getTime() - range.start.getTime();
    return { start: new Date(range.start.getTime() - len), end: range.start };
  }, [range]);
  const inR = (iso: string | null, r = range) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= r.start.getTime() && t < r.end.getTime();
  };

  const reps = useMemo(() => Array.from(new Set(data.payments.map((p) => p.repName).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "he")), [data.payments]);

  /** Filters shared by every view (channel / plan / rep). Period is applied per metric. */
  const scoped = useMemo(
    () => data.payments.filter((p) => (channelF === "all" || p.channel === channelF) && (planF === "all" || p.tier === planF) && (repF === "all" || p.repName === repF)),
    [data.payments, channelF, planF, repF]
  );

  const amt = useCallback((p: Payment) => (withVat ? p.total : p.net), [withVat]);
  const refundOf = useCallback((p: Payment) => {
    if (!p.refundAmount) return 0;
    return withVat ? p.refundAmount : p.total ? round2((p.refundAmount * p.net) / p.total) : 0;
  }, [withVat]);

  const kpi = useMemo(() => {
    const calc = (r: { start: Date; end: Date }) => {
      const got = scoped.filter((p) => (p.status === "paid" || p.status === "refunded") && inR(p.paidAt, r));
      const gross = got.reduce((a, p) => a + amt(p), 0);
      const refunds = scoped.filter((p) => p.refundAmount && inR(p.refundedAt, r)).reduce((a, p) => a + refundOf(p), 0);
      const paid = got.filter((p) => p.status === "paid");
      const self = got.filter((p) => p.channel === "self").reduce((a, p) => a + amt(p), 0);
      const rep = gross - self;
      return { gross, refunds, collected: gross - refunds, deals: paid.length, avg: paid.length ? paid.reduce((a, p) => a + amt(p), 0) / paid.length : 0, self, rep, refundsCount: scoped.filter((p) => p.refundAmount && inR(p.refundedAt, r)).length };
    };
    const cur = calc(range);
    const prev = calc(prevRange);
    const pendingRows = scoped.filter((p) => p.status === "pending");
    const pending = pendingRows.reduce((a, p) => a + amt(p), 0);
    // active members and estimated recurring revenue (annual price / 12 during the first year, then the monthly renewal)
    const now = Date.now();
    const active = data.users.filter((u) => u.plan === "paid" && new Date(u.accessUntil).getTime() > now && (planF === "all" || u.tier === planF));
    const mrr = active.reduce((a, u) => {
      const inYear = u.yearEndsAt ? new Date(u.yearEndsAt).getTime() > now : true;
      if (!inYear) return a + (withVat ? RENEWAL_MONTHLY * (1 + VAT_RATE) : RENEWAL_MONTHLY);
      const p = priceOf(((u.tier as Tier) || "basic"), ((u.billing as Billing) || "onetime"));
      return a + (withVat ? p.total : p.net) / 12;
    }, 0);
    return { ...cur, prev, pending, pendingCount: pendingRows.length, active: active.length, mrr, arr: mrr * 12 };
  }, [scoped, range, prevRange, amt, refundOf, data.users, planF, withVat]); // eslint-disable-line react-hooks/exhaustive-deps

  const spanDays = Math.round((range.end.getTime() - range.start.getTime()) / DAY);
  const g: Gran = gran === "auto" ? (spanDays <= 45 ? "day" : spanDays <= 200 ? "week" : "month") : gran;

  const series: Bucket[] = useMemo(() => {
    const out: Bucket[] = [];
    const idx = new Map<string, number>();
    const keyOf = (d: Date) => {
      if (g === "day") return ymd(d);
      if (g === "month") return `${d.getFullYear()}-${d.getMonth()}`;
      const s = sod(d);
      const wk = new Date(s.getTime() - s.getDay() * DAY); // week starts on Sunday
      return ymd(wk);
    };
    let cur = sod(range.start);
    if (g === "week") cur = new Date(cur.getTime() - cur.getDay() * DAY);
    if (g === "month") cur = new Date(cur.getFullYear(), cur.getMonth(), 1);
    let guard = 0;
    while (cur < range.end && guard++ < 400) {
      const k = keyOf(cur);
      const label = g === "month" ? cur.toLocaleDateString("he-IL", { month: "short" }) : `${cur.getDate()}.${cur.getMonth() + 1}`;
      const long = g === "day" ? dlong(cur) : g === "week" ? `שבוע מ-${dlong(cur)}` : cur.toLocaleDateString("he-IL", { month: "long", year: "numeric" });
      idx.set(k, out.length);
      out.push({ key: k, label, long, self: 0, rep: 0, deals: 0 });
      cur = g === "day" ? new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1) : g === "week" ? new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 7) : new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    for (const p of scoped) {
      if (!(p.status === "paid" || p.status === "refunded") || !inR(p.paidAt)) continue;
      const i = idx.get(keyOf(new Date(p.paidAt as string)));
      if (i == null) continue;
      out[i][p.channel] += amt(p);
      out[i].deals++;
    }
    return out;
  }, [scoped, range, g, amt]); // eslint-disable-line react-hooks/exhaustive-deps

  const byPlan = useMemo(
    () =>
      PLANS.map((pl) => {
        const rows = scoped.filter((p) => p.tier === pl.id && (p.status === "paid" || p.status === "refunded") && inR(p.paidAt));
        return { key: pl.id, label: pl.name, value: rows.reduce((a, p) => a + amt(p), 0), sub: `${rows.length} עסקאות` };
      }),
    [scoped, range, amt] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const leaderboard = useMemo(() => {
    const m = new Map<string, { value: number; deals: number }>();
    for (const p of scoped) {
      if (p.channel !== "rep" || p.status !== "paid" || !inR(p.paidAt)) continue;
      const k = p.repName || "ללא שם נציג";
      const cur = m.get(k) ?? { value: 0, deals: 0 };
      cur.value += amt(p);
      cur.deals++;
      m.set(k, cur);
    }
    return Array.from(m.entries()).sort((a, b) => b[1].value - a[1].value).map(([k, v]) => ({ key: k, label: k, value: v.value, sub: `${v.deals} עסקאות · ממוצע ${nis(v.value / v.deals)}` }));
  }, [scoped, range, amt]); // eslint-disable-line react-hooks/exhaustive-deps

  const funnel = useMemo(() => {
    const registered = data.users.filter((u) => inR(u.createdAt)).length;
    const started = new Set(data.payments.filter((p) => p.source === "checkout" && inR(p.createdAt)).map((p) => p.userId ?? p.id)).size;
    const asked = new Set(data.repLeads.filter((l) => inR(l.createdAt)).map((l) => l.userId ?? l.createdAt)).size;
    const paid = new Set(data.payments.filter((p) => p.status === "paid" && inR(p.paidAt)).map((p) => p.userId ?? p.id)).size;
    return [
      { label: "נרשמו לפלטפורמה", value: registered, hint: "משתמשים חדשים בתקופה" },
      { label: "התחילו רכישה", value: started, hint: "לחצו על מסלול ופתחו הזמנה" },
      { label: "ביקשו נציג", value: asked, hint: "\"שנציג יחזור אליי\" או בקשת חידוש" },
      { label: "שילמו", value: paid, hint: "עסקאות ששולמו בתקופה" },
    ];
  }, [data, range]); // eslint-disable-line react-hooks/exhaustive-deps

  const table = useMemo(() => {
    const s = q.trim().toLowerCase();
    const rows = scoped
      .filter((p) => allTime || inR(p.paidAt ?? p.createdAt))
      .filter((p) => statusF === "all" || p.status === statusF)
      .filter((p) => !s || [p.name, p.phone ?? "", p.email ?? "", p.ref ?? "", p.repName ?? "", p.notes ?? "", planById(p.tier)?.name ?? ""].some((x) => x.toLowerCase().includes(s)));
    const val = (p: Payment) => (sort.k === "date" ? p.paidAt ?? p.createdAt : sort.k === "amount" ? amt(p) : sort.k === "name" ? p.name : PAY_STATUSES.indexOf(p.status));
    return rows.sort((a, b) => {
      const x = val(a), y = val(b);
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "he")) * sort.dir;
    });
  }, [scoped, q, statusF, allTime, sort, range, amt]); // eslint-disable-line react-hooks/exhaustive-deps

  const delta = (a: number, b: number) => {
    if (!b) return a ? { t: "חדש בתקופה", up: true } : null;
    const d = Math.round(((a - b) / b) * 1000) / 10;
    return { t: `${d > 0 ? "+" : ""}${d.toLocaleString("he-IL")}% מול התקופה הקודמת`, up: d >= 0 };
  };

  // ---------- writes ----------
  const blank = (): Draft => ({ orderId: null, userId: null, userQuery: "", name: "", phone: "", email: "", tier: "basic", installments: 1, amount: String(priceOf("basic", "onetime").net), includesVat: false, channel: "rep", repName: adminName, status: "paid", paidAt: ymd(new Date()), method: "credit", ref: "", notes: "", activate: false });
  function openNew() {
    setFormErr("");
    setDraft(blank());
  }
  function openFromRequest(r: RepRequest) {
    setFormErr("");
    const tier = (r.tier as Tier) || "basic";
    const billing = (r.billing as Billing) || "onetime";
    setDraft({ ...blank(), orderId: r.orderId, userId: r.userId, userQuery: r.name, name: r.name, phone: r.phone ?? "", email: r.email ?? "", tier, installments: billing === "installments" ? 12 : 1, amount: String(r.net ?? priceOf(tier, billing).net), activate: !!r.userId, notes: r.note ?? "" });
  }
  function setTierOrBilling(d: Draft, tier: Tier, installments: number): Draft {
    return { ...d, tier, installments, amount: String(priceOf(tier, installments > 1 ? "installments" : "onetime").net), includesVat: false };
  }
  const draftNet = draft ? (Number(draft.amount) || 0) / (draft.includesVat ? 1 + VAT_RATE : 1) : 0;
  const userMatches = useMemo(() => {
    if (!draft || draft.userId) return [];
    const s = draft.userQuery.trim().toLowerCase();
    if (s.length < 2) return [];
    return data.users.filter((u) => [u.name, u.email, u.phone].some((x) => (x ?? "").toLowerCase().includes(s))).slice(0, 6);
  }, [draft, data.users]);

  async function save() {
    if (!draft) return;
    setFormErr("");
    if (draft.name.trim().length < 2) return setFormErr("צריך שם לקוח");
    if (!(Number(draft.amount) > 0)) return setFormErr("צריך סכום");
    if (preview) {
      setDraft(null);
      return flash("תצוגה מקדימה: לא נשמר");
    }
    setBusy(true);
    const r = await fetch("/api/backoffice/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: draft.orderId, userId: draft.userId, name: draft.name, phone: draft.phone, email: draft.email, tier: draft.tier, installments: draft.installments, amount: draft.amount, amountIncludesVat: draft.includesVat, channel: draft.channel, repName: draft.repName, status: draft.status, paidAt: draft.paidAt ? `${draft.paidAt}T12:00:00` : null, method: draft.method, ref: draft.ref, notes: draft.notes, activate: draft.activate }),
    }).catch(() => null);
    setBusy(false);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (r?.status === 401) return void (window.location.href = "/admin/login");
    if (!r?.ok) return setFormErr(j.error ?? "השמירה נכשלה. נסה שוב.");
    setDraft(null);
    flash(j.activated && !j.activated.error ? `נשמר, והמסלול נפתח ל${draft.name}` : j.activated?.error ? "התשלום נשמר, אבל פתיחת המסלול נכשלה. אפשר לפתוח מרשימת המשתמשים." : "התשלום נשמר");
    load();
  }
  async function patch(body: Record<string, unknown>, ok: string) {
    if (preview) return flash("תצוגה מקדימה: לא נשמר");
    setBusy(true);
    const r = await fetch("/api/backoffice/payments", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    setBusy(false);
    if (r?.status === 401) return void (window.location.href = "/admin/login");
    if (!r?.ok) {
      const j = r ? await r.json().catch(() => ({})) : {};
      return flash(j.error ?? "הפעולה נכשלה");
    }
    flash(ok);
    load();
  }

  function exportCsv() {
    const head = ["תאריך תשלום", "תאריך יצירה", "לקוח", "טלפון", "מייל", "מסלול", "ערוץ", "נציג", "סטטוס", "לפני מע״מ", "מע״מ", "כולל מע״מ", "תשלומים", "אמצעי תשלום", "אסמכתא", "החזר", "תאריך החזר", "הערות", "מזהה"];
    const cell = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = table.map((p) => [dshort(p.paidAt), dshort(p.createdAt), p.name, p.phone ?? "", p.email ?? "", planById(p.tier)?.name ?? p.tier, CHANNEL_LABEL[p.channel], p.repName ?? "", STATUS_LABEL[p.status], p.net.toFixed(2), p.vat.toFixed(2), p.total.toFixed(2), p.installments, p.method ? METHOD_LABEL[p.method] : "", p.ref ?? "", p.refundAmount?.toFixed(2) ?? "", dshort(p.refundedAt), (p.notes ?? "").replace(/\s+/g, " "), p.id].map(cell).join(","));
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `תשלומים-${ymd(range.start)}-${ymd(new Date(range.end.getTime() - DAY))}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  const vatTag = withVat ? "כולל מע״מ" : "לפני מע״מ";
  const noRevenue = kpi.gross === 0;
  const periodLabel = `${dlong(range.start)} עד ${dlong(new Date(range.end.getTime() - DAY))}`;
  const split = kpi.self + kpi.rep;
  const sortBtn = (k: SortKey, label: string) => (
    <button className={`rv-sort ${sort.k === k ? "on" : ""}`} onClick={() => setSort((s) => ({ k, dir: s.k === k ? (s.dir === 1 ? -1 : 1) : k === "name" ? 1 : -1 }))} aria-label={`מיון לפי ${label}`}>
      {label} {sort.k === k && <span aria-hidden="true">{sort.dir === -1 ? "↓" : "↑"}</span>}
    </button>
  );

  return (
    <>
      <Spotlight />
      <div className="adm rv">
        <header className="adm-top">
          <Brand sub={false} size={30} href="/admin" />
          <span className="badge">דשבורד הכנסות</span>
          <nav className="rv-nav" aria-label="ניווט בניהול">
            <a href="/admin">ניהול מנויים</a>
            <a href="/admin/payments" className="on" aria-current="page">הכנסות</a>
          </nav>
          <span style={{ flex: 1 }} />
          <span className="muted rv-hello">שלום, {adminName}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}><Icon name="logout" size={16} /> יציאה</button>
        </header>

        <section className="rv-hero glass edge">
          <div className="rv-hero-copy">
            <span className="eyebrow">הכסף של הפלטפורמה, במקום אחד</span>
            <h1 className="rv-title">דשבורד <span className="gold">הכנסות</span></h1>
            <p className="muted rv-period-l">{periodLabel} · סכומים {vatTag}</p>
          </div>
          <div className="rv-hero-act">
            <div className="rv-seg" role="group" aria-label="תצוגת מע״מ">
              <button className={!withVat ? "on" : ""} onClick={() => setWithVat(false)}>לפני מע״מ</button>
              <button className={withVat ? "on" : ""} onClick={() => setWithVat(true)}>כולל מע״מ</button>
            </div>
            <button className="btn btn-primary btn-sm" onClick={openNew}><Icon name="plus" size={16} /> תשלום חדש</button>
          </div>
        </section>

        <section className="rv-filters" aria-label="סינון">
          <div className="rv-chips" role="tablist" aria-label="תקופה">
            {PERIODS.map(([k, l]) => (
              <button key={k} role="tab" aria-selected={period === k} className={period === k ? "on" : ""} onClick={() => setPeriod(k)}>{l}</button>
            ))}
          </div>
          {period === "custom" && (
            <div className="rv-range">
              <label>מ-<input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
              <label>עד<input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></label>
            </div>
          )}
          <div className="rv-selects">
            <select className="input adm-filter" value={channelF} onChange={(e) => setChannelF(e.target.value as "all" | "self" | "rep")} aria-label="ערוץ">
              <option value="all">כל הערוצים</option>
              <option value="self">סליקה עצמית</option>
              <option value="rep">דרך נציג</option>
            </select>
            <select className="input adm-filter" value={planF} onChange={(e) => setPlanF(e.target.value as "all" | Tier)} aria-label="מסלול">
              <option value="all">כל המסלולים</option>
              {PLANS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="input adm-filter" value={repF} onChange={(e) => setRepF(e.target.value)} aria-label="נציג">
              <option value="all">כל הנציגים</option>
              {reps.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button className="btn btn-glass btn-sm" onClick={() => { setLoading(true); load(); }}>רענון</button>
          </div>
        </section>

        {failed && <div className="adm-empty glass edge">לא הצלחנו לטעון את הנתונים. <button className="link-btn" onClick={() => { setLoading(true); load(); }}>לנסות שוב</button></div>}

        <section className={`rv-kpis ${loading ? "is-loading" : ""}`} aria-busy={loading}>
          <article className="rv-kpi rv-kpi-hero glass edge">
            <span className="rv-k-l">נגבה בתקופה</span>
            <b className="rv-k-v num">{nis(kpi.collected)}</b>
            {delta(kpi.collected, kpi.prev.collected) ? <span className={`rv-delta ${delta(kpi.collected, kpi.prev.collected)!.up ? "up" : "down"}`}>{delta(kpi.collected, kpi.prev.collected)!.t}</span> : <span className="rv-k-s">אין עדיין נתונים להשוואה</span>}
            <div className="rv-split" aria-label="חלוקה לפי ערוץ">
              <span className="rv-split-bar">
                {split > 0 ? (
                  <>
                    <i style={{ width: `${(kpi.self / split) * 100}%`, background: C_SELF }} />
                    <i style={{ width: `${(kpi.rep / split) * 100}%`, background: C_REP }} />
                  </>
                ) : <i className="ghost" style={{ width: "100%" }} />}
              </span>
              <span className="rv-split-legend">
                <span><i style={{ background: C_SELF }} /> סליקה עצמית <b className="num">{nis(kpi.self)}</b> <small className="num">{split ? Math.round((kpi.self / split) * 100) : 0}%</small></span>
                <span><i style={{ background: C_REP }} /> דרך נציג <b className="num">{nis(kpi.rep)}</b> <small className="num">{split ? Math.round((kpi.rep / split) * 100) : 0}%</small></span>
              </span>
            </div>
          </article>
          <Kpi label="עסקאות ששולמו" value={kpi.deals.toLocaleString("he-IL")} sub={delta(kpi.deals, kpi.prev.deals)?.t ?? "בתקופה הנבחרת"} />
          <Kpi label="עסקה ממוצעת" value={nis(kpi.avg)} sub={vatTag} />
          <Kpi label="ממתין לתשלום" value={nis(kpi.pending)} sub={`${kpi.pendingCount} הזמנות פתוחות`} tone={kpi.pendingCount ? "warn" : ""} />
          <Kpi label="החזרים" value={nis(kpi.refunds)} sub={`${kpi.refundsCount} בתקופה`} tone={kpi.refunds ? "cherry" : ""} />
          <Kpi label="מנויים פעילים" value={kpi.active.toLocaleString("he-IL")} sub="מנוי שנתי בתוקף" tone="gold" />
          <Kpi label="MRR משוער" value={nis(kpi.mrr)} sub={`ARR משוער ${nis(kpi.arr)}`} />
        </section>

        <section className="rv-grid">
          <article className="rv-card rv-span2 glass edge">
            <header className="rv-card-h">
              <div>
                <h2>הכנסות לאורך זמן</h2>
                <p className="muted">לפי תאריך התשלום · {vatTag}</p>
              </div>
              <div className="rv-seg rv-seg-sm" role="group" aria-label="רזולוציה">
                {([["auto", "אוטומטי"], ["day", "יומי"], ["week", "שבועי"], ["month", "חודשי"]] as [Gran | "auto", string][]).map(([k, l]) => (
                  <button key={k} className={gran === k ? "on" : ""} onClick={() => setGran(k)}>{l}</button>
                ))}
              </div>
            </header>
            <div className="rv-legend"><span><i style={{ background: C_SELF }} /> סליקה עצמית</span><span><i style={{ background: C_REP }} /> דרך נציג</span></div>
            <StackedBars data={series} empty={noRevenue} />
            {noRevenue && !loading && <EmptyHint onAdd={openNew} />}
          </article>

          <article className="rv-card glass edge">
            <header className="rv-card-h"><div><h2>ערוץ מכירה</h2><p className="muted">סליקה עצמית מול נציג</p></div></header>
            <div className="rv-donut">
              <ChannelDonut self={kpi.self} rep={kpi.rep} />
              <ul className="rv-donut-legend">
                <li><i style={{ background: C_SELF }} /><span>סליקה עצמית</span><b className="num">{nis(kpi.self)}</b><small className="num">{split ? Math.round((kpi.self / split) * 100) : 0}%</small></li>
                <li><i style={{ background: C_REP }} /><span>דרך נציג</span><b className="num">{nis(kpi.rep)}</b><small className="num">{split ? Math.round((kpi.rep / split) * 100) : 0}%</small></li>
              </ul>
            </div>
            <p className="rv-foot muted">סליקה עצמית תתחבר ל-Cardcom. עד אז כל תשלום שנרשם כאן ידנית נספר בערוץ שבחרת.</p>
          </article>

          <article className="rv-card glass edge">
            <header className="rv-card-h"><div><h2>הכנסות לפי מסלול</h2><p className="muted">{vatTag}</p></div></header>
            <HBars rows={byPlan} empty="ברגע שתירשם עסקה ראשונה, נראה כאן איזה מסלול מוביל." />
          </article>

          <article className="rv-card glass edge">
            <header className="rv-card-h"><div><h2>טבלת הנציגים</h2><p className="muted">מי סגר כמה בתקופה</p></div></header>
            {leaderboard.length ? (
              <ol className="rv-lead">
                {leaderboard.map((r, i) => (
                  <li key={r.key}>
                    <span className={`rv-rank ${i === 0 ? "first" : ""}`}>{i + 1}</span>
                    <span className="rv-lead-n"><b>{r.label}</b><small className="muted">{r.sub}</small></span>
                    <b className="num">{nis(r.value)}</b>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="rv-empty-mini"><Icon name="crown" size={22} /><p>עוד אין עסקאות של נציגים בתקופה. כל תשלום שנרשם "דרך נציג" נכנס לטבלה עם שם הנציג.</p></div>
            )}
          </article>

          <article className="rv-card glass edge">
            <header className="rv-card-h"><div><h2>המשפך</h2><p className="muted">מהרשמה ועד תשלום, בתקופה</p></div></header>
            <Funnel steps={funnel} />
          </article>
        </section>

        <section className="rv-card glass edge rv-requests">
          <header className="rv-card-h">
            <div><h2>בקשות פתוחות לנציג <small className="rv-count num">{data.requests.length}</small></h2><p className="muted">ביקשו נציג או התחילו רכישה, ועוד לא שילמו</p></div>
          </header>
          {data.requests.length === 0 ? (
            <div className="rv-empty-mini"><Icon name="check" size={22} /><p>אין בקשות פתוחות. כל מי שביקש נציג טופל.</p></div>
          ) : (
            <ul className="rv-req-list">
              {data.requests.map((r) => (
                <li key={r.key} className="rv-req">
                  <div className="rv-req-who">
                    <b>{r.name}</b>
                    <span className="adm-contact">
                      {r.phone && <a href={`tel:${r.phone}`} dir="ltr">{r.phone}</a>}
                      {r.phone && <a href={`https://wa.me/972${r.phone.replace(/^0/, "")}`} target="_blank" rel="noreferrer">וואטסאפ</a>}
                      {r.email && <a href={`mailto:${r.email}`} dir="ltr">{r.email}</a>}
                    </span>
                  </div>
                  <div className="rv-req-meta">
                    <span className={`pill ${r.via === "rep" ? "cherry" : r.via === "renewal" ? "" : "warn"}`}>{r.via === "rep" ? "ביקש נציג" : r.via === "renewal" ? "בקשת חידוש" : "התחיל רכישה"}</span>
                    {r.tier && <span>{planById(r.tier)?.name}{r.billing ? ` · ${r.billing === "installments" ? "12 תשלומים" : "תשלום אחד"}` : ""}</span>}
                    {r.net != null && <b className="num">{nis(withVat ? r.total ?? 0 : r.net)}</b>}
                    <span className="muted">{dshort(r.createdAt)} · לפני {Math.max(0, Math.floor((Date.now() - new Date(r.createdAt).getTime()) / DAY))} ימים</span>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => openFromRequest(r)}><Icon name="check" size={16} /> סימון כשולם</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rv-card glass edge rv-table-card">
          <header className="rv-card-h rv-table-h">
            <div><h2>כל התשלומים <small className="rv-count num">{table.length}</small></h2><p className="muted">{allTime ? "כל התקופות" : periodLabel}</p></div>
            <div className="rv-table-tools">
              <div className="adm-search"><Icon name="search" size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש לפי שם, טלפון, אסמכתא או נציג" /></div>
              <select className="input adm-filter" value={statusF} onChange={(e) => setStatusF(e.target.value as "all" | PayStatus)} aria-label="סטטוס">
                <option value="all">כל הסטטוסים</option>
                {PAY_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
              <label className="check rv-alltime"><input type="checkbox" checked={allTime} onChange={(e) => setAllTime(e.target.checked)} /><span>כל התקופות</span></label>
              <button className="btn btn-glass btn-sm" onClick={exportCsv} disabled={!table.length}><Icon name="download" size={16} /> ייצוא CSV</button>
            </div>
          </header>
          {table.length === 0 ? (
            <div className="rv-empty">
              <AiCore size={56} />
              <b>{data.payments.length ? "אין תשלומים שמתאימים לסינון" : "עוד לא נרשמו תשלומים"}</b>
              <p className="muted">{data.payments.length ? "נסה תקופה רחבה יותר, או סמן \"כל התקופות\"." : "תשלומי סליקה עצמית ייכנסו לכאן אוטומטית אחרי חיבור Cardcom. עסקאות שנסגרו דרך נציג מוסיפים בכפתור \"תשלום חדש\"."}</p>
              {!data.payments.length && <button className="btn btn-primary btn-sm" onClick={openNew}><Icon name="plus" size={16} /> תשלום חדש</button>}
            </div>
          ) : (
            <div className="adm-table rv-table">
              <table>
                <thead>
                  <tr>
                    <th>{sortBtn("date", "תאריך")}</th>
                    <th>{sortBtn("name", "לקוח")}</th>
                    <th>מסלול</th>
                    <th>ערוץ</th>
                    <th className="rv-num">{sortBtn("amount", "סכום")}</th>
                    <th>תשלומים</th>
                    <th>{sortBtn("status", "סטטוס")}</th>
                    <th>אסמכתא</th>
                    <th><span className="sr-only">פעולות</span></th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((p) => (
                    <tr key={p.id}>
                      <td className="num">{dshort(p.paidAt ?? p.createdAt)}{!p.paidAt && <small className="muted rv-sub">נוצר</small>}</td>
                      <td>
                        <b className="rv-cust">{p.name}</b>
                        <small className="muted rv-sub" dir="ltr">{p.phone ?? p.email ?? ""}</small>
                      </td>
                      <td>{planById(p.tier)?.name ?? p.tier}{p.kind === "monthly69" && <small className="muted rv-sub">חידוש חודשי</small>}</td>
                      <td>
                        <span className="rv-ch"><i style={{ background: p.channel === "self" ? C_SELF : C_REP }} />{CHANNEL_LABEL[p.channel]}</span>
                        {p.repName && <small className="muted rv-sub">{p.repName}</small>}
                      </td>
                      <td className="rv-num num">
                        <b>{nis(amt(p), 2)}</b>
                        <small className="muted rv-sub">{withVat ? `${nis(p.net, 2)} לפני מע״מ` : `${nis(p.total, 2)} כולל מע״מ`}</small>
                        {p.refundAmount ? <small className="rv-sub rv-refund">החזר {nis(p.refundAmount, 2)}</small> : null}
                      </td>
                      <td className="num">{p.installments > 1 ? `${p.installments} תשלומים` : "תשלום אחד"}{p.method && <small className="muted rv-sub">{METHOD_LABEL[p.method]}</small>}</td>
                      <td><span className={`pill ${STATUS_TONE[p.status]}`}>{STATUS_LABEL[p.status]}</span></td>
                      <td className="muted" dir="ltr">{p.ref ?? ""}</td>
                      <td className="rv-acts">
                        <select className="input rv-status-sel" value={p.status} disabled={busy} aria-label={`שינוי סטטוס לתשלום של ${p.name}`} onChange={(e) => patch({ id: p.id, action: "status", status: e.target.value }, "הסטטוס עודכן")}>
                          {PAY_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                        </select>
                        {(p.status === "paid" || p.status === "refunded") && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setRefund({ p, amount: String(p.total), date: ymd(new Date()), note: "" })}>החזר</button>}
                        <button className="btn btn-ghost btn-sm" disabled={busy} aria-label="הערה" onClick={() => { const n = prompt("הערה לתשלום", p.notes ?? ""); if (n !== null) patch({ id: p.id, action: "edit", notes: n }, "ההערה נשמרה"); }}><Icon name="edit" size={15} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {draft && (
          <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="pay-title" onClick={(e) => e.target === e.currentTarget && !busy && setDraft(null)}>
            <div className="modal rv-modal">
              <button className="icon-btn rv-x" onClick={() => setDraft(null)} aria-label="סגירה"><Icon name="close" size={18} /></button>
              <h3 id="pay-title">{draft.orderId ? "סגירת בקשה כשולמה" : "תשלום חדש"}</h3>
              <p className="sub">{draft.orderId ? "ההזמנה הפתוחה תתעדכן לפרטים שכאן." : "עסקה שנסגרה דרך נציג, או תשלום שצריך לרשום ידנית."}</p>
              <form onSubmit={(e) => { e.preventDefault(); save(); }} className="rv-form">
                <div className="field rv-full rv-user">
                  <label htmlFor="pf-user">משתמש בפלטפורמה (לא חובה)</label>
                  {draft.userId ? (
                    <div className="rv-linked"><Icon name="user" size={16} /> {draft.name} <button type="button" className="link-btn" onClick={() => setDraft({ ...draft, userId: null, activate: false })}>ניתוק</button></div>
                  ) : (
                    <>
                      <input id="pf-user" className="input" value={draft.userQuery} onChange={(e) => setDraft({ ...draft, userQuery: e.target.value })} placeholder="חיפוש לפי שם, טלפון או מייל" autoComplete="off" />
                      {userMatches.length > 0 && (
                        <ul className="rv-suggest" role="listbox">
                          {userMatches.map((u) => (
                            <li key={u.id}><button type="button" onClick={() => setDraft({ ...draft, userId: u.id, userQuery: u.name, name: u.name, phone: u.phone, email: u.email, activate: draft.status === "paid" })}><b>{u.name}</b><small dir="ltr">{u.phone} · {u.email}</small></button></li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
                <div className="field"><label htmlFor="pf-name">שם הלקוח</label><input id="pf-name" className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></div>
                <div className="field"><label htmlFor="pf-phone">טלפון</label><input id="pf-phone" className="input" dir="ltr" style={{ textAlign: "right" }} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></div>
                <div className="field rv-full"><label htmlFor="pf-email">מייל</label><input id="pf-email" className="input" dir="ltr" style={{ textAlign: "right" }} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></div>
                <div className="field"><label htmlFor="pf-tier">מסלול</label>
                  <select id="pf-tier" className="input" value={draft.tier} onChange={(e) => setDraft(setTierOrBilling(draft, e.target.value as Tier, draft.installments))}>
                    {PLANS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="field"><label htmlFor="pf-inst">מספר תשלומים</label>
                  <select id="pf-inst" className="input" value={draft.installments} onChange={(e) => setDraft(setTierOrBilling(draft, draft.tier, Number(e.target.value)))}>
                    {[1, 2, 3, 4, 5, 6, 10, 12, 18, 24, 36].map((n) => <option key={n} value={n}>{n === 1 ? "תשלום אחד" : `${n} תשלומים`}</option>)}
                  </select>
                </div>
                <div className="field"><label htmlFor="pf-amount">סכום (₪)</label>
                  <input id="pf-amount" className="input num" inputMode="decimal" dir="ltr" style={{ textAlign: "right" }} value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value.replace(/[^\d.]/g, "") })} />
                </div>
                <div className="field"><label>הסכום שהוקלד</label>
                  <div className="rv-seg rv-seg-form" role="group">
                    <button type="button" className={!draft.includesVat ? "on" : ""} onClick={() => setDraft({ ...draft, includesVat: false })}>לפני מע״מ</button>
                    <button type="button" className={draft.includesVat ? "on" : ""} onClick={() => setDraft({ ...draft, includesVat: true })}>כולל מע״מ</button>
                  </div>
                </div>
                <div className="rv-calc rv-full num">
                  <span>לפני מע״מ <b>{nis(draftNet, 2)}</b></span>
                  <span>מע״מ 18% <b>{nis(draftNet * VAT_RATE, 2)}</b></span>
                  <span>כולל מע״מ <b>{nis(draftNet * (1 + VAT_RATE), 2)}</b></span>
                  {draft.installments > 1 && <span>לתשלום <b>{nis((draftNet * (1 + VAT_RATE)) / draft.installments, 2)}</b></span>}
                </div>
                <div className="field"><label htmlFor="pf-ch">ערוץ</label>
                  <select id="pf-ch" className="input" value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value as "rep" | "self" })}>
                    <option value="rep">דרך נציג</option>
                    <option value="self">סליקה עצמית</option>
                  </select>
                </div>
                <div className="field"><label htmlFor="pf-rep">שם הנציג</label><input id="pf-rep" className="input" list="pf-reps" value={draft.repName} onChange={(e) => setDraft({ ...draft, repName: e.target.value })} /><datalist id="pf-reps">{reps.map((r) => <option key={r} value={r} />)}</datalist></div>
                <div className="field"><label htmlFor="pf-status">סטטוס</label>
                  <select id="pf-status" className="input" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as PayStatus, activate: e.target.value === "paid" ? draft.activate : false })}>
                    {PAY_STATUSES.filter((s) => s !== "refunded").map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </div>
                <div className="field"><label htmlFor="pf-date">תאריך תשלום</label><input id="pf-date" type="date" className="input" value={draft.paidAt} onChange={(e) => setDraft({ ...draft, paidAt: e.target.value })} disabled={draft.status !== "paid"} /></div>
                <div className="field"><label htmlFor="pf-method">אמצעי תשלום</label>
                  <select id="pf-method" className="input" value={draft.method} onChange={(e) => setDraft({ ...draft, method: e.target.value })}>
                    {PAY_METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
                  </select>
                </div>
                <div className="field"><label htmlFor="pf-ref">אסמכתא / מספר עסקה</label><input id="pf-ref" className="input" dir="ltr" style={{ textAlign: "right" }} value={draft.ref} onChange={(e) => setDraft({ ...draft, ref: e.target.value })} /></div>
                <div className="field rv-full"><label htmlFor="pf-notes">הערות</label><textarea id="pf-notes" className="input" rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
                {draft.userId && draft.status === "paid" && (
                  <label className="check rv-full rv-activate">
                    <input type="checkbox" checked={draft.activate} onChange={(e) => setDraft({ ...draft, activate: e.target.checked })} />
                    <span><b>לפתוח את המסלול למשתמש</b> · שנה מלאה, הקורסים נפתחים והודעת הצטרפות יוצאת לבד</span>
                  </label>
                )}
                {formErr && <span className="err rv-full">{formErr}</span>}
                <div className="rv-full rv-form-act">
                  <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "שומר…" : draft.orderId ? "סימון כשולם" : "שמירת התשלום"}</button>
                  <button className="btn btn-ghost" type="button" onClick={() => setDraft(null)} disabled={busy}>ביטול</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {refund && (
          <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="ref-title" onClick={(e) => e.target === e.currentTarget && !busy && setRefund(null)}>
            <div className="modal" style={{ maxWidth: 440 }}>
              <h3 id="ref-title">החזר כספי</h3>
              <p className="sub">{refund.p.name} · {planById(refund.p.tier)?.name} · שולם {nis(refund.p.total, 2)} כולל מע״מ</p>
              <form onSubmit={(e) => { e.preventDefault(); patch({ id: refund.p.id, action: "refund", amount: refund.amount, refundedAt: `${refund.date}T12:00:00`, note: refund.note }, "ההחזר נרשם").then(() => setRefund(null)); }}>
                <div className="field"><label htmlFor="rf-amt">סכום ההחזר כולל מע״מ (₪)</label><input id="rf-amt" className="input num" dir="ltr" style={{ textAlign: "right" }} inputMode="decimal" value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value.replace(/[^\d.]/g, "") })} /></div>
                <div className="field"><label htmlFor="rf-date">תאריך ההחזר</label><input id="rf-date" type="date" className="input" value={refund.date} onChange={(e) => setRefund({ ...refund, date: e.target.value })} /></div>
                <div className="field"><label htmlFor="rf-note">סיבה (לא חובה)</label><input id="rf-note" className="input" value={refund.note} onChange={(e) => setRefund({ ...refund, note: e.target.value })} /></div>
                <small className="muted">ההחזר נרשם בדשבורד בלבד. את ההחזר בפועל מבצעים בחברת הסליקה. הגישה של המשתמש לא נחסמת אוטומטית.</small>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-glass danger" type="submit" disabled={busy}>{busy ? "רגע…" : "רישום ההחזר"}</button>
                  <button className="btn btn-ghost" type="button" onClick={() => setRefund(null)}>ביטול</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {toast && <div className="saved-toast" role="status"><Icon name="check" size={16} /> {toast}</div>}
      </div>
    </>
  );
}

function Kpi({ label, value, sub, tone = "" }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <article className={`rv-kpi glass edge ${tone}`}>
      <span className="rv-k-l">{label}</span>
      <b className="rv-k-v num">{value}</b>
      <span className="rv-k-s">{sub}</span>
    </article>
  );
}

function EmptyHint({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rv-empty-over">
      <AiCore size={48} />
      <div>
        <b>הגרף יתעורר עם התשלום הראשון</b>
        <p className="muted">סליקה עצמית תיכנס לכאן לבד אחרי חיבור Cardcom. עסקה שנסגרה בטלפון? רושמים אותה עכשיו.</p>
      </div>
      <button className="btn btn-glass btn-sm" onClick={onAdd}><Icon name="plus" size={16} /> תשלום חדש</button>
    </div>
  );
}

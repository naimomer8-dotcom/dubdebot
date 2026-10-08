"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Sidebar from "./Sidebar";
import Spotlight from "./Spotlight";
import Mascot from "./Mascot";
import Icon, { IconName } from "./Icon";
import Radar from "./Radar";
import LeadModal from "./LeadModal";
import Confetti from "./Confetti";
import { AXES, ARCHETYPES, Scores, insights } from "@/lib/xray";
import { TOOLS } from "@/lib/persona";
import NirPose from "./NirPose";
import type { ConvItem, ShellUser } from "@/lib/data";

type Xray = { id: string; scores: Scores; total: number; archetype: string | null; created_at: string };
type Deliverable = { id: string; kind: string; title: string; content: string; created_at: string };
type Task = { id: string; text: string; priority: string | null; done: boolean; deliverable_id: string | null };

const PROFILE_LABELS: Record<string, string> = {
  business_type: "תחום",
  business_name: "שם העסק",
  years_active: "ותק",
  monthly_revenue: "מחזור חודשי",
  employees: "עובדים",
  main_channel: "ערוץ לקוחות",
  avg_deal_price: "עסקה ממוצעת",
  main_pain: "הכאב המרכזי",
  goal: "היעד",
  city: "עיר",
};

const fmtDate = (s: string) => new Date(s).toLocaleDateString("he-IL", { day: "numeric", month: "short" });

export default function VaultClient({
  user,
  conversations,
  leadSent: leadSentInitially,
  profile,
  xrays,
  deliverables: initialDeliverables,
  tasks: initialTasks,
}: {
  user: ShellUser;
  conversations: ConvItem[];
  leadSent: boolean;
  profile: Record<string, unknown>;
  xrays: Xray[];
  deliverables: Deliverable[];
  tasks: Task[];
}) {
  const [side, setSide] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [deliverables, setDeliverables] = useState(initialDeliverables);
  const [open, setOpen] = useState<Deliverable | null>(null);
  const [newTask, setNewTask] = useState("");
  const [meet, setMeet] = useState(false);
  const [leadSent, setLeadSent] = useState(leadSentInitially);
  const [confetti, setConfetti] = useState(0);

  const latest = xrays[0];
  const prev = xrays[1];
  const arch = latest ? ARCHETYPES.find((a) => a.id === latest.archetype) : null;
  const ins = latest ? insights(latest.scores) : null;
  const doneCount = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const profileEntries = Object.entries(profile).filter(([k, v]) => PROFILE_LABELS[k] && v !== null && v !== "" && v !== undefined);

  const path = useMemo(() => {
    const steps = [
      { label: "רנטגן עסקי", done: xrays.length > 0, href: "/xray" },
      { label: "פרופיל עסקי", done: profileEntries.length >= 4, href: "/chat" },
      { label: "תוכנית עבודה", done: deliverables.some((d) => d.kind === "workplan"), href: "/chat?tool=workplan" },
      { label: "ביצוע 50%", done: tasks.length > 0 && pct >= 50, href: "#tasks" },
      { label: "פגישת אסטרטגיה", done: leadSent, href: "" },
    ];
    const next = steps.findIndex((s) => !s.done);
    return { steps, next };
  }, [xrays.length, profileEntries.length, deliverables, tasks.length, pct, leadSent]);

  async function toggle(t: Task) {
    const done = !t.done;
    setTasks((all) => all.map((x) => (x.id === t.id ? { ...x, done } : x)));
    if (done && tasks.filter((x) => x.done).length + 1 === tasks.length) setConfetti((c) => c + 1);
    await fetch("/api/tasks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id, done }) }).catch(() => {});
  }
  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const text = newTask.trim();
    if (!text) return;
    setNewTask("");
    const r = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }).catch(() => null);
    const j = r && r.ok ? await r.json().catch(() => null) : null;
    if (j?.task) setTasks((all) => [...all.filter((x) => !x.done), j.task, ...all.filter((x) => x.done)]);
  }
  async function removeDeliverable(id: string) {
    setDeliverables((d) => d.filter((x) => x.id !== id));
    setTasks((t) => t.filter((x) => x.deliverable_id !== id));
    setOpen(null);
    await fetch("/api/vault", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => {});
  }

  const kindIcon = (k: string): IconName => (k === "social_scan" ? "radar" : (TOOLS.find((t) => t.id === k)?.icon as IconName) ?? "file");
  const kindName = (k: string) => (k === "social_scan" ? "סריקת רשתות" : TOOLS.find((t) => t.id === k)?.title ?? "שיחה");
  const C = 2 * Math.PI * 52;

  return (
    <>
      <Spotlight />
      <div className="app">
        <Sidebar active="vault" conversations={conversations} user={user} leadSent={leadSent} onMeet={() => setMeet(true)} open={side} onClose={() => setSide(false)} />
        <main className="main" style={{ gridTemplateRows: "auto 1fr" }}>
          <header className="topbar">
            <div className="who">
              <button className="icon-btn mobile-only" onClick={() => setSide(true)} aria-label="תפריט"><Icon name="menu" size={20} /></button>
              <Icon name="vault" size={22} className="gold-ico" />
              <div><b>התיק העסקי שלי</b><small>כל מה שבנינו יחד, במקום אחד</small></div>
            </div>
            <div className="topbar-actions">
              <Link className="btn btn-glass btn-sm" href="/chat"><Icon name="chat" size={16} /> לשיחה</Link>
            </div>
          </header>

          <div className="vault">
            <div className="vault-in">
              <div className="vault-head">
                <div>
                  <span className="eyebrow">{user.firstName} · התיק העסקי</span>
                  <h1 className="h-display">המסלול שלך <span className="gold">לעסק אלפא.</span></h1>
                </div>
                <NirPose pose={pct === 100 && tasks.length ? "celebrate" : "box"} width={170} className="vault-nir" />
              </div>

              {/* alpha path */}
              <section className="vcard w12 glass edge">
                <div className="vcard-h"><h3><Icon name="map" size={20} /> מסלול האלפא</h3><span className="muted" style={{ fontSize: 13.5 }}>{path.steps.filter((s) => s.done).length} מתוך 5</span></div>
                <div className="path">
                  {path.steps.map((s, i) => (
                    <div key={s.label} className={`pstep ${s.done ? "done" : i === path.next ? "next" : ""}`}>
                      <i>{s.done ? <Icon name="check" size={16} stroke={2.2} /> : i + 1}</i>
                      {s.label}
                      {i === path.next && (s.href ? <a href={s.href} style={{ fontSize: 12 }}>הצעד הבא ←</a> : <button className="act" style={{ color: "var(--gold)" }} onClick={() => setMeet(true)}>לתאם ←</button>)}
                    </div>
                  ))}
                </div>
              </section>

              <div className="vgrid">
                {/* x-ray */}
                <section className="vcard w8 glass edge">
                  <div className="vcard-h">
                    <h3><Icon name="scan" size={20} /> הרנטגן האחרון</h3>
                    <Link className="btn btn-ghost btn-sm" href="/xray">{latest ? "לעשות שוב" : "להתחיל"} <Icon name="arrow" size={15} /></Link>
                  </div>
                  {latest && arch && ins ? (
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.1fr)", gap: 18, alignItems: "center" }} className="xr-mini">
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                          <b className="gold num" style={{ fontFamily: "var(--serif)", fontWeight: 300, fontSize: 76, lineHeight: 0.85 }}>{latest.total}</b>
                          <span className="muted">/100</span>
                          {prev && <span className={`badge ${latest.total >= prev.total ? "" : "cherry"}`}>{latest.total >= prev.total ? "+" : ""}{latest.total - prev.total} מהקודם</span>}
                        </div>
                        <div><b style={{ fontFamily: "var(--serif)", fontSize: 26, fontWeight: 400 }}>{arch.name}</b><p className="muted" style={{ margin: "2px 0 0" }}>{arch.line}</p></div>
                        <p style={{ margin: 0, fontSize: 14.5, color: "var(--text-2)" }}><b style={{ color: "var(--cherry-hi)", fontWeight: 500 }}>צוואר בקבוק: {ins.weakest.label}.</b> {ins.weakLine}</p>
                        <small className="muted">נמדד ב-{fmtDate(latest.created_at)}</small>
                      </div>
                      <Radar scores={latest.scores} />
                    </div>
                  ) : (
                    <div className="empty-note">
                      עוד לא עשית רנטגן. 3 דקות, ואתה יודע בדיוק איפה העסק דולף.
                      <Link className="btn btn-primary btn-sm" href="/xray">לעשות רנטגן</Link>
                    </div>
                  )}
                </section>

                {/* progress ring */}
                <section className="vcard glass edge" style={{ alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                  <div className="ring">
                    <svg viewBox="0 0 120 120">
                      <defs>
                        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f6e6c2" /><stop offset="1" stopColor="#8c6f42" /></linearGradient>
                      </defs>
                      <circle className="bg" cx="60" cy="60" r="52" fill="none" strokeWidth="6" />
                      <circle className="fg" cx="60" cy="60" r="52" fill="none" strokeWidth="6" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} />
                    </svg>
                    <b className="num">{pct}%</b>
                  </div>
                  <div>
                    <b style={{ fontFamily: "var(--serif)", fontSize: 22, fontWeight: 500 }}>ביצוע</b>
                    <p className="muted" style={{ margin: "2px 0 0", fontSize: 14 }}>{tasks.length ? `${doneCount} מתוך ${tasks.length} משימות` : "אין עדיין משימות"}</p>
                  </div>
                </section>

                {/* tasks */}
                <section className="vcard w6 glass edge" id="tasks">
                  <div className="vcard-h"><h3><Icon name="list" size={20} /> המשימות שלי</h3></div>
                  {tasks.length ? (
                    <div className="tasks">
                      {tasks.map((t) => (
                        <div key={t.id} className={`task ${t.done ? "done" : ""}`} onClick={() => toggle(t)} role="checkbox" aria-checked={t.done} tabIndex={0} onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), toggle(t))}>
                          <span className="box">{t.done && <Icon name="check" size={13} stroke={2.6} />}</span>
                          <span className="tx">{t.text}</span>
                          {t.priority === "urgent" && !t.done && <span className="pri">דחוף</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-note">שומרים תוכנית עבודה לתיק, והמשימות נשלפות ממנה לבד.
                      <Link className="btn btn-glass btn-sm" href="/chat?tool=workplan"><Icon name="map" size={16} /> לבנות תוכנית עבודה</Link>
                    </div>
                  )}
                  <form onSubmit={addTask} style={{ display: "flex", gap: 8 }}>
                    <input className="input" style={{ padding: "11px 14px", fontSize: 15 }} placeholder="משימה חדשה…" value={newTask} onChange={(e) => setNewTask(e.target.value)} aria-label="משימה חדשה" />
                    <button className="icon-btn" style={{ border: "1px solid var(--hair-2)", width: 46, height: 46 }} aria-label="הוספה"><Icon name="plus" size={18} /></button>
                  </form>
                </section>

                {/* deliverables */}
                <section className="vcard w6 glass edge">
                  <div className="vcard-h"><h3><Icon name="layers" size={20} /> התוצרים שלי</h3><span className="muted" style={{ fontSize: 13.5 }}>{deliverables.length}</span></div>
                  {deliverables.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {deliverables.map((d) => (
                        <button key={d.id} className="deliv" onClick={() => setOpen(d)}>
                          <span className="d-ico"><Icon name={kindIcon(d.kind)} size={19} /></span>
                          <span className="meta"><b>{d.title}</b><small>{kindName(d.kind)} · {fmtDate(d.created_at)}</small></span>
                          <Icon name="arrow" size={16} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-note">כל תשובה של דובדבוט אפשר לשמור לכאן בלחיצה על <b style={{ color: "var(--gold)" }}>שמירה לתיק</b>.</div>
                  )}
                </section>

                {/* profile */}
                <section className="vcard w12 glass edge">
                  <div className="vcard-h"><h3><Icon name="user" size={20} /> מה דובדבוט יודע על העסק שלך</h3></div>
                  {profileEntries.length ? (
                    <dl className="kv" style={{ gridTemplateColumns: "auto 1fr auto 1fr" }}>
                      {profileEntries.map(([k, v]) => (
                        <div key={k} style={{ display: "contents" }}><dt>{PROFILE_LABELS[k]}</dt><dd>{String(v)}</dd></div>
                      ))}
                    </dl>
                  ) : (
                    <div className="empty-note">ככל שתדבר איתו, דובדבוט לומד את העסק – תחום, מחזור, הכאב והיעד – ומתאים את התשובות.</div>
                  )}
                </section>
              </div>

              {xrays.length > 1 && (
                <section className="vcard w12 glass edge">
                  <div className="vcard-h"><h3><Icon name="chart" size={20} /> ההתקדמות לאורך זמן</h3></div>
                  <div className="axis-list">
                    {AXES.map((a) => (
                      <div className="axis-row" key={a.id} style={{ gridTemplateColumns: "120px 1fr 80px" }}>
                        <span>{a.label}</span>
                        <span className="track"><i style={{ width: `${Math.max(4, latest.scores[a.id])}%` }} className={latest.scores[a.id] < 40 ? "low" : ""} /></span>
                        <b>{latest.scores[a.id]} <small className="muted">({latest.scores[a.id] - (xrays[xrays.length - 1].scores[a.id] ?? 0) >= 0 ? "+" : ""}{latest.scores[a.id] - (xrays[xrays.length - 1].scores[a.id] ?? 0)})</small></b>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </main>
      </div>

      {open && (
        <>
          <div className="backdrop" onClick={() => setOpen(null)} />
          <div className="drawer" role="dialog" aria-modal="true" aria-label={open.title}>
            <div className="drawer-head">
              <div>
                <span className="eyebrow">{kindName(open.kind)} · {fmtDate(open.created_at)}</span>
                <h3 style={{ marginTop: 8 }}>{open.title}</h3>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="icon-btn" onClick={() => navigator.clipboard?.writeText(open.content)} aria-label="העתקה"><Icon name="copy" size={18} /></button>
                <button className="icon-btn" onClick={() => removeDeliverable(open.id)} aria-label="מחיקה"><Icon name="trash" size={18} /></button>
                <button className="icon-btn" onClick={() => setOpen(null)} aria-label="סגירה"><Icon name="close" size={20} /></button>
              </div>
            </div>
            <div className="md reader">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ table: ({ children }) => <div className="tbl"><table>{children}</table></div> }}>{open.content}</ReactMarkdown>
            </div>
          </div>
        </>
      )}

      {meet && (
        <LeadModal
          initialType="nir"
          trigger="vault"
          user={user}
          conversationId={null}
          onClose={() => setMeet(false)}
          onSubmitted={() => {
            setLeadSent(true);
            setConfetti((c) => c + 1);
          }}
        />
      )}
      {confetti > 0 && <Confetti key={confetti} />}
    </>
  );
}

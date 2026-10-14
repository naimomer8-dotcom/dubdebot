"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";
import { Brand, GroupLogo } from "./BrandBar";
import { TOOLS, ToolMode } from "@/lib/persona";
import { nextTier, planById } from "@/lib/plans";
import type { ConvItem, ShellUser } from "@/lib/data";

type Menu = { id: string; mode: "menu" | "rename" | "folder" | "delete" } | null;

const EXPLORE = [
  { href: "/xray", icon: "scan" as const, label: "רנטגן עסקי" },
  { href: "/scan", icon: "radar" as const, label: "סריקת רשתות" },
  { href: "/tests", icon: "target" as const, label: "מבחני תקשורת ומכירות" },
  { href: "/calc", icon: "chart" as const, label: "מחשבונים עסקיים" },
];

function readOpen(key: string, dflt: boolean) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? dflt : v === "1";
  } catch {
    return dflt;
  }
}

export default function Sidebar({
  active,
  mode,
  onTool,
  conversations: initialConvs,
  currentId,
  user,
  onCall,
  open,
  onClose,
}: {
  active: "chat" | "vault" | "plans" | "courses";
  mode?: ToolMode;
  onTool?: (id: ToolMode) => void;
  conversations: ConvItem[];
  currentId?: string | null;
  user: ShellUser;
  leadSent?: boolean;
  onMeet?: () => void;
  onCall?: () => void;
  open: boolean;
  onClose: () => void;
}) {
  const [convs, setConvs] = useState<ConvItem[]>(initialConvs);
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState<Menu>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [toolsOpen, setToolsOpen] = useState(true);
  const [me, setMe] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setToolsOpen(readOpen("side.tools", true)), []);
  const toggleTools = () => {
    setToolsOpen((v) => {
      try { localStorage.setItem("side.tools", v ? "0" : "1"); } catch {}
      return !v;
    });
  };

  const refresh = useCallback(async () => {
    const r = await fetch("/api/conversations", { cache: "no-store" }).catch(() => null);
    if (r?.ok) setConvs((await r.json()).conversations);
  }, []);
  useEffect(() => {
    const h = () => refresh();
    window.addEventListener("conv:changed", h);
    return () => window.removeEventListener("conv:changed", h);
  }, [refresh]);

  // close the row menu on outside click / Escape
  useEffect(() => {
    if (!menu) return;
    const down = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(null); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(null); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [menu]);

  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(""), 2200); };

  const patch = async (id: string, body: Record<string, unknown>, ok: string) => {
    setBusy(true);
    const r = await fetch("/api/conversations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) }).catch(() => null);
    setBusy(false);
    setMenu(null);
    if (!r?.ok) return flash("לא הצלחנו לשמור. נסה שוב.");
    flash(ok);
    refresh();
  };
  const remove = async (id: string) => {
    setBusy(true);
    const r = await fetch(`/api/conversations?id=${id}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    setMenu(null);
    if (!r?.ok) return flash("המחיקה נכשלה. נסה שוב.");
    if (id === currentId) { window.location.href = "/chat?new=1"; return; }
    setConvs((c) => c.filter((x) => x.id !== id));
    flash("השיחה נמחקה");
  };

  const folders = useMemo(() => [...new Set(convs.map((c) => c.folder).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "he")), [convs]);
  const filtered = useMemo(() => {
    const s = q.trim();
    return s ? convs.filter((c) => c.title.includes(s)) : convs;
  }, [convs, q]);
  const pinned = filtered.filter((c) => c.pinned);
  const byFolder = folders.map((f) => ({ f, items: filtered.filter((c) => !c.pinned && c.folder === f) })).filter((g) => g.items.length);
  const rest = filtered.filter((c) => !c.pinned && !c.folder);

  const logout = async (everywhere = false) => {
    await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ everywhere }) }).catch(() => {});
    window.location.href = "/login";
  };
  const tool = (id: ToolMode) => {
    onClose();
    if (onTool) onTool(id);
    else window.location.href = `/chat?tool=${id}`;
  };

  const a = user.access;
  const myPlan = planById(a.tier);
  const up = nextTier(a.tier);
  const planLine = a.plan === "paid" ? `${myPlan?.name ?? "מנוי פעיל"} · פעיל` : a.daysLeft <= 1 ? "מתנה · יום אחרון" : `מתנה · עוד ${a.daysLeft} ימים`;

  const renderRow = (c: ConvItem) => {
    const m = menu?.id === c.id ? menu : null;
    return (
      <div key={c.id} className={`conv-row ${c.id === currentId ? "on" : ""} ${m ? "menu-open" : ""}`}>
        {m?.mode === "rename" ? (
          <form className="conv-edit" onSubmit={(e) => { e.preventDefault(); patch(c.id, { title: draft }, "השם עודכן"); }}>
            <input className="input" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={80} aria-label="שם חדש לשיחה" />
            <button className="icon-btn" type="submit" disabled={busy || !draft.trim()} aria-label="שמירה"><Icon name="check" size={16} /></button>
            <button className="icon-btn" type="button" onClick={() => setMenu(null)} aria-label="ביטול"><Icon name="close" size={16} /></button>
          </form>
        ) : (
          <>
            <a className="conv" href={`/chat?c=${c.id}`} title={c.title} aria-current={c.id === currentId ? "page" : undefined}>
              {c.pinned && <Icon name="pin" size={13} className="conv-pin" />}
              <span>{c.title}</span>
            </a>
            <button className="conv-more" aria-label={`אפשרויות לשיחה ${c.title}`} aria-haspopup="menu" aria-expanded={!!m} onClick={() => setMenu(m ? null : { id: c.id, mode: "menu" })}>
              <Icon name="more" size={16} />
            </button>
          </>
        )}
        {m && m.mode !== "rename" && (
          <div className="conv-menu" ref={menuRef} role="menu">
            {m.mode === "menu" && (
              <>
                <button role="menuitem" onClick={() => patch(c.id, { pinned: !c.pinned }, c.pinned ? "הוסר מהנעוצים" : "נעץ למעלה")}><Icon name="pin" size={15} /> {c.pinned ? "ביטול נעיצה" : "נעיצה למעלה"}</button>
                <button role="menuitem" onClick={() => { setDraft(c.title); setMenu({ id: c.id, mode: "rename" }); }}><Icon name="edit" size={15} /> שינוי שם</button>
                <button role="menuitem" onClick={() => { setDraft(c.folder ?? ""); setMenu({ id: c.id, mode: "folder" }); }}><Icon name="folder" size={15} /> העברה לתיקייה</button>
                <button role="menuitem" className="danger" onClick={() => setMenu({ id: c.id, mode: "delete" })}><Icon name="trash" size={15} /> מחיקה</button>
              </>
            )}
            {m.mode === "folder" && (
              <div className="conv-folder">
                {folders.length > 0 && (
                  <div className="chips-row">
                    {folders.map((f) => (
                      <button key={f} className={`chip-btn ${c.folder === f ? "on" : ""}`} onClick={() => patch(c.id, { folder: f }, `הועבר ל"${f}"`)}>{f}</button>
                    ))}
                  </div>
                )}
                <form onSubmit={(e) => { e.preventDefault(); patch(c.id, { folder: draft }, draft.trim() ? `הועבר ל"${draft.trim()}"` : "הוצא מהתיקייה"); }}>
                  <input className="input" autoFocus placeholder="תיקייה חדשה (למשל: שיווק)" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={40} aria-label="שם תיקייה" />
                  <button className="btn btn-primary btn-sm" disabled={busy}>שמירה</button>
                </form>
                {c.folder && <button className="link-btn" onClick={() => patch(c.id, { folder: null }, "הוצא מהתיקייה")}>הוצאה מהתיקייה</button>}
              </div>
            )}
            {m.mode === "delete" && (
              <div className="conv-confirm">
                <p>למחוק את השיחה וכל ההודעות בה? אי אפשר לשחזר.</p>
                <div>
                  <button className="btn btn-sm danger-solid" disabled={busy} onClick={() => remove(c.id)}>{busy ? "מוחק…" : "כן, למחוק"}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setMenu(null)}>ביטול</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {open && <div className="backdrop mobile-backdrop" onClick={onClose} style={{ zIndex: 64 }} />}
      <aside className={`side ${open ? "open" : ""}`} aria-label="ניווט ראשי">
        <div className="side-head">
          <Brand size={34} href="/chat" />
          <button className="icon-btn mobile-only" onClick={onClose} aria-label="סגירת תפריט"><Icon name="close" size={18} /></button>
        </div>

        <div className="side-actions">
          <a className="side-new" href="/chat?new=1"><Icon name="plus" size={18} /> שיחה חדשה</a>
          {onCall && (
            <button className="side-call" onClick={() => { onClose(); onCall(); }} aria-label="שיחה קולית עם ניר" title="שיחה קולית עם ניר"><Icon name="phone" size={18} /></button>
          )}
        </div>

        <nav aria-label="עמודים">
          <Link className="side-link" href="/chat" aria-current={active === "chat" && (!mode || mode === "chat") ? "true" : undefined}><Icon name="chat" size={18} /> שיחה עם ניר</Link>
          <Link className="side-link" href="/vault" aria-current={active === "vault" ? "true" : undefined}><Icon name="vault" size={18} /> התיק העסקי שלי</Link>
          <Link className="side-link" href="/courses" aria-current={active === "courses" ? "true" : undefined}><Icon name="layers" size={18} /> הקורסים שלי</Link>
          <Link className="side-link" href="/plans" aria-current={active === "plans" ? "true" : undefined}><Icon name="gem" size={18} /> מסלולים ומנוי</Link>
        </nav>

        <button className="side-label side-toggle" onClick={toggleTools} aria-expanded={toolsOpen}>
          <span>כלים</span><Icon name="chevron" size={14} className={toolsOpen ? "" : "rot"} />
        </button>
        {toolsOpen && (
          <div className="side-group">
            {TOOLS.filter((t) => t.id !== "chat").map((t) => (
              <button key={t.id} className="side-link" aria-pressed={active === "chat" && mode === t.id} onClick={() => tool(t.id)}>
                <Icon name={t.icon} size={18} /> {t.title}
              </button>
            ))}
            {EXPLORE.map((e) => (
              <Link key={e.href} className="side-link" href={e.href}><Icon name={e.icon} size={18} /> {e.label}</Link>
            ))}
          </div>
        )}

        <div className="side-label side-label-row">
          <span>השיחות שלי {convs.length > 0 && <small className="num">({convs.length})</small>}</span>
        </div>
        {convs.length > 4 && (
          <label className="conv-search">
            <Icon name="search" size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש בשיחות" aria-label="חיפוש בשיחות" />
            {q && <button onClick={() => setQ("")} aria-label="ניקוי חיפוש"><Icon name="close" size={13} /></button>}
          </label>
        )}
        <div className="side-scroll">
          {convs.length === 0 && <p className="conv-empty">השיחות שלך יופיעו כאן. אפשר לנעוץ, לשנות שם, לסדר בתיקיות ולמחוק.</p>}
          {filtered.length === 0 && convs.length > 0 && <p className="conv-empty">לא נמצאו שיחות עם "{q}".</p>}
          {pinned.length > 0 && (
            <div className="conv-group">
              <div className="conv-gtitle"><Icon name="pin" size={12} /> נעוצות</div>
              {pinned.map((c) => renderRow(c))}
            </div>
          )}
          {byFolder.map((g) => (
            <div className="conv-group" key={g.f}>
              <div className="conv-gtitle"><Icon name="folder" size={12} /> {g.f}</div>
              {g.items.map((c) => renderRow(c))}
            </div>
          ))}
          {rest.length > 0 && (
            <div className="conv-group">
              {(pinned.length > 0 || byFolder.length > 0) && <div className="conv-gtitle">אחרונות</div>}
              {rest.map((c) => renderRow(c))}
            </div>
          )}
        </div>

        <div className="side-foot">
          {up && (
            <Link href="/plans" className="side-up" onClick={onClose}>
              <span className="side-up-ico"><Icon name="gem" size={18} /></span>
              <span>
                <b>{a.plan === "paid" ? `שדרוג ל-${up.name}` : "בחירת מסלול שנתי"}</b>
                <small>{a.plan === "paid" ? up.tagline : "קורסים, כנסים וזום עם ניר · מ-₪229 לחודש"}</small>
              </span>
            </Link>
          )}
          <div className="me">
            <span className="avatar" aria-hidden="true">{user.firstName.slice(0, 1)}</span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <b>{user.fullName}</b>
              <small className={`plan-line ${a.plan !== "paid" && a.daysLeft <= 7 ? "warn" : ""}`}>{planLine}</small>
            </span>
            <button className="icon-btn" onClick={() => setMe(!me)} aria-label="תפריט חשבון" aria-expanded={me}><Icon name="more" size={18} /></button>
            {me && (
              <div className="me-menu" role="menu">
                <Link role="menuitem" href="/plans"><Icon name="gem" size={16} /> המנוי שלי</Link>
                <a role="menuitem" href="/login?forgot=1" onClick={(e) => { e.preventDefault(); logout(false).then(() => (window.location.href = `/login?forgot=1&email=${encodeURIComponent(user.email)}`)); }}><Icon name="lock" size={16} /> שינוי סיסמה</a>
                <button role="menuitem" onClick={() => logout(false)}><Icon name="logout" size={16} /> התנתקות</button>
                <button role="menuitem" onClick={() => logout(true)}><Icon name="logout" size={16} /> התנתקות מכל המכשירים</button>
              </div>
            )}
          </div>
          <GroupLogo className="group-logo side-logo" />
        </div>
        {toast && <div className="side-toast" role="status">{toast}</div>}
      </aside>
    </>
  );
}

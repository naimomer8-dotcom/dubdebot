"use client";

import Link from "next/link";
import { useState } from "react";
import NirPhoto from "./NirPhoto";
import Icon from "./Icon";
import { Brand, GroupLogo } from "./BrandBar";
import { TOOLS, ToolMode } from "@/lib/persona";
import type { ConvItem, ShellUser } from "@/lib/data";

export default function Sidebar({
  active,
  mode,
  onTool,
  conversations,
  currentId,
  user,
  leadSent,
  onMeet,
  onCall,
  open,
  onClose,
}: {
  active: "chat" | "vault";
  mode?: ToolMode;
  onTool?: (id: ToolMode) => void;
  conversations: ConvItem[];
  currentId?: string | null;
  user: ShellUser;
  leadSent: boolean;
  onMeet: () => void;
  onCall?: () => void;
  open: boolean;
  onClose: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const logout = async (everywhere = false) => {
    await fetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ everywhere }) }).catch(() => {});
    window.location.href = "/login";
  };
  const tool = (id: ToolMode) => {
    onClose();
    if (onTool) onTool(id);
    else window.location.href = `/chat?tool=${id}`;
  };
  return (
    <>
      {open && <div className="backdrop mobile-backdrop" onClick={onClose} style={{ zIndex: 64 }} />}
      <aside className={`side ${open ? "open" : ""}`} aria-label="ניווט">
        <div className="side-head">
          <Brand size={34} href="/" />
          <button className="icon-btn mobile-only" onClick={onClose} aria-label="סגירת תפריט"><Icon name="close" size={18} /></button>
        </div>
        <a className="side-new" href="/chat?new=1">
          <Icon name="plus" size={18} /> שיחה חדשה
        </a>
        <Link className="side-link" href="/chat" aria-current={active === "chat" && (!mode || mode === "chat")}>
          <Icon name="chat" size={18} /> שיחה עם דובדבוט
        </Link>
        <Link className="side-link" href="/xray">
          <Icon name="scan" size={18} /> רנטגן עסקי
        </Link>
        <Link className="side-link" href="/scan">
          <Icon name="radar" size={18} /> סריקת רשתות
        </Link>
        <Link className="side-link" href="/tests">
          <Icon name="target" size={18} /> מבחנים: תקשורת ומכירות <span className="new-tag">חדש</span>
        </Link>
        <Link className="side-link" href="/vault" aria-current={active === "vault"}>
          <Icon name="vault" size={18} /> התיק העסקי שלי
        </Link>
        {onCall && (
          <button className="side-link" onClick={() => { onClose(); onCall(); }}>
            <Icon name="phone" size={18} /> שיחה קולית עם ניר
          </button>
        )}

        <div className="side-label">כלים</div>
        {TOOLS.filter((t) => t.id !== "chat").map((t) => (
          <button key={t.id} className="side-link" aria-pressed={active === "chat" && mode === t.id} onClick={() => tool(t.id)}>
            <Icon name={t.icon} size={18} /> {t.title}
          </button>
        ))}

        {conversations.length > 0 && <div className="side-label">שיחות אחרונות</div>}
        <div className="side-scroll">
          {conversations.map((c) => (
            <a key={c.id} className={`conv ${c.id === currentId ? "on" : ""}`} href={`/chat?c=${c.id}`} title={c.title}>
              {c.title}
            </a>
          ))}
        </div>

        <div className="side-foot">
          {!leadSent && (
            <div className="meet-card">
              <div className="nir-tag">
                <NirPhoto size={44} />
                <span><b style={{ fontFamily: "var(--display)", fontSize: 28, lineHeight: 0.9, marginBottom: 2 }}>לשבת עם ניר</b><small>22 שנה בליווי עסקים</small></span>
              </div>
              <p>פגישת אסטרטגיה אישית עם ניר או עם אחד היועצים הבכירים.</p>
              <button className="btn btn-primary btn-sm btn-block" onClick={() => { onClose(); onMeet(); }}>
                <Icon name="calendar" size={16} /> לתאם פגישה
              </button>
            </div>
          )}
          <div className="me" style={{ position: "relative" }}>
            <span className="avatar">{user.firstName.slice(0, 1)}</span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <b>{user.fullName}</b>
              <small className={`plan-line ${user.access.daysLeft <= 7 ? "warn" : ""}`}>
                {user.access.plan === "paid" ? "מנוי שנתי" : "מנוי מתנה"} · {user.access.daysLeft <= 1 ? "יום אחרון" : `עוד ${user.access.daysLeft} ימים`}
              </small>
            </span>
            <button className="icon-btn" onClick={() => setMenu(!menu)} aria-label="חשבון" aria-expanded={menu}><Icon name="logout" size={18} /></button>
            {menu && (
              <div className="me-menu" role="menu">
                <button role="menuitem" onClick={() => logout(false)}><Icon name="logout" size={16} /> התנתקות</button>
                <button role="menuitem" onClick={() => logout(true)}><Icon name="lock" size={16} /> התנתקות מכל המכשירים</button>
                <a role="menuitem" href="/login?forgot=1" onClick={(e) => { e.preventDefault(); logout(false).then(() => (window.location.href = `/login?forgot=1&email=${encodeURIComponent(user.email)}`)); }}><Icon name="lock" size={16} /> שינוי סיסמה</a>
              </div>
            )}
          </div>
          <GroupLogo className="group-logo side-logo" />
        </div>
      </aside>
    </>
  );
}

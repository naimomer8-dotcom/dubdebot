"use client";

import Link from "next/link";
import Icon, { type IconName } from "./Icon";

type Tab = "home" | "chat" | "xray" | "money" | "courses";
const TABS: { key: Tab; href: string; icon: IconName; label: string }[] = [
  { key: "home", href: "/home", icon: "home", label: "בית" },
  { key: "chat", href: "/chat", icon: "chat", label: "ניר" },
  { key: "xray", href: "/xray", icon: "scan", label: "רנטגן" },
  { key: "money", href: "/money", icon: "coin", label: "כסף" },
  { key: "courses", href: "/courses", icon: "layers", label: "קורסים" },
];

/** Phone navigation: the five places members use most, always one tap away. */
export default function BottomNav({ active }: { active?: string }) {
  return (
    <nav className="bnav" aria-label="ניווט מהיר">
      {TABS.map((t) => (
        <Link key={t.key} href={t.href} className="bn-tab" aria-current={active === t.key ? "page" : undefined}>
          <Icon name={t.icon} size={22} />
          <span>{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}

/** Everything else, one tap from the avatar on the home screen. */
export function MoreSheet({ open, onClose, onTools, onCall }: { open: boolean; onClose: () => void; onTools?: () => void; onCall?: () => void }) {
  if (!open) return null;
  const item = (href: string, icon: IconName, title: string, desc: string) => (
    <Link className="bn-row" href={href} onClick={onClose}>
      <span className="bn-row-ico"><Icon name={icon} size={20} /></span>
      <span><b>{title}</b><small>{desc}</small></span>
    </Link>
  );
  return (
    <div className="bn-sheet-wrap" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bn-sheet" role="dialog" aria-modal="true" aria-label="עוד">
        <div className="bn-grip" aria-hidden="true" />
        {onCall && (
          <button className="bn-row" onClick={() => { onClose(); onCall(); }}>
            <span className="bn-row-ico"><Icon name="phone" size={20} /></span>
            <span><b>שיחה קולית עם ניר</b><small>מדברים במקום להקליד</small></span>
          </button>
        )}
        {onTools && (
          <button className="bn-row" onClick={() => { onClose(); onTools(); }}>
            <span className="bn-row-ico"><Icon name="spark" size={20} /></span>
            <span><b>כל הכלים</b><small>תחזית, תוכנית עבודה, תסריט מכירה ועוד</small></span>
          </button>
        )}
        {item("/vault", "vault", "התיק העסקי שלי", "כל מה ששמרת מהשיחות")}
        {item("/calc", "chart", "מחשבונים עסקיים", "נקודת איזון, תמחור, מע״מ")}
        {item("/plans", "gem", "המנוי שלי", "מסלולים, תשלום וחידוש")}
      </div>
    </div>
  );
}

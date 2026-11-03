"use client";

import Link from "next/link";
import { useState } from "react";
import Icon, { type IconName } from "./Icon";

type Tab = "chat" | "xray" | "money" | "courses";
const TABS: { key: Tab; href: string; icon: IconName; label: string }[] = [
  { key: "chat", href: "/chat", icon: "chat", label: "ניר" },
  { key: "xray", href: "/xray", icon: "scan", label: "רנטגן" },
  { key: "money", href: "/money", icon: "coin", label: "כסף" },
  { key: "courses", href: "/courses", icon: "layers", label: "קורסים" },
];

/** Phone navigation: the four things members use most, always one tap away. Everything else sits under "עוד". */
export default function BottomNav({ active, onTools, onCall }: { active?: string; onTools: () => void; onCall?: () => void }) {
  const [more, setMore] = useState(false);
  const item = (href: string, icon: IconName, title: string, desc: string) => (
    <Link className="bn-row" href={href} onClick={() => setMore(false)}>
      <span className="bn-row-ico"><Icon name={icon} size={20} /></span>
      <span><b>{title}</b><small>{desc}</small></span>
    </Link>
  );
  return (
    <>
      <nav className="bnav" aria-label="ניווט מהיר">
        {TABS.map((t) => (
          <Link key={t.key} href={t.href} className="bn-tab" aria-current={active === t.key ? "page" : undefined}>
            <Icon name={t.icon} size={22} />
            <span>{t.label}</span>
          </Link>
        ))}
        <button className="bn-tab" onClick={() => setMore(true)} aria-haspopup="dialog" aria-expanded={more}>
          <Icon name="menu" size={22} />
          <span>עוד</span>
        </button>
      </nav>
      {more && (
        <div className="bn-sheet-wrap" onClick={(e) => e.target === e.currentTarget && setMore(false)}>
          <div className="bn-sheet" role="dialog" aria-modal="true" aria-label="עוד">
            <div className="bn-grip" aria-hidden="true" />
            {onCall && (
              <button className="bn-row" onClick={() => { setMore(false); onCall(); }}>
                <span className="bn-row-ico"><Icon name="phone" size={20} /></span>
                <span><b>שיחה קולית עם ניר</b><small>מדברים במקום להקליד</small></span>
              </button>
            )}
            <button className="bn-row" onClick={() => { setMore(false); onTools(); }}>
              <span className="bn-row-ico"><Icon name="spark" size={20} /></span>
              <span><b>כל הכלים</b><small>תחזית, תוכנית עבודה, תסריט מכירה ועוד</small></span>
            </button>
            {item("/calc", "chart", "מחשבונים עסקיים", "נקודת איזון, תמחור, מע״מ")}
            {item("/vault", "vault", "התיק העסקי שלי", "כל מה ששמרת מהשיחות")}
            {item("/plans", "gem", "המנוי שלי", "מסלולים, תשלום וחידוש")}
          </div>
        </div>
      )}
    </>
  );
}

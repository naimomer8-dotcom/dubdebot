"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Icon, { type IconName } from "./Icon";
import { TOOLS, type ToolMode } from "@/lib/persona";

type Item = { key: string; icon: IconName; title: string; desc: string; tool?: ToolMode; href?: string; file?: boolean };

const T = (id: ToolMode): Item => {
  const t = TOOLS.find((x) => x.id === id)!;
  return { key: id, icon: t.icon, title: t.title, desc: t.desc, tool: id, file: !!t.upload };
};

const GROUPS: { title: string; sub: string; items: Item[] }[] = [
  { title: "לבנות לעסק", sub: "ניר בונה איתך את זה בשיחה", items: [T("forecast"), T("workplan"), T("sales_script"), T("campaign")] },
  { title: "לבדוק מסמכים", sub: "מעלים קובץ ומקבלים ניתוח", items: [T("financials"), T("payslip"), T("vat")] },
  {
    title: "לאבחן ולהתאמן",
    sub: "תמונת מצב ותרגול",
    items: [
      { key: "xray", icon: "scan", title: "רנטגן עסקי", desc: "12 שאלות, ציון על 6 צירים", href: "/xray" },
      T("feasibility"),
      T("objections"),
      { key: "scan", icon: "radar", title: "סריקת רשתות", desc: "איך העסק נראה מבחוץ", href: "/scan" },
      { key: "tests", icon: "target", title: "מבחני תקשורת ומכירות", desc: "איפה אתה חזק ואיפה פחות", href: "/tests" },
      { key: "calc", icon: "chart", title: "מחשבונים עסקיים", desc: "נקודת איזון, תמחור, מע״מ", href: "/calc" },
    ],
  },
];

/** The 6 tools most people need: shown first, as big tiles. Everything else sits under "כל הכלים". */
const FEATURED: Item[] = [T("forecast"), T("workplan"), T("sales_script"), T("campaign"), T("financials"), T("objections")];

export const TOOL_COUNT = GROUPS.reduce((n, g) => n + g.items.length, 0);

export default function ToolsLauncher({ open, onClose, onTool }: { open: boolean; onClose: () => void; onTool: (id: ToolMode) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [all, setAll] = useState(false);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>(".tl-tile")?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => { window.removeEventListener("keydown", key); prev?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;

  const body = (it: Item) => (
    <>
      <span className="tl-ico"><Icon name={it.icon} size={20} /></span>
      <span className="tl-txt"><b>{it.title}</b><small>{it.desc}</small></span>
      {it.file && <span className="tl-file"><Icon name="clip" size={13} /> קובץ</span>}
    </>
  );

  return (
    <div className="tl-wrap" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="tl" role="dialog" aria-modal="true" aria-labelledby="tl-h" ref={ref}>
        <div className="tl-head">
          <div><h2 id="tl-h" className="h-display">במה ניר יעזור לך <span className="gold">עכשיו?</span></h2></div>
          <button className="icon-btn" onClick={onClose} aria-label="סגירה"><Icon name="close" size={20} /></button>
        </div>
        <div className="tl-body">
          <div className="tl-tiles">
            {FEATURED.map((it) => (
              <button key={it.key} className="tl-tile" onClick={() => { onClose(); onTool(it.tool!); }}>
                <span className="tl-ico"><Icon name={it.icon} size={24} /></span>
                <b>{it.title}</b>
                {it.file && <small><Icon name="clip" size={12} /> מעלים קובץ</small>}
              </button>
            ))}
          </div>
          <button className="tl-all" onClick={() => setAll(!all)} aria-expanded={all}>
            {all ? "פחות כלים" : `כל הכלים (${TOOL_COUNT})`} <Icon name="chevron" size={16} />
          </button>
          {all && GROUPS.map((g) => (
            <section key={g.title} className="tl-group">
              <div className="tl-gh"><b>{g.title}</b><small>{g.sub}</small></div>
              <div className={`tl-grid ${g.items.length === 4 ? "tl-grid-2" : ""}`}>
                {g.items.map((it) =>
                  it.href ? (
                    <Link key={it.key} className="tl-item" href={it.href} onClick={onClose}>{body(it)}</Link>
                  ) : (
                    <button key={it.key} className="tl-item" onClick={() => { onClose(); onTool(it.tool!); }}>{body(it)}</button>
                  )
                )}
              </div>
            </section>
          ))}
          <button className="btn btn-primary tl-ask" onClick={onClose}><Icon name="chat" size={18} /> לא יודע מאיפה להתחיל? שאל את ניר</button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Icon from "./Icon";
import RenewalPanel from "./RenewalPanel";
import type { ShellUser } from "@/lib/data";

/** Thin bar when the gift month (last 7 days) or the paid year (last 14 days) is about to end. */
export default function AccessBar({ user }: { user: ShellUser }) {
  const a = user.access;
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const warn = a.status !== "expired" && a.daysLeft <= (a.plan === "paid" ? 14 : 7);
  if (!warn || hidden) return null;
  const text = a.plan === "paid" ? `המנוי השנתי שלך מסתיים בעוד ${a.daysLeft} ימים` : a.daysLeft <= 1 ? "היום האחרון של המנוי במתנה" : `נשארו לך ${a.daysLeft} ימים במנוי המתנה`;
  return (
    <>
      <div className="access-bar" role="status">
        <Icon name="clock" size={16} />
        <span className="ab-long">{text}</span>
        <span className="ab-short">{a.plan === "paid" ? `עוד ${a.daysLeft} ימים למנוי` : `עוד ${a.daysLeft} ימים במתנה`}</span>
        <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>{a.renewalRequestedAt ? "הבקשה התקבלה" : "להמשיך גם אחרי"}</button>
        <button className="icon-btn" onClick={() => setHidden(true)} aria-label="הסתרה"><Icon name="close" size={14} /></button>
      </div>
      {open && (
        <div className="overlay" role="dialog" aria-modal="true" aria-label="המשך מנוי" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <button className="icon-btn x-btn" onClick={() => setOpen(false)} aria-label="סגירה"><Icon name="close" size={18} /></button>
            <RenewalPanel access={a} firstName={user.firstName} phone={user.phone} compact />
          </div>
        </div>
      )}
    </>
  );
}

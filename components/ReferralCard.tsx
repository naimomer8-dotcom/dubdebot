"use client";

import { useState } from "react";
import Icon from "./Icon";

/** Friend-brings-friend: personal link + WhatsApp share. Code = first uuid segment (see lib/referral.ts). */
export default function ReferralCard({ userId, firstName }: { userId: string; firstName: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${typeof window !== "undefined" ? window.location.origin : "https://dubdebot.vercel.app"}/?ref=${userId.replace(/-/g, "").slice(0, 8)}`;
  const msg = `היי, אני משתמש ב-Duvdevani Platform, הפלטפורמה העסקית של ניר דובדבני. 30 יום במתנה, שווה לנסות 👇\n${link}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }
  return (
    <section className="ref-card glass edge" aria-label="חבר מביא חבר">
      <div className="ref-copy">
        <span className="deal-tag">חבר מביא חבר</span>
        <h3>{firstName}, תביא חבר. תקבל סדנה עם ניר.</h3>
        <p>על כל חבר שנרשם דרך הקישור שלך ומצטרף למסלול, אתה מקבל מקום בסדנת מכירות פיזית עם ניר דובדבני. בלי הגבלה על מספר החברים.</p>
      </div>
      <div className="ref-actions">
        <code className="ref-link" dir="ltr">{link.replace(/^https?:\/\//, "")}</code>
        <div className="ref-btns">
          <button className="btn btn-glass btn-sm" onClick={copy}><Icon name={copied ? "check" : "copy"} size={15} /> {copied ? "הועתק" : "העתקת קישור"}</button>
          <a className="btn btn-primary btn-sm" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer"><Icon name="share" size={15} /> שליחה בוואטסאפ</a>
        </div>
      </div>
    </section>
  );
}

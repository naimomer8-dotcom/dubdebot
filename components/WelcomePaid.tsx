"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import Confetti from "./Confetti";
import NirPose from "./NirPose";
import { planById } from "@/lib/plans";
import type { Access } from "@/lib/session";

/** One-time "בשעה טובה!" celebration the first time a member opens the app after paying (per tier). */
export default function WelcomePaid({ firstName, access }: { firstName: string; access: Access }) {
  const [open, setOpen] = useState(false);
  const key = `dd.welcome.paid.${access.tier}`;
  useEffect(() => {
    if (access.status !== "paid") return;
    let seen = false;
    try { seen = localStorage.getItem(key) === "1"; } catch {}
    if (!seen) setOpen(true);
  }, [access.status, key]);
  if (!open) return null;
  const close = () => { try { localStorage.setItem(key, "1"); } catch {} setOpen(false); };
  const plan = planById(access.tier);
  const meeting = access.tier && access.tier !== "basic";
  return (
    <div className="ob-wrap" onClick={(e) => e.target === e.currentTarget && close()}>
      <Confetti />
      <div className="ob" role="dialog" aria-modal="true" aria-labelledby="wp-h">
        <button className="icon-btn ob-x" onClick={close} aria-label="סגירה"><Icon name="close" size={18} /></button>
        <div className="ob-art"><NirPose pose="celebrate" width={190} eager /></div>
        <div className="ob-body">
          <span className="eyebrow">{plan?.name ?? "הפלטפורמה"} · פעיל</span>
          <h2 id="wp-h" className="h-display">בשעה טובה, {firstName}! <span className="gold">אתה בפנים.</span></h2>
          <ul className="ob-points">
            <li><span className="tl-ico"><Icon name="layers" size={18} /></span><span><b>הקורסים והספרים נפתחו לך</b><small>הכל מחכה בעמוד "הקורסים שלי", בלחיצה אחת.</small></span></li>
            <li><span className="tl-ico"><Icon name="calendar" size={18} /></span><span><b>הסדנה &quot;להעיר את הכסף שבך&quot; וזום חודשי עם ניר</b><small>ההזמנות יגיעו אליך בוואטסאפ ובמייל.</small></span></li>
            {meeting && <li><span className="tl-ico"><Icon name="phone" size={18} /></span><span><b>נציג יחזור אליך תוך 24 שעות</b><small>לתאם את הפגישה שכלולה במסלול שלך.</small></span></li>}
          </ul>
        </div>
        <div className="ob-foot">
          <span />
          <div className="ob-actions">
            <button className="btn btn-ghost btn-sm" onClick={close}>להמשיך לשיחה</button>
            <a className="btn btn-primary" href="/courses" onClick={close}>לקורסים שלי <Icon name="arrowLeft" size={18} className="ico-move" /></a>
          </div>
        </div>
      </div>
    </div>
  );
}

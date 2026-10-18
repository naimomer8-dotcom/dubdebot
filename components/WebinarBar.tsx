"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import { nextWebinar, webinarLabel, WEBINAR_TIME, WEBINAR_TITLE, WEBINAR_WA_GROUP } from "@/lib/webinarDates";

/** Banner under the chat header: the next live webinar + the quiet WhatsApp updates group. Dismissible per webinar date. */
export default function WebinarBar() {
  const d = nextWebinar();
  const key = `dd.webinarbar.${d}`;
  const [show, setShow] = useState(false);
  useEffect(() => {
    let hidden = false;
    try { hidden = localStorage.getItem(key) === "1"; } catch {}
    setShow(!hidden);
  }, [key]);
  if (!show) return null;
  const close = () => { try { localStorage.setItem(key, "1"); } catch {} setShow(false); };
  return (
    <div className="webinar-bar" role="region" aria-label="הוובינר הבא">
      <span className="wb-live"><span className="dot-live" /> לייב</span>
      <div className="wb-txt">
        <b>{WEBINAR_TITLE}</b>
        <small>וובינר חי עם ניר · יום ראשון {webinarLabel(d)} ב-{WEBINAR_TIME} · כלול במתנה שלך</small>
      </div>
      <div className="wb-actions">
        <a className="btn btn-primary btn-sm" href={WEBINAR_WA_GROUP} target="_blank" rel="noopener noreferrer"><Icon name="chat" size={15} /> לקבוצת העדכונים בוואטסאפ</a>
        <a className="btn btn-glass btn-sm" href="/w" target="_blank" rel="noopener noreferrer">קישור לזום</a>
      </div>
      <button className="icon-btn" onClick={close} aria-label="הסתרה"><Icon name="close" size={14} /></button>
    </div>
  );
}

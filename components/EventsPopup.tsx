"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import { WORKSHOP_GIFT } from "@/lib/liveEvents";
import { webinarLabel, WEBINAR_TIME, WEBINAR_TITLE, WEBINAR_WA_GROUP } from "@/lib/webinarDates";

type State = { workshop: boolean; webinar: boolean; workshopOpen: boolean; webinarDate: string };
const DISMISS_KEY = "dd.evpop.dismiss";

/**
 * One popup for every member: a seat in the sales workshop (gift) + the next live webinar, one click with the
 * details we already have. Comes back on later visits until the member registers or closes it twice.
 */
export default function EventsPopup() {
  const [st, setSt] = useState<State | null>(null);
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState({ workshop: true, webinar: true });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let dismissed = 0;
    try { dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0); } catch {}
    if (dismissed >= 2) return;
    let alive = true;
    fetch("/api/registrations", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s: State | null) => {
        if (!alive || !s) return;
        const needWorkshop = s.workshopOpen && !s.workshop;
        if (!needWorkshop && s.webinar) return;
        setSt(s);
        setPick({ workshop: needWorkshop, webinar: !s.webinar });
        setTimeout(() => alive && setOpen(true), 1500);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  if (!open || !st) return null;

  const close = () => {
    if (!done) { try { localStorage.setItem(DISMISS_KEY, String(Number(localStorage.getItem(DISMISS_KEY) || 0) + 1)); } catch {} }
    setOpen(false);
  };
  const submit = async () => {
    const items = (["workshop", "webinar"] as const).filter((k) => pick[k]);
    if (!items.length) return setErr("סמנו לפחות אירוע אחד");
    setBusy(true); setErr("");
    const r = await fetch("/api/registrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) }).catch(() => null);
    setBusy(false);
    if (!r?.ok) return setErr("לא הצלחנו לשמור. נסו שוב.");
    setSt(await r.json());
    setDone(true);
  };

  const showWorkshop = st.workshopOpen && (!st.workshop || done);
  const showWebinar = !st.webinar || done;
  const wDate = webinarLabel(st.webinarDate);

  return (
    <div className="evp-wrap" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="evp" role="dialog" aria-modal="true" aria-labelledby="evp-h">
        <button className="icon-btn evp-x" onClick={close} aria-label="סגירה"><Icon name="close" size={18} /></button>
        {!done ? (
          <>
            <span className="evp-tag">🎁 כלול במנוי שלך</span>
            <h2 id="evp-h" className="evp-title">שומרים לך מקום</h2>
            <p className="evp-sub">לחיצה אחת, בלי למלא שום דבר. נרשום אותך עם הפרטים שכבר יש לנו.</p>
            <div className="evp-list">
              {showWorkshop && (
                <label className={`evp-item ${pick.workshop ? "on" : ""}`}>
                  <input type="checkbox" checked={pick.workshop} onChange={(e) => setPick({ ...pick, workshop: e.target.checked })} />
                  <span className="evp-ico"><Icon name="target" size={22} /></span>
                  <span className="evp-txt">
                    <b>{WORKSHOP_GIFT.title}</b>
                    <small>{WORKSHOP_GIFT.dateLabel} · {WORKSHOP_GIFT.time}</small>
                    <small>{WORKSHOP_GIFT.place}</small>
                  </span>
                  <span className="evp-check"><Icon name="check" size={16} /></span>
                </label>
              )}
              {showWebinar && (
                <label className={`evp-item ${pick.webinar ? "on" : ""}`}>
                  <input type="checkbox" checked={pick.webinar} onChange={(e) => setPick({ ...pick, webinar: e.target.checked })} />
                  <span className="evp-ico"><Icon name="calendar" size={22} /></span>
                  <span className="evp-txt">
                    <b>וובינר חי: {WEBINAR_TITLE}</b>
                    <small>יום ראשון {wDate} ב-{WEBINAR_TIME} · בזום</small>
                  </span>
                  <span className="evp-check"><Icon name="check" size={16} /></span>
                </label>
              )}
            </div>
            {err && <p className="evp-err" role="alert">{err}</p>}
            <button className="btn btn-primary evp-cta" disabled={busy} onClick={submit}>{busy ? "רגע…" : "שריינו לי מקום"}</button>
            <button className="link-btn evp-later" onClick={close}>אולי אחר כך</button>
          </>
        ) : (
          <>
            <span className="evp-ok"><Icon name="check" size={28} /></span>
            <h2 id="evp-h" className="evp-title">המקום שלך שמור</h2>
            <div className="evp-list">
              {st.workshop && <p className="evp-line">📍 <b>הסדנה:</b> {WORKSHOP_GIFT.dateLabel}, {WORKSHOP_GIFT.time}, {WORKSHOP_GIFT.place}</p>}
              {st.webinar && <p className="evp-line">💻 <b>הוובינר:</b> יום ראשון {wDate} ב-{WEBINAR_TIME}. הקישור לזום יגיע אליך לפני.</p>}
            </div>
            <a className="btn btn-primary evp-cta" href={WEBINAR_WA_GROUP} target="_blank" rel="noopener noreferrer"><Icon name="chat" size={16} /> לקבוצת העדכונים בוואטסאפ</a>
            <button className="link-btn evp-later" onClick={close}>חזרה לפלטפורמה</button>
          </>
        )}
      </div>
    </div>
  );
}

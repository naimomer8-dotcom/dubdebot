"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import { WORKSHOP_GIFT } from "@/lib/liveEvents";
import { webinarLabel, WEBINAR_TIME, WEBINAR_TITLE, WEBINAR_WA_GROUP } from "@/lib/webinarDates";

type State = { workshop: boolean; webinar: boolean; waJoined: boolean; workshopOpen: boolean; webinarDate: string };
type Step = "events" | "done" | "wa" | null;
const DISMISS_KEY = "dd.evpop.dismiss";
const WA_SESSION_KEY = "dd.wapop.seen";

/** Records the click on the WhatsApp group link (so the group popup stops showing). */
export function trackWaJoin() {
  fetch("/api/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "wa_group_clicked" }), keepalive: true }).catch(() => {});
  try { localStorage.setItem("dd.wa.joined", "1"); } catch {}
}

/**
 * Member popups, in order:
 * 1. One-click seat in the sales workshop (gift) + the next live webinar (comes back until registered or closed twice).
 * 2. The WhatsApp updates group: after every registration, and on every visit (once per session) until they join.
 */
export default function EventsPopup() {
  const [st, setSt] = useState<State | null>(null);
  const [step, setStep] = useState<Step>(null);
  const [pick, setPick] = useState({ workshop: true, webinar: true });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let dismissed = 0, waSeen = false, waLocal = false;
    try { dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0); waSeen = sessionStorage.getItem(WA_SESSION_KEY) === "1"; waLocal = localStorage.getItem("dd.wa.joined") === "1"; } catch {}
    let alive = true;
    fetch("/api/registrations", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s: State | null) => {
        if (!alive || !s) return;
        const needWorkshop = s.workshopOpen && !s.workshop;
        const needEvents = (needWorkshop || !s.webinar) && dismissed < 2;
        const needWa = !s.waJoined && !waLocal && !waSeen;
        if (!needEvents && !needWa) return;
        setSt(s);
        setPick({ workshop: needWorkshop, webinar: !s.webinar });
        setTimeout(() => alive && setStep(needEvents ? "events" : "wa"), 1500);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!step) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  if (!step || !st) return null;

  const waPending = () => { let local = false; try { local = localStorage.getItem("dd.wa.joined") === "1"; } catch {} return !st.waJoined && !local; };
  const close = () => {
    if (step === "events") {
      try { localStorage.setItem(DISMISS_KEY, String(Number(localStorage.getItem(DISMISS_KEY) || 0) + 1)); } catch {}
      if (waPending()) return setStep("wa");
    }
    if (step === "done" && waPending()) return setStep("wa");
    if (step === "wa") { try { sessionStorage.setItem(WA_SESSION_KEY, "1"); } catch {} }
    setStep(null);
  };
  const join = () => { trackWaJoin(); setSt({ ...st, waJoined: true }); setStep(null); };
  const submit = async () => {
    const items = (["workshop", "webinar"] as const).filter((k) => pick[k]);
    if (!items.length) return setErr("סמנו לפחות אירוע אחד");
    setBusy(true); setErr("");
    const r = await fetch("/api/registrations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) }).catch(() => null);
    setBusy(false);
    if (!r?.ok) return setErr("לא הצלחנו לשמור. נסו שוב.");
    setSt(await r.json());
    setStep("done");
  };

  const showWorkshop = st.workshopOpen && !st.workshop;
  const showWebinar = !st.webinar;
  const wDate = webinarLabel(st.webinarDate);

  return (
    <div className="evp-wrap" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="evp" role="dialog" aria-modal="true" aria-labelledby="evp-h">
        <button className="icon-btn evp-x" onClick={close} aria-label="סגירה"><Icon name="close" size={18} /></button>
        {step === "events" && (
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
        )}
        {(step === "done" || step === "wa") && (
          <>
            {step === "done" ? (
              <>
                <span className="evp-ok"><Icon name="check" size={28} /></span>
                <h2 id="evp-h" className="evp-title">המקום שלך שמור</h2>
                <div className="evp-list">
                  {st.workshop && <p className="evp-line">📍 <b>הסדנה:</b> {WORKSHOP_GIFT.dateLabel}, {WORKSHOP_GIFT.time}, {WORKSHOP_GIFT.place}</p>}
                  {st.webinar && <p className="evp-line">💻 <b>הוובינר:</b> יום ראשון {wDate} ב-{WEBINAR_TIME}. הקישור לזום יגיע אליך לפני.</p>}
                </div>
                <div className="evp-wa-box">
                  <b>עוד צעד אחד: הצטרפו לקבוצת הוואטסאפ</b>
                  <small>שם יוצאים הקישורים, התזכורות והחומרים. קבוצה שקטה, רק עדכונים.</small>
                </div>
              </>
            ) : (
              <>
                <span className="evp-ok evp-ok-wa"><Icon name="chat" size={28} /></span>
                <h2 id="evp-h" className="evp-title">הצטרפו לקבוצת העדכונים</h2>
                <p className="evp-sub" style={{ textAlign: "center" }}>קישורים לזום, תזכורות לוובינר ולסדנה, וחומרים מניר. קבוצה שקטה, רק עדכונים.</p>
              </>
            )}
            <a className="btn btn-primary evp-cta evp-wa" href={WEBINAR_WA_GROUP} target="_blank" rel="noopener noreferrer" onClick={join}><Icon name="chat" size={18} /> להצטרפות לקבוצה בוואטסאפ</a>
            <button className="link-btn evp-later" onClick={close}>{step === "done" ? "אחר כך" : "לא עכשיו"}</button>
          </>
        )}
      </div>
    </div>
  );
}

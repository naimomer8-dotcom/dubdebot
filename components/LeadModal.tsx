"use client";

import { useEffect, useState } from "react";
import Mascot from "./Mascot";
import NirPhoto from "./NirPhoto";
import NirPose from "./NirPose";
import Icon from "./Icon";

export type MeetingType = "advisor" | "nir";
const SLOTS = ["בהקדם", "בוקר", "צהריים", "ערב"];

export default function LeadModal({
  initialType,
  user,
  conversationId,
  trigger,
  onClose,
  onSubmitted,
}: {
  initialType: MeetingType;
  user: { fullName: string; phone: string; email: string };
  conversationId: string | null;
  trigger: string | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [type, setType] = useState<MeetingType>(initialType);
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone);
  const [slot, setSlot] = useState("בהקדם");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    const res = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingType: type, fullName, phone, email: user.email, preferredTime: slot, note, conversationId, trigger }),
    }).catch(() => null);
    setLoading(false);
    if (!res || !res.ok) {
      const data = res ? await res.json().catch(() => ({})) : {};
      setErrors(data.errors ?? { form: data.error ?? "אין חיבור כרגע. נסה שוב." });
      return;
    }
    setDone(true);
    onSubmitted();
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="תיאום פגישה" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="icon-btn x-btn" onClick={onClose} aria-label="סגירה"><Icon name="close" size={18} /></button>
        {done ? (
          <div className="done-view">
            <div className="vision-photo"><NirPose pose={type === "nir" ? "thanks" : "celebrate"} width={type === "nir" ? 120 : 230} /><Mascot size={56} mood="celebrate" track={false} /></div>
            <h3 style={{ marginTop: 10 }}>סגרנו.</h3>
            <p className="sub">
              {type === "nir" ? "הצוות של ניר יחזור אליך לתאם את הפגישה איתו." : "אחד היועצים שלנו יחזור אליך לתאם פגישת אסטרטגיה."} הוא כבר
              מקבל את הסיכום של השיחה שלנו, אז לא תצטרך להתחיל מההתחלה.
            </p>
            <button className="btn btn-primary" onClick={onClose}>חזרה לשיחה</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 8 }}>
              {type === "nir" ? <NirPhoto size={62} /> : <Mascot size={58} mood="wink" />}
              <div>
                <span className="eyebrow">{type === "nir" ? "פגישה עם ניר דובדבני" : "פגישת אסטרטגיה"}</span>
                <h3>בוא נשב על זה.</h3>
              </div>
            </div>
            <p className="sub">משאירים פרטים, ואנחנו חוזרים אליך לתאם. הסיכום של השיחה כבר מגיע אלינו, לא תתחיל מאפס.</p>
            <form onSubmit={submit}>
              <div className="choice">
                <button type="button" aria-pressed={type === "advisor"} onClick={() => setType("advisor")}>
                  <Icon name="layers" size={20} /><b>פגישה עם יועץ</b>
                  <span>אחד היועצים הבכירים של הקבוצה</span>
                </button>
                <button type="button" aria-pressed={type === "nir"} onClick={() => setType("nir")}>
                  <NirPhoto size={40} /><b>פגישה עם ניר</b>
                  <span>ניר דובדבני בעצמו</span>
                </button>
              </div>
              <div className="field">
                <label htmlFor="l-name">שם</label>
                <input id="l-name" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} aria-invalid={!!errors.fullName} />
                {errors.fullName && <span className="err">{errors.fullName}</span>}
              </div>
              <div className="field">
                <label htmlFor="l-phone">נייד</label>
                <input id="l-phone" className="input" dir="ltr" style={{ textAlign: "right" }} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone} />
                {errors.phone && <span className="err">{errors.phone}</span>}
              </div>
              <div className="field">
                <label>מתי נוח שנחזור?</label>
                <div className="seg">
                  {SLOTS.map((s) => (
                    <button type="button" key={s} aria-pressed={slot === s} onClick={() => setSlot(s)}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label htmlFor="l-note">משהו שחשוב שנדע? (לא חובה)</label>
                <textarea id="l-note" className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              {errors.form && <span className="err">{errors.form}</span>}
              <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>{loading ? "שולח…" : "תחזרו אליי"}</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

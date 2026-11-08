"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import Sidebar from "./Sidebar";
import Icon from "./Icon";
import GraphicStudio from "./GraphicStudio";
import type { ConvItem, ShellUser } from "@/lib/data";
import type { Campaign } from "@/app/api/rooms/campaign/route";

type Step = 1 | 2 | 3 | 4;
const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: "הקהל" },
  { n: 2, label: "הקופי" },
  { n: 3, label: "תסריט צילום" },
  { n: 4, label: "המודעה" },
];

export function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1600); }).catch(() => {})}>
      <Icon name={ok ? "check" : "copy"} size={15} /> {ok ? "הועתק" : "העתקה"}
    </button>
  );
}

export default function CampaignBuilder({ user, conversations, initial = null, initialStep = 1 }: { user: ShellUser; conversations: ConvItem[]; initial?: Campaign | null; initialStep?: Step }) {
  const [side, setSide] = useState(false);
  const [product, setProduct] = useState("");
  const [audience, setAudience] = useState("");
  const [offer, setOffer] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [c, setC] = useState<Campaign | null>(initial);
  const [step, setStep] = useState<Step>(initialStep);
  const top = useRef<HTMLDivElement>(null);

  async function build(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/rooms/campaign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product, audience, offer }) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setBusy(false);
    if (r?.status === 403) return void window.location.reload();
    if (!r?.ok || !j?.campaign) return setErr(j?.error ?? "משהו השתבש. נסו שוב.");
    setC(j.campaign); setStep(1);
    top.current?.scrollIntoView({ behavior: "smooth" });
  }
  const go = (n: Step) => { setStep(n); top.current?.scrollIntoView({ behavior: "smooth" }); };

  return (
    <div className="app home-app">
      <Sidebar active="home" conversations={conversations} user={user} open={side} onClose={() => setSide(false)} />
      <main className="main home-main">
        <div className="home room cmp" ref={top}>
          <header className="home-top">
            <button className="icon-btn mobile-only home-ibtn" onClick={() => setSide(true)} aria-label="תפריט"><Icon name="menu" size={19} /></button>
            <Link href="/rooms/marketing" className="room-back"><Icon name="arrow" size={18} /> חדר השיווק</Link>
          </header>
          <div className="room-head">
            <span className="room-ico room-ico-lg" aria-hidden="true"><Icon name="bolt" size={30} /></span>
            <div><h1>בונים קמפיין מאפס</h1><p>עונים על 3 שאלות, וניר בונה: קהל, 3 מודעות, תסריט לסרטון ומודעה גרפית להורדה.</p></div>
          </div>

          {!c ? (
            <form className="cmp-form" onSubmit={build}>
              <label className="cmp-field big">1. מה אתם מוכרים?<textarea className="input" rows={3} required value={product} onChange={(e) => setProduct(e.target.value)} placeholder="למשל: אימוני כושר אישיים לנשים אחרי לידה, בתל אביב" /></label>
              <label className="cmp-field big">2. מי הלקוח שאתם הכי רוצים? <small>(לא חובה)</small><textarea className="input" rows={2} value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="למשל: אמהות בנות 28 עד 40 שרוצות לחזור לעצמן" /></label>
              <label className="cmp-field big">3. יש מבצע או הצעה? <small>(לא חובה)</small><input className="input" value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="למשל: אימון ניסיון ראשון ב-49 ₪" /></label>
              {err && <p className="err" role="alert">{err}</p>}
              <button className="btn btn-primary btn-lg btn-block" disabled={busy || product.trim().length < 3}>
                {busy ? "ניר בונה את הקמפיין… (עד חצי דקה)" : <>בנו לי קמפיין <Icon name="arrow" size={18} /></>}
              </button>
            </form>
          ) : (
            <>
              <ol className="cmp-steps" aria-label="שלבי הקמפיין">
                {STEPS.map((s) => (
                  <li key={s.n}><button aria-current={step === s.n ? "step" : undefined} className={step === s.n ? "on" : step > s.n ? "done" : ""} onClick={() => go(s.n)}><span className="num">{s.n}</span>{s.label}</button></li>
                ))}
              </ol>

              {step === 1 && (
                <section className="cmp-card" aria-labelledby="cb1">
                  <h2 id="cb1">מי הלקוח שלכם</h2>
                  <p className="cmp-lead">{c.audience.who}</p>
                  <p><b>הזווית של הקמפיין:</b> {c.audience.angle}</p>
                  <div className="cmp-cols">
                    <div><h3>מה כואב לו</h3><ul>{c.audience.pains.map((x) => <li key={x}>{x}</li>)}</ul></div>
                    <div><h3>מה הוא רוצה</h3><ul>{c.audience.desires.map((x) => <li key={x}>{x}</li>)}</ul></div>
                    <div><h3>מה הוא יגיד לפני שיקנה</h3><ul>{c.audience.objections.map((x) => <li key={x}>{x}</li>)}</ul></div>
                  </div>
                  <h3>למי לפרסם במטא</h3>
                  <div className="cmp-tags">{c.audience.targeting.map((t) => <span key={t}>{t}</span>)}</div>
                </section>
              )}
              {step === 2 && (
                <section className="cmp-card" aria-labelledby="cb2">
                  <h2 id="cb2">3 מודעות מוכנות</h2>
                  {c.ads.map((a, i) => {
                    const text = `${a.hook}\n\n${a.body}\n\n${a.cta}`;
                    return (
                      <article key={i} className="cmp-ad">
                        <div className="cmp-ad-head"><span className="crs-tag">{a.name}</span><CopyBtn text={text} /></div>
                        <b>{a.hook}</b>
                        <p>{a.body}</p>
                        <p className="cmp-cta">👉 {a.cta}</p>
                      </article>
                    );
                  })}
                </section>
              )}
              {step === 3 && (
                <section className="cmp-card" aria-labelledby="cb3">
                  <div className="cmp-ad-head"><h2 id="cb3">{c.script.title}</h2><CopyBtn text={c.script.shots.map((s) => `${s.t} שנ׳: ${s.say} (כיתוב: ${s.text})`).join("\n")} /></div>
                  <p className="room-hint">ריל של 30 שניות. מצלמים בטלפון, לאורך.</p>
                  <ol className="cmp-shots">
                    {c.script.shots.map((s, i) => (
                      <li key={i}>
                        <span className="cmp-t num">{s.t}</span>
                        <div><p><b>רואים:</b> {s.see}</p><p><b>אומרים:</b> "{s.say}"</p><p><b>כיתוב על המסך:</b> {s.text}</p></div>
                      </li>
                    ))}
                  </ol>
                  <p className="notice"><Icon name="spark" size={16} /> {c.script.tip}</p>
                </section>
              )}
              {step === 4 && (
                <section className="cmp-card" aria-labelledby="cb4">
                  <h2 id="cb4">המודעה הגרפית</h2>
                  <GraphicStudio initial={{ headline: c.ads[0]?.headline, sub: c.ads[0]?.sub, cta: "לפרטים ←" }} ads={c.ads.map((a) => ({ name: a.name, content: { headline: a.headline, sub: a.sub } }))} />
                </section>
              )}

              <div className="cmp-nav">
                {step > 1 && <button className="btn btn-ghost btn-lg" onClick={() => go((step - 1) as Step)}>הקודם</button>}
                {step < 4 ? (
                  <button className="btn btn-primary btn-lg" onClick={() => go((step + 1) as Step)}>הבא: {STEPS[step].label} <Icon name="arrow" size={18} /></button>
                ) : (
                  <button className="btn btn-glass btn-lg" onClick={() => { setC(null); setStep(1); }}>קמפיין חדש</button>
                )}
              </div>
              <p className="room-hint">הקמפיין נשמר אוטומטית ב<Link href="/vault">תיק העסקי</Link> שלך.</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

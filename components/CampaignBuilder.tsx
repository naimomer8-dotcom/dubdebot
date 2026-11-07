"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import Icon from "./Icon";
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

/* ── Creative: drawn in the browser on a canvas, no image API ── */
type Look = "bold" | "clean" | "photo";
const LOOKS: { id: Look; label: string }[] = [
  { id: "bold", label: "כהה ובולט" },
  { id: "clean", label: "בהיר ונקי" },
  { id: "photo", label: "עם תמונה שלכם" },
];

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > max && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function draw(cv: HTMLCanvasElement, o: { look: Look; headline: string; sub: string; cta: string; brand: string; color: string; photo: HTMLImageElement | null }) {
  const W = 1080, H = 1350;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  const dark = o.look !== "clean";
  if (o.look === "photo" && o.photo) {
    const s = Math.max(W / o.photo.width, H / o.photo.height);
    const w = o.photo.width * s, h = o.photo.height * s;
    ctx.drawImage(o.photo, (W - w) / 2, (H - h) / 2, w, h);
    const g = ctx.createLinearGradient(0, H, 0, H * 0.25);
    g.addColorStop(0, "rgba(8,8,10,.96)"); g.addColorStop(0.55, "rgba(8,8,10,.7)"); g.addColorStop(1, "rgba(8,8,10,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = dark ? "#0b0b0d" : "#f6f1e7";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = o.color;
    ctx.globalAlpha = dark ? 0.16 : 0.12;
    ctx.beginPath(); ctx.arc(W * 0.18, H * 0.2, 420, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillRect(W - 90, 120, 12, 150);
  }
  const fg = dark ? "#f6f1e7" : "#141210";
  const pad = 90, maxW = W - pad * 2;
  // headline: largest size that fits in 4 lines
  let size = 128, lines: string[] = [];
  for (; size >= 64; size -= 6) {
    ctx.font = `800 ${size}px Assistant, sans-serif`;
    lines = wrap(ctx, o.headline, maxW);
    if (lines.length <= 4) break;
  }
  const lh = size * 1.08;
  const subSize = 46;
  const blockH = lines.length * lh + 30 + subSize * 1.3 * 2 + 160;
  let y = o.look === "photo" ? H - blockH - 60 : H * 0.36;
  ctx.fillStyle = fg;
  ctx.font = `800 ${size}px Assistant, sans-serif`;
  for (const l of lines) { y += lh; ctx.fillText(l, W - pad, y); }
  y += 30;
  ctx.font = `500 ${subSize}px Assistant, sans-serif`;
  ctx.fillStyle = dark ? "rgba(246,241,231,.82)" : "rgba(20,18,16,.75)";
  for (const l of wrap(ctx, o.sub, maxW).slice(0, 2)) { y += subSize * 1.3; ctx.fillText(l, W - pad, y); }
  // CTA pill
  y += 70;
  ctx.font = `800 44px Assistant, sans-serif`;
  const cw = Math.min(maxW, ctx.measureText(o.cta).width + 100);
  ctx.fillStyle = o.color;
  const x = W - pad - cw, r = 46;
  ctx.beginPath(); ctx.roundRect(x, y, cw, 92, r); ctx.fill();
  ctx.fillStyle = "#141210";
  ctx.textAlign = "center";
  ctx.fillText(o.cta, x + cw / 2, y + 61);
  // brand line
  ctx.textAlign = "right";
  ctx.font = `700 36px Assistant, sans-serif`;
  ctx.fillStyle = dark ? "rgba(246,241,231,.7)" : "rgba(20,18,16,.6)";
  if (o.brand) ctx.fillText(o.brand, W - pad, 90);
}

function Creative({ c }: { c: Campaign }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ad, setAd] = useState(0);
  const [look, setLook] = useState<Look>("bold");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("#e2c68e");
  const [headline, setHeadline] = useState(c.ads[0]?.headline ?? "");
  const [sub, setSub] = useState(c.ads[0]?.sub ?? "");
  const [cta, setCta] = useState("לפרטים ←");
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);

  useEffect(() => { setHeadline(c.ads[ad]?.headline ?? ""); setSub(c.ads[ad]?.sub ?? ""); }, [ad, c]);
  useEffect(() => {
    let off = false;
    document.fonts.load("800 80px Assistant").catch(() => {}).finally(() => {
      if (!off && ref.current) draw(ref.current, { look: look === "photo" && !photo ? "bold" : look, headline, sub, cta, brand, color, photo });
    });
    return () => { off = true; };
  }, [look, headline, sub, cta, brand, color, photo]);

  function onFile(f: File | undefined) {
    if (!f) return;
    const img = new Image();
    img.onload = () => { setPhoto(img); setLook("photo"); };
    img.src = URL.createObjectURL(f);
  }
  function download() {
    ref.current?.toBlob((b) => {
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = "מודעה.png";
      a.click();
    }, "image/png");
  }

  return (
    <div className="cmp-creative">
      <div className="cmp-canvas-wrap"><canvas ref={ref} className="cmp-canvas" aria-label="תצוגה מקדימה של המודעה" /></div>
      <div className="cmp-controls">
        <fieldset className="cmp-choice">
          <legend>איזו מודעה?</legend>
          {c.ads.map((a, i) => (
            <button key={i} type="button" aria-pressed={ad === i} onClick={() => setAd(i)}>{a.name}</button>
          ))}
        </fieldset>
        <fieldset className="cmp-choice">
          <legend>איזה סגנון?</legend>
          {LOOKS.map((l) => (
            <button key={l.id} type="button" aria-pressed={look === l.id} onClick={() => setLook(l.id)}>{l.label}</button>
          ))}
        </fieldset>
        {look === "photo" && (
          <label className="cmp-file">
            <Icon name="image" size={18} /> {photo ? "להחליף תמונה" : "להעלות תמונה (שלכם או של המוצר)"}
            <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
        )}
        <label className="cmp-field">כותרת<input className="input" value={headline} onChange={(e) => setHeadline(e.target.value)} /></label>
        <label className="cmp-field">שורת משנה<input className="input" value={sub} onChange={(e) => setSub(e.target.value)} /></label>
        <div className="cmp-two">
          <label className="cmp-field">כפתור<input className="input" value={cta} onChange={(e) => setCta(e.target.value)} /></label>
          <label className="cmp-field">צבע<input type="color" className="cmp-color" value={color} onChange={(e) => setColor(e.target.value)} /></label>
        </div>
        <label className="cmp-field">שם העסק (למעלה)<input className="input" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="לא חובה" /></label>
        <button className="btn btn-primary btn-lg btn-block" onClick={download}><Icon name="download" size={18} /> הורדת המודעה</button>
        <p className="room-hint">גודל 1080 על 1350, מתאים לפיד של פייסבוק ואינסטגרם.</p>
      </div>
    </div>
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
                  <Creative c={c} />
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

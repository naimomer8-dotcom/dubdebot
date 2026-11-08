"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

/* Graphics drawn in the browser on a canvas. No image API: styles, sizes and fonts are code. */

export type StyleId = "bold" | "clean" | "photo" | "quote" | "offer" | "tips" | "event" | "split";
export const STYLES: { id: StyleId; label: string; hint: string }[] = [
  { id: "bold", label: "כהה ובולט", hint: "כותרת גדולה על רקע כהה" },
  { id: "clean", label: "בהיר ונקי", hint: "רקע שמנת, טקסט כהה" },
  { id: "photo", label: "תמונה", hint: "התמונה שלכם עם כותרת" },
  { id: "quote", label: "ציטוט", hint: "משפט אחד חזק" },
  { id: "offer", label: "מבצע", hint: "מחיר או מספר גדול" },
  { id: "tips", label: "3 טיפים", hint: "רשימה ממוספרת" },
  { id: "event", label: "אירוע", hint: "תאריך, שם ומקום" },
  { id: "split", label: "לפני / אחרי", hint: "שני מצבים זה מול זה" },
];
export const SIZES = [
  { id: "post", label: "פוסט", w: 1080, h: 1350 },
  { id: "story", label: "סטורי", w: 1080, h: 1920 },
  { id: "square", label: "ריבוע", w: 1080, h: 1080 },
] as const;
export const FONTS = [
  { id: "Assistant", label: "נקי", weight: 800 },
  { id: "Rubik", label: "עגול", weight: 800 },
  { id: "Secular One", label: "חזק", weight: 400 },
  { id: "Frank Ruhl Libre", label: "קלאסי", weight: 900 },
] as const;
export const PALETTE = ["#e2c68e", "#ff6b6b", "#4dd4ac", "#5b8cff", "#ffb84d", "#c77dff", "#ffffff"];

export type Content = { headline: string; sub: string; cta: string; big: string; lines: string; brand: string };
type Opts = Content & { style: StyleId; size: (typeof SIZES)[number]["id"]; font: (typeof FONTS)[number]["id"]; color: string; photo: HTMLImageElement | null };

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number) {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const w of para.split(/\s+/).filter(Boolean)) {
      const t = line ? `${line} ${w}` : w;
      if (ctx.measureText(t).width > max && line) { out.push(line); line = w; } else line = t;
    }
    if (line) out.push(line);
  }
  return out;
}

/** Biggest font size (step 4) at which the text fits in maxLines. */
function fit(ctx: CanvasRenderingContext2D, text: string, font: (s: number) => string, max: number, maxLines: number, from: number, to: number) {
  let s = from, lines: string[] = [];
  for (; s >= to; s -= 4) { ctx.font = font(s); lines = wrap(ctx, text, max); if (lines.length <= maxLines) break; }
  return { size: s, lines };
}

const isLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 160;
};

export function drawGraphic(cv: HTMLCanvasElement, o: Opts) {
  const sz = SIZES.find((s) => s.id === o.size)!;
  const W = sz.w, H = sz.h;
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d")!;
  const F = FONTS.find((f) => f.id === o.font)!;
  const head = (s: number) => `${F.weight} ${s}px "${F.id}", Assistant, sans-serif`;
  const body = (s: number, w = 500) => `${w} ${s}px Assistant, sans-serif`;
  ctx.direction = "rtl"; ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
  const pad = 90, R = W - pad, maxW = W - pad * 2;
  const style = o.style === "photo" && !o.photo ? "bold" : o.style;
  const light = style === "clean";
  const bg = light ? "#f6f1e7" : "#0b0b0d", fg = light ? "#141210" : "#f6f1e7", soft = light ? "rgba(20,18,16,.72)" : "rgba(246,241,231,.8)";
  const onAccent = isLight(o.color) ? "#141210" : "#ffffff";
  const topY = o.size === "story" ? 220 : 110;

  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const lines = (arr: string[], size: number, lh: number, y: number, color: string, font: string, x = R) => {
    ctx.font = font; ctx.fillStyle = color;
    for (const l of arr) { y += size * lh; ctx.fillText(l, x, y); }
    return y;
  };
  const pill = (text: string, y: number, align: "right" | "center" = "right") => {
    if (!text) return y;
    ctx.font = body(44, 800);
    const w = Math.min(maxW, ctx.measureText(text).width + 100);
    const x = align === "center" ? (W - w) / 2 : R - w;
    ctx.fillStyle = o.color; ctx.beginPath(); ctx.roundRect(x, y, w, 92, 46); ctx.fill();
    ctx.fillStyle = onAccent; ctx.textAlign = "center"; ctx.fillText(text, x + w / 2, y + 61); ctx.textAlign = "right";
    return y + 92;
  };
  const brand = () => {
    if (!o.brand) return;
    ctx.font = body(36, 700); ctx.fillStyle = soft; ctx.textAlign = "right"; ctx.fillText(o.brand, R, topY - 20);
  };

  if (style === "bold" || style === "clean" || style === "photo") {
    if (style === "photo" && o.photo) {
      const s = Math.max(W / o.photo.width, H / o.photo.height);
      ctx.drawImage(o.photo, (W - o.photo.width * s) / 2, (H - o.photo.height * s) / 2, o.photo.width * s, o.photo.height * s);
      const g = ctx.createLinearGradient(0, H, 0, H * 0.3);
      g.addColorStop(0, "rgba(8,8,10,.95)"); g.addColorStop(0.6, "rgba(8,8,10,.65)"); g.addColorStop(1, "rgba(8,8,10,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    } else {
      ctx.globalAlpha = light ? 0.14 : 0.18; ctx.fillStyle = o.color;
      ctx.beginPath(); ctx.arc(W * 0.15, H * 0.18, W * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = o.color; ctx.fillRect(R, topY + 30, 12, 150);
    }
    const h = fit(ctx, o.headline, head, maxW, 4, 132, 64);
    ctx.font = body(46); const sub = wrap(ctx, o.sub, maxW).slice(0, 3);
    const block = h.lines.length * h.size * 1.1 + sub.length * 60 + 30 + (o.cta ? 160 : 0);
    let y = style === "photo" ? H - block - 110 : Math.max(topY + 200, (H - block) / 2);
    y = lines(h.lines, h.size, 1.1, y, style === "photo" ? "#f6f1e7" : fg, head(h.size));
    y = lines(sub, 46, 1.3, y + 20, style === "photo" ? "rgba(246,241,231,.85)" : soft, body(46));
    pill(o.cta, y + 60);
    brand();
  } else if (style === "quote") {
    ctx.fillStyle = o.color; ctx.font = `900 420px "Frank Ruhl Libre", serif`; ctx.textAlign = "center";
    ctx.globalAlpha = 0.9; ctx.fillText("”", W / 2, topY + 380); ctx.globalAlpha = 1;
    const h = fit(ctx, o.headline, head, maxW, 6, 96, 54);
    ctx.textAlign = "center";
    let y = Math.max(topY + 380, (H - h.lines.length * h.size * 1.25) / 2);
    ctx.font = head(h.size); ctx.fillStyle = fg;
    for (const l of h.lines) { y += h.size * 1.25; ctx.fillText(l, W / 2, y); }
    ctx.fillStyle = o.color; ctx.fillRect(W / 2 - 60, y + 50, 120, 6);
    if (o.sub) { ctx.font = body(44, 700); ctx.fillStyle = soft; ctx.fillText(o.sub, W / 2, y + 130); }
    if (o.brand) { ctx.font = body(34, 600); ctx.fillStyle = soft; ctx.fillText(o.brand, W / 2, H - 90); }
    ctx.textAlign = "right";
  } else if (style === "offer") {
    const h = fit(ctx, o.headline, head, maxW, 3, 104, 56);
    let y = lines(h.lines, h.size, 1.1, topY + 60, fg, head(h.size));
    const r = Math.min(W * 0.33, (H - y - 420) / 2);
    const cy = y + 60 + r;
    ctx.fillStyle = o.color; ctx.beginPath(); ctx.arc(W / 2, cy, r, 0, Math.PI * 2); ctx.fill();
    const bf = fit(ctx, o.big || "?", head, r * 1.6, 1, 260, 60);
    ctx.font = head(bf.size); ctx.fillStyle = onAccent; ctx.textAlign = "center"; ctx.direction = "ltr";
    ctx.fillText(o.big, W / 2, cy + bf.size * 0.35); ctx.direction = "rtl"; ctx.textAlign = "right";
    ctx.font = body(46); y = lines(wrap(ctx, o.sub, maxW).slice(0, 2), 46, 1.3, cy + r + 30, soft, body(46));
    pill(o.cta, y + 50, "center");
    brand();
  } else if (style === "tips") {
    const h = fit(ctx, o.headline, head, maxW, 3, 104, 56);
    let y = lines(h.lines, h.size, 1.1, topY + 60, fg, head(h.size)) + 50;
    const items = o.lines.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 5);
    for (let i = 0; i < items.length; i++) {
      ctx.fillStyle = o.color; ctx.beginPath(); ctx.arc(R - 40, y + 44, 40, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = onAccent; ctx.font = body(44, 800); ctx.textAlign = "center"; ctx.fillText(String(i + 1), R - 40, y + 60); ctx.textAlign = "right";
      ctx.font = body(48, 600); const wl = wrap(ctx, items[i], maxW - 120).slice(0, 2);
      lines(wl, 48, 1.25, y - 4, fg, body(48, 600), R - 110);
      y += Math.max(110, wl.length * 60 + 50);
    }
    pill(o.cta, Math.min(y + 20, H - 200));
    brand();
  } else if (style === "event") {
    ctx.fillStyle = o.color; ctx.fillRect(0, 0, W, H * 0.42);
    ctx.textAlign = "center"; ctx.direction = "ltr";
    const bf = fit(ctx, o.big || "15.11", head, maxW, 1, 300, 80);
    ctx.font = head(bf.size); ctx.fillStyle = onAccent; ctx.fillText(o.big, W / 2, H * 0.21 + bf.size * 0.35);
    ctx.direction = "rtl";
    if (o.brand) { ctx.font = body(36, 700); ctx.fillText(o.brand, W / 2, topY - 20); }
    const h = fit(ctx, o.headline, head, maxW, 3, 110, 56);
    ctx.font = head(h.size); ctx.fillStyle = fg;
    let y = H * 0.42 + 60;
    for (const l of h.lines) { y += h.size * 1.12; ctx.fillText(l, W / 2, y); }
    ctx.font = body(46); ctx.fillStyle = soft;
    for (const l of wrap(ctx, o.sub, maxW).slice(0, 3)) { y += 60; ctx.fillText(l, W / 2, y); }
    ctx.textAlign = "right";
    pill(o.cta, y + 70, "center");
  } else if (style === "split") {
    const [before = "", after = ""] = o.lines.split("\n").map((s) => s.trim());
    const mid = H / 2 + 60;
    ctx.fillStyle = "#1c1c20"; ctx.fillRect(0, 0, W, mid);
    ctx.fillStyle = o.color; ctx.fillRect(0, mid, W, H - mid);
    const h = fit(ctx, o.headline, head, maxW, 2, 96, 52);
    lines(h.lines, h.size, 1.1, topY, "#f6f1e7", head(h.size));
    const tag = (t: string, y: number, c: string, tc: string) => { ctx.font = body(38, 800); const w = ctx.measureText(t).width + 50; ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(R - w, y, w, 64, 32); ctx.fill(); ctx.fillStyle = tc; ctx.fillText(t, R - 25, y + 45); };
    tag("לפני", mid - 330, "rgba(255,255,255,.14)", "#f6f1e7");
    ctx.font = body(54, 700); lines(wrap(ctx, before, maxW).slice(0, 3), 54, 1.25, mid - 250, "rgba(246,241,231,.85)", body(54, 700));
    tag("אחרי", mid + 60, onAccent === "#ffffff" ? "rgba(255,255,255,.22)" : "rgba(20,18,16,.14)", onAccent);
    ctx.font = head(64); lines(wrap(ctx, after, maxW).slice(0, 3), 64, 1.2, mid + 140, onAccent, head(64));
    if (o.cta) { ctx.font = body(42, 800); ctx.fillStyle = onAccent; ctx.fillText(o.cta, R, H - 90); }
    if (o.brand) { ctx.font = body(34, 700); ctx.fillStyle = onAccent; ctx.textAlign = "left"; ctx.fillText(o.brand, pad, H - 90); ctx.textAlign = "right"; }
  }
}

const FIELDS: Record<StyleId, { big?: string; lines?: string; sub: string; headline: string }> = {
  bold: { headline: "כותרת", sub: "שורת משנה" },
  clean: { headline: "כותרת", sub: "שורת משנה" },
  photo: { headline: "כותרת", sub: "שורת משנה" },
  quote: { headline: "הציטוט", sub: "של מי הציטוט" },
  offer: { headline: "כותרת", sub: "פרטים קצרים", big: "המספר הגדול (מחיר, אחוז)" },
  tips: { headline: "כותרת", sub: "", lines: "הטיפים, אחד בכל שורה" },
  event: { headline: "שם האירוע", sub: "מקום ושעה", big: "תאריך" },
  split: { headline: "כותרת", sub: "", lines: "שורה 1: לפני. שורה 2: אחרי" },
};

export const SAMPLE: Content = {
  headline: "העסק שלך יכול להרוויח יותר", sub: "בלי לעבוד יותר שעות", cta: "לפרטים ←", big: "49 ₪", brand: "",
  lines: "תמחרו לפי ערך, לא לפי שעה\nתנו ללקוח סיבה לחזור\nבדקו את המספרים כל שבוע",
};

/** The full editor: style, size, font, color, photo, texts, and a download button. */
export default function GraphicStudio({ initial, ads }: { initial?: Partial<Content>; ads?: { name: string; content: Partial<Content> }[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [c, setC] = useState<Content>({ ...SAMPLE, ...initial });
  const [style, setStyle] = useState<StyleId>("bold");
  const [size, setSize] = useState<Opts["size"]>("post");
  const [font, setFont] = useState<Opts["font"]>("Assistant");
  const [color, setColor] = useState(PALETTE[0]);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [aiTopic, setAiTopic] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState("");

  useEffect(() => {
    if (document.getElementById("gs-fonts")) return;
    const l = document.createElement("link");
    l.id = "gs-fonts"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Rubik:wght@500;800&family=Secular+One&family=Frank+Ruhl+Libre:wght@700;900&display=swap";
    document.head.appendChild(l);
  }, []);

  useEffect(() => {
    let off = false;
    const f = FONTS.find((x) => x.id === font)!;
    Promise.all([document.fonts.load(`${f.weight} 80px "${f.id}"`), document.fonts.load(`800 40px Assistant`), document.fonts.load(`900 80px "Frank Ruhl Libre"`)]).catch(() => {}).finally(() => {
      if (!off && ref.current) drawGraphic(ref.current, { ...c, style, size, font, color, photo });
    });
    return () => { off = true; };
  }, [c, style, size, font, color, photo]);

  const set = (k: keyof Content) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setC((x) => ({ ...x, [k]: e.target.value }));
  function onFile(f: File | undefined) {
    if (!f) return;
    const img = new Image();
    img.onload = () => { setPhoto(img); setStyle("photo"); };
    img.src = URL.createObjectURL(f);
  }
  function download() {
    ref.current?.toBlob((b) => {
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b); a.download = `גרפיקה-${STYLES.find((s) => s.id === style)?.label}.png`; a.click();
    }, "image/png");
  }
  async function aiWrite() {
    setAiBusy(true); setAiErr("");
    const r = await fetch("/api/rooms/gen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool: "graphic", fields: { topic: aiTopic, style: STYLES.find((s) => s.id === style)?.label ?? "" } }) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setAiBusy(false);
    if (!r?.ok || !j?.result) return setAiErr(j?.error ?? "לא הצלחנו. נסו שוב.");
    const g = j.result as Content & { lines: string[] | string };
    setC((x) => ({ ...x, headline: g.headline || x.headline, sub: g.sub ?? x.sub, cta: g.cta || x.cta, big: g.big || x.big, lines: Array.isArray(g.lines) ? g.lines.join("\n") : g.lines || x.lines }));
  }

  const fl = FIELDS[style];
  return (
    <div className="gs">
      <div className={`gs-preview gs-${size}`}><canvas ref={ref} aria-label="תצוגה מקדימה של הגרפיקה" /></div>
      <div className="gs-controls">
        <fieldset className="gs-styles">
          <legend>1. בוחרים סגנון</legend>
          <div className="gs-style-grid">
            {STYLES.map((s) => (
              <button key={s.id} type="button" aria-pressed={style === s.id} onClick={() => setStyle(s.id)}>
                <b>{s.label}</b><small>{s.hint}</small>
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="cmp-choice">
          <legend>2. גודל</legend>
          {SIZES.map((s) => <button key={s.id} type="button" aria-pressed={size === s.id} onClick={() => setSize(s.id)}>{s.label}</button>)}
        </fieldset>

        <div className="gs-ai">
          <label className="cmp-field">3. ניר כותב לך את הטקסט <small>(לא חובה)</small>
            <span className="room-ask-row">
              <input className="input" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="על מה הגרפיקה? למשל: מבצע חנוכה על עוגות" />
              <button className="btn btn-primary" type="button" disabled={aiBusy || aiTopic.trim().length < 3} onClick={aiWrite}>{aiBusy ? "כותב…" : <><Icon name="spark" size={16} /> כתוב</>}</button>
            </span>
          </label>
          {aiErr && <p className="err" role="alert">{aiErr}</p>}
          {ads && ads.length > 0 && (
            <div className="cmp-choice"><span className="gs-mini">או לקחת טקסט מהמודעות:</span>{ads.map((a) => <button key={a.name} type="button" onClick={() => setC((x) => ({ ...x, ...a.content }))}>{a.name}</button>)}</div>
          )}
        </div>

        <label className="cmp-field">{fl.headline}<textarea className="input" rows={2} value={c.headline} onChange={set("headline")} /></label>
        {fl.big && <label className="cmp-field">{fl.big}<input className="input" value={c.big} onChange={set("big")} /></label>}
        {fl.lines && <label className="cmp-field">{fl.lines}<textarea className="input" rows={4} value={c.lines} onChange={set("lines")} /></label>}
        {fl.sub && <label className="cmp-field">{fl.sub}<input className="input" value={c.sub} onChange={set("sub")} /></label>}
        <div className="cmp-two">
          <label className="cmp-field">כפתור / קריאה לפעולה<input className="input" value={c.cta} onChange={set("cta")} /></label>
          <label className="cmp-field">שם העסק<input className="input" value={c.brand} onChange={set("brand")} placeholder="לא חובה" /></label>
        </div>
        {(style === "photo" || photo) && (
          <label className="cmp-file">
            <Icon name="image" size={18} /> {photo ? "להחליף תמונה" : "להעלות תמונה (שלכם או של המוצר)"}
            <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
        )}

        <fieldset className="cmp-choice">
          <legend>צבע</legend>
          {PALETTE.map((p) => <button key={p} type="button" className="gs-swatch" style={{ background: p }} aria-pressed={color === p} aria-label={`צבע ${p}`} onClick={() => setColor(p)} />)}
          <input type="color" className="gs-swatch gs-custom" value={color} onChange={(e) => setColor(e.target.value)} aria-label="צבע אחר" />
        </fieldset>
        <fieldset className="cmp-choice">
          <legend>פונט</legend>
          {FONTS.map((f) => <button key={f.id} type="button" aria-pressed={font === f.id} style={{ fontFamily: `"${f.id}", Assistant` }} onClick={() => setFont(f.id)}>{f.label}</button>)}
        </fieldset>

        <button className="btn btn-primary btn-lg btn-block" onClick={download}><Icon name="download" size={18} /> הורדת הגרפיקה</button>
        <p className="room-hint">PNG באיכות מלאה. אפשר להחליף סגנון בכל רגע, הטקסט נשאר.</p>
      </div>
    </div>
  );
}

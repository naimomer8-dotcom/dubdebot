"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import Icon from "./Icon";
import { askNir } from "./Rooms";
import { CopyBtn } from "./CampaignBuilder";
import type { ConvItem, ShellUser } from "@/lib/data";
import { ROOM_TOOLS, type ToolId } from "@/lib/roomTools";
import type { SalesScript, SocialWeek } from "@/app/api/rooms/gen/route";


const nis = (n: number) => `${Math.round(n).toLocaleString("he-IL")} ₪`;
const pct = (n: number) => `${(Math.round(n * 10) / 10).toLocaleString("he-IL")}%`;
const num = (s: string) => { const v = Number(String(s).replace(/[^\d.]/g, "")); return Number.isFinite(v) ? v : 0; };

function Field({ label, hint, value, onChange, suffix, area, placeholder }: { label: string; hint?: string; value: string; onChange: (v: string) => void; suffix?: string; area?: boolean; placeholder?: string }) {
  return (
    <label className="cmp-field big">
      {label} {hint && <small>{hint}</small>}
      {area ? (
        <textarea className="input" rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <span className="rt-num">
          <input className="input" inputMode={suffix ? "decimal" : undefined} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
          {suffix && <em>{suffix}</em>}
        </span>
      )}
    </label>
  );
}

function useGen<T>(tool: string) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<T | null>(null);
  async function run(fields: Record<string, string>) {
    setBusy(true); setErr("");
    const r = await fetch("/api/rooms/gen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool, fields }) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setBusy(false);
    if (r?.status === 403) return void window.location.reload();
    if (!r?.ok || !j?.result) return setErr(j?.error ?? "משהו השתבש. נסו שוב.");
    setRes(j.result as T);
    window.scrollTo({ top: 0 });
    document.querySelector(".home-main")?.scrollTo({ top: 0, behavior: "smooth" });
  }
  return { busy, err, res, setRes, run };
}

const Saved = () => <p className="room-hint">נשמר אוטומטית ב<Link href="/vault">תיק העסקי</Link> שלך.</p>;

/* ── Sales: call script ── */
function SalesScriptTool() {
  const [product, setProduct] = useState("");
  const [customer, setCustomer] = useState("");
  const [price, setPrice] = useState("");
  const g = useGen<SalesScript>("sales_script");
  if (g.res) {
    const r = g.res;
    const all = [`פתיחה: ${r.opening}`, `שאלות: ${r.discovery.join(" | ")}`, `הצגה: ${r.pitch}`, `סגירה: ${r.close}`, ...r.objections.map((o) => `"${o.q}": ${o.a}`)].join("\n\n");
    return (
      <>
        <section className="cmp-card">
          <div className="cmp-ad-head"><h2>התסריט שלך</h2><CopyBtn text={all} /></div>
          <ol className="rt-flow">
            <li><b>1. פתיחה</b><p>"{r.opening}"</p></li>
            <li><b>2. שאלות בירור</b><ul>{r.discovery.map((q) => <li key={q}>{q}</li>)}</ul><p className="room-hint">מקשיבים יותר ממדברים. רושמים מה הלקוח אומר.</p></li>
            <li><b>3. הצגת הפתרון</b><p>{r.pitch}</p></li>
            <li><b>4. סגירה</b><p>"{r.close}"</p></li>
          </ol>
        </section>
        <section className="cmp-card">
          <h2>כשהלקוח אומר…</h2>
          {r.objections.map((o) => (
            <details key={o.q} className="rt-obj"><summary>"{o.q}"</summary><p>{o.a}</p></details>
          ))}
          <p className="notice"><Icon name="spark" size={16} /> {r.tip}</p>
        </section>
        <div className="cmp-nav">
          <button className="btn btn-primary btn-lg" onClick={() => askNir(`ניר, בוא נתרגל שיחת מכירה. אתה הלקוח שמתעניין ב: ${product}. תעלה התנגדויות אחת אחרי השנייה, ואחרי כל תשובה שלי תגיד לי מה היה טוב ומה לשפר.`)}><Icon name="mic" size={18} /> לתרגל עם ניר</button>
          <button className="btn btn-ghost btn-lg" onClick={() => g.setRes(null)}>תסריט חדש</button>
        </div>
        <Saved />
      </>
    );
  }
  return (
    <form className="cmp-form" onSubmit={(e) => { e.preventDefault(); g.run({ product, customer, price }); }}>
      <Field label="1. מה אתם מוכרים?" area value={product} onChange={setProduct} placeholder="למשל: ליווי משכנתא מלא לזוגות צעירים" />
      <Field label="2. למי אתם מתקשרים?" hint="(לא חובה)" area value={customer} onChange={setCustomer} placeholder="למשל: ליד שהשאיר פרטים בפייסבוק" />
      <Field label="3. מה המחיר?" hint="(לא חובה)" value={price} onChange={setPrice} placeholder="למשל: 4,500 ₪" />
      {g.err && <p className="err" role="alert">{g.err}</p>}
      <button className="btn btn-primary btn-lg btn-block" disabled={g.busy || product.trim().length < 3}>{g.busy ? "ניר כותב את התסריט…" : <>תכתוב לי תסריט <Icon name="arrow" size={18} /></>}</button>
    </form>
  );
}

/* ── Social: week plan ── */
function SocialWeekTool() {
  const [business, setBusiness] = useState("");
  const [audience, setAudience] = useState("");
  const [goal, setGoal] = useState("");
  const g = useGen<SocialWeek>("social_week");
  if (g.res) {
    const r = g.res;
    return (
      <>
        <section className="cmp-card">
          <div className="cmp-ad-head"><h2>השבוע שלך</h2><CopyBtn text={r.days.map((d) => `${d.day} (${d.format}): ${d.topic}\n${d.hook}\n${d.cta}`).join("\n\n")} /></div>
          <ol className="rt-week">
            {r.days.map((d) => (
              <li key={d.day}>
                <div className="rt-day"><b>{d.day}</b><span className="crs-tag">{d.format}</span></div>
                <p className="rt-topic">{d.topic}</p>
                <p>"{d.hook}"</p>
                <p className="cmp-cta">👉 {d.cta}</p>
              </li>
            ))}
          </ol>
          <p className="notice"><Icon name="spark" size={16} /> {r.tip}</p>
        </section>
        <div className="cmp-nav">
          <Link className="btn btn-primary btn-lg" href="/rooms/social#story"><Icon name="image" size={18} /> לסטורי של היום</Link>
          <button className="btn btn-ghost btn-lg" onClick={() => g.setRes(null)}>שבוע חדש</button>
        </div>
        <Saved />
      </>
    );
  }
  return (
    <form className="cmp-form" onSubmit={(e) => { e.preventDefault(); g.run({ business, audience, goal }); }}>
      <Field label="1. מה העסק שלכם?" area value={business} onChange={setBusiness} placeholder="למשל: קונדיטוריה ביתית בראשון לציון" />
      <Field label="2. מי הלקוחות?" hint="(לא חובה)" area value={audience} onChange={setAudience} placeholder="למשל: אמהות שמזמינות עוגות לימי הולדת" />
      <Field label="3. מה המטרה השבוע?" hint="(לא חובה)" value={goal} onChange={setGoal} placeholder="למשל: הזמנות לחנוכה" />
      {g.err && <p className="err" role="alert">{g.err}</p>}
      <button className="btn btn-primary btn-lg btn-block" disabled={g.busy || business.trim().length < 3}>{g.busy ? "ניר בונה את השבוע…" : <>תבנה לי שבוע <Icon name="arrow" size={18} /></>}</button>
    </form>
  );
}

function Results({ rows, verdict, good }: { rows: [string, string, boolean?][]; verdict: string; good: boolean }) {
  return (
    <section className="cmp-card rt-results" aria-live="polite">
      <p className={`rt-verdict ${good ? "ok" : "bad"}`}>{verdict}</p>
      <dl>{rows.map(([k, v, hi]) => <div key={k} className={hi ? "hi" : ""}><dt>{k}</dt><dd className="num" dir="ltr">{v}</dd></div>)}</dl>
    </section>
  );
}

/* ── Real estate: deal check (all math in the browser) ── */
function DealCalc() {
  const [price, setPrice] = useState("1800000");
  const [extra, setExtra] = useState("120000");
  const [equity, setEquity] = useState("950000");
  const [rent, setRent] = useState("5200");
  const [exp, setExp] = useState("400");
  const [rate, setRate] = useState("5");
  const [years, setYears] = useState("25");
  const c = useMemo(() => {
    const P = num(price), X = num(extra), E = num(equity), R = num(rent), M = num(exp), y = num(years) || 25;
    const loan = Math.max(0, P + X - E);
    const r = num(rate) / 100 / 12, n = y * 12;
    const pmt = loan === 0 ? 0 : r === 0 ? loan / n : (loan * r) / (1 - Math.pow(1 + r, -n));
    const flow = R - M - pmt;
    return { loan, pmt, flow, gross: P ? (R * 12 / P) * 100 : 0, net: P + X ? ((R - M) * 12 / (P + X)) * 100 : 0, coc: E ? (flow * 12 / E) * 100 : 0, ltv: P ? (loan / P) * 100 : 0 };
  }, [price, extra, equity, rent, exp, rate, years]);
  const verdict = c.flow >= 0 ? `הדירה מחזיקה את עצמה: נשארים ${nis(c.flow)} בחודש אחרי המשכנתא.` : `תצטרכו להשלים ${nis(-c.flow)} בחודש מהכיס.`;
  return (
    <>
      <Results good={c.flow >= 0} verdict={verdict} rows={[
        ["החזר משכנתא חודשי", nis(c.pmt)], ["תזרים חודשי", nis(c.flow), true], ["תשואה ברוטו", pct(c.gross)], ["תשואה נטו", pct(c.net)], ["תשואה על ההון שלכם", pct(c.coc)], ["סכום המשכנתא", nis(c.loan)],
      ]} />
      {c.ltv > 50 && <p className="notice"><Icon name="shield" size={16} /> המשכנתא היא {pct(c.ltv)} ממחיר הדירה. לדירה להשקעה הבנקים מממנים בדרך כלל עד 50%, אז כנראה תצטרכו יותר הון עצמי.</p>}
      <form className="cmp-form" onSubmit={(e) => e.preventDefault()}>
        <Field label="מחיר הדירה" value={price} onChange={setPrice} suffix="₪" />
        <Field label="עלויות נוספות" hint="(מס רכישה, עו״ד, תיווך, שיפוץ)" value={extra} onChange={setExtra} suffix="₪" />
        <Field label="הון עצמי" value={equity} onChange={setEquity} suffix="₪" />
        <Field label="שכירות חודשית" value={rent} onChange={setRent} suffix="₪" />
        <Field label="הוצאות חודשיות" hint="(ועד, ביטוח, תחזוקה)" value={exp} onChange={setExp} suffix="₪" />
        <div className="cmp-two rt-two">
          <Field label="ריבית שנתית" value={rate} onChange={setRate} suffix="%" />
          <Field label="שנים" value={years} onChange={setYears} />
        </div>
      </form>
      <button className="btn btn-primary btn-lg btn-block" onClick={() => askNir(`ניר, תבדוק איתי עסקת נדל״ן: מחיר ${nis(num(price))}, עלויות נוספות ${nis(num(extra))}, הון עצמי ${nis(num(equity))}, שכירות ${nis(num(rent))} בחודש, הוצאות ${nis(num(exp))}, ריבית ${rate}% ל-${years} שנים. יצא לי החזר ${nis(c.pmt)}, תזרים ${nis(c.flow)} ותשואה נטו ${pct(c.net)}. זו עסקה טובה? מה הסיכונים ומה הייתי צריך לבדוק?`)}>
        <Icon name="chat" size={18} /> לשאול את ניר על העסקה
      </button>
      <p className="room-hint">החישוב הוא הערכה. לפני עסקה בודקים עם יועץ משכנתאות ועו״ד.</p>
    </>
  );
}

/* ── Money: how much to sell ── */
function TargetCalc() {
  const [net, setNet] = useState("25000");
  const [fixed, setFixed] = useState("8000");
  const [price, setPrice] = useState("1500");
  const [cost, setCost] = useState("300");
  const [tax, setTax] = useState("30");
  const [of10, setOf10] = useState("2");
  const close = String(num(of10) * 10);
  const c = useMemo(() => {
    const t = Math.min(90, num(tax)) / 100;
    const pre = num(net) / (1 - t);
    const unit = num(price) - num(cost);
    const sales = unit > 0 ? Math.ceil((num(fixed) + pre) / unit) : 0;
    const leads = num(close) > 0 ? Math.ceil(sales / (num(close) / 100)) : 0;
    return { pre, unit, sales, leads, revenue: sales * num(price), perDay: sales / 22 };
  }, [net, fixed, price, cost, tax, close]);
  const ok = c.unit > 0;
  return (
    <>
      <Results good={ok} verdict={ok ? `כדי שיישארו לך ${nis(num(net))} בחודש, צריך ${c.sales.toLocaleString("he-IL")} מכירות בחודש.` : "המחיר נמוך מהעלות. על כל מכירה אתם מפסידים, צריך לתקן מחיר או עלות."} rows={ok ? [
        ["מכירות בחודש", c.sales.toLocaleString("he-IL"), true], ["פניות שצריך בחודש", c.leads.toLocaleString("he-IL"), true], ["מחזור חודשי", nis(c.revenue)], ["רווח על כל מכירה", nis(c.unit)], ["מכירות ביום עבודה", (Math.round(c.perDay * 10) / 10).toLocaleString("he-IL")],
      ] : []} />
      <form className="cmp-form" onSubmit={(e) => e.preventDefault()}>
        <Field label="כמה אתם רוצים שיישאר לכם בחודש?" hint="(נטו, אחרי מס)" value={net} onChange={setNet} suffix="₪" />
        <Field label="הוצאות קבועות בחודש" hint="(שכירות, עובדים, תוכנות, שיווק)" value={fixed} onChange={setFixed} suffix="₪" />
        <Field label="מחיר למכירה" value={price} onChange={setPrice} suffix="₪" />
        <Field label="עלות לכל מכירה" hint="(חומרים, משלוח, עמלות)" value={cost} onChange={setCost} suffix="₪" />
        <div className="cmp-two rt-two">
          <Field label="מס בערך" value={tax} onChange={setTax} suffix="%" />
          <Field label="מכל 10 פניות, כמה קונים?" value={of10} onChange={setOf10} />
        </div>
      </form>
      <button className="btn btn-primary btn-lg btn-block" onClick={() => askNir(`ניר, אני רוצה שיישארו לי ${nis(num(net))} בחודש. הוצאות קבועות ${nis(num(fixed))}, מחיר למכירה ${nis(num(price))}, עלות למכירה ${nis(num(cost))}. יצא שאני צריך ${c.sales} מכירות ו-${c.leads} פניות בחודש. איך אני מגיע לזה, ומה עדיף: להעלות מחיר, להוריד עלויות או להביא יותר פניות?`)}>
        <Icon name="chat" size={18} /> ניר, איך מגיעים לזה?
      </button>
      <p className="room-hint">המס כאן הוא הערכה כללית. את המספר המדויק נותן רואה החשבון.</p>
    </>
  );
}

export default function RoomToolPage({ tool, user, conversations }: { tool: ToolId; user: ShellUser; conversations: ConvItem[] }) {
  const [side, setSide] = useState(false);
  const t = ROOM_TOOLS[tool];
  return (
    <div className="app home-app">
      <Sidebar active="home" conversations={conversations} user={user} open={side} onClose={() => setSide(false)} />
      <main className="main home-main">
        <div className="home room">
          <header className="home-top">
            <button className="icon-btn mobile-only home-ibtn" onClick={() => setSide(true)} aria-label="תפריט"><Icon name="menu" size={19} /></button>
            <Link href={`/rooms/${t.room}`} className="room-back"><Icon name="arrow" size={18} /> {t.roomTitle}</Link>
          </header>
          <div className="room-head">
            <span className="room-ico room-ico-lg" aria-hidden="true"><Icon name={t.icon} size={30} /></span>
            <div><h1>{t.title}</h1><p>{t.intro}</p></div>
          </div>
          {tool === "script" && <SalesScriptTool />}
          {tool === "week" && <SocialWeekTool />}
          {tool === "deal" && <DealCalc />}
          {tool === "target" && <TargetCalc />}
        </div>
      </main>
    </div>
  );
}

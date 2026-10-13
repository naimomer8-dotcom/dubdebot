"use client";

import Link from "next/link";
import { useState } from "react";
import Spotlight from "./Spotlight";
import Sidebar from "./Sidebar";
import Icon from "./Icon";
import ReferralCard from "./ReferralCard";
import { Brand } from "./BrandBar";
import { COURSES, PLANS, RENEWAL_MONTHLY, TIER_RANK, VAT, ils, priceOf, type Billing, type Offers, type Plan, type Tier } from "@/lib/plans";
import type { ConvItem, ShellUser } from "@/lib/data";

type Done = { status: "rep" | "provider_pending"; total: number; plan: string; via: "self" | "rep" };

const COMPARE: { label: string; on: Tier[] }[] = [
  { label: "Duvdevani Platform: ניר זמין 24/6 וכל הכלים", on: ["basic", "private", "upgrade", "pro"] },
  { label: "9 הקורסים הדיגיטליים של ניר", on: ["basic", "private", "upgrade", "pro"] },
  { label: "כל הספרים של ניר", on: ["basic", "private", "upgrade", "pro"] },
  { label: "כנס מינגלינג ענק אחת לרבעון", on: ["basic", "private", "upgrade", "pro"] },
  { label: "זום עם ניר פעם בשבועיים", on: ["basic", "private", "upgrade", "pro"] },
  { label: "פגישת הטמעה של 3 שעות עם יועץ עסקי בכיר", on: ["private", "pro"] },
  { label: "פגישה אישית עם ניר דובדבני", on: ["upgrade", "pro"] },
  { label: "פודקאסט אחד על אחד עם ניר", on: ["pro"] },
];

const FAQ = [
  { q: "מה ההבדל בין תשלום אחד ל-12 תשלומים?", a: "באותו מסלול מקבלים בדיוק את אותו דבר. בתשלום אחד המחיר נמוך יותר (Alpha Basic יוצא ₪229 לחודש במקום ₪299), וב-12 תשלומים מחלקים בכרטיס אשראי." },
  { q: "מה קורה אחרי השנה?", a: `המנוי ממשיך אוטומטית ב-${ils(RENEWAL_MONTHLY)} + מע״מ לחודש, בלי למלא פרטים או לסלוק מחדש. אפשר לבטל בכל רגע, והחיוב נעצר מהחודש הבא.` },
  { q: "אני עדיין בחודש המתנה. אם אקנה עכשיו אפסיד ימים?", a: "לא. השנה מתחילה רק בסוף 30 ימי המתנה, כך שכל יום שנשאר לך נשמר." },
  { q: "איך מקבלים את הקורסים?", a: "ברגע שהתשלום עובר, כל הקורסים נפתחים לך באופן אוטומטי במערכת הקורסים, עם אותו מייל שנרשמת איתו." },
  { q: "אפשר לשדרג בהמשך?", a: "כן. משלמים רק את ההפרש בין המסלולים, והשנה שלך ממשיכה מאותו תאריך." },
  { q: "המחירים כוללים מע״מ?", a: `המחירים מוצגים לפני מע״מ. בכל כרטיס מופיע גם הסכום הכולל עם ${Math.round(VAT * 100)}% מע״מ.` },
];

/** Every discount and benefit, so people see all of them in one place (live ones are highlighted). */
const DEALS = (offers: Offers, trial: boolean) => {
  const basicSave = priceOf("basic", "installments").net - priceOf("basic", "onetime").net;
  const proSave = priceOf("pro", "installments").net - priceOf("pro", "onetime").net;
  return [
    { tag: "תשלום אחד", title: `חיסכון של ${ils(basicSave)} בשנה`, text: "Alpha Basic בתשלום אחד יוצא ₪229 לחודש במקום ₪299.", live: true },
    { tag: "Alpha Pro", title: `${ils(priceOf("pro", "onetime").net)} בתשלום אחד`, text: `במקום ${ils(priceOf("pro", "installments").net)} ב-12 תשלומים. חיסכון של ${ils(proSave)}.`, live: true },
    { tag: "חודש המתנה", title: "Alpha Private בחצי מחיר", text: offers.privateHalf ? `₪295 במקום ₪590, בתוקף עד ${fmt(offers.privateHalf)}.` : "₪295 במקום ₪590 למי שמצטרף לפני שחודש המתנה נגמר.", live: !!offers.privateHalf || trial },
    { tag: "72 שעות", title: "12 תשלומים במחיר של תשלום אחד", text: offers.installmentsAtOnetime ? `₪229 לחודש במקום ₪299, בתוקף עד ${fmt(offers.installmentsAtOnetime)}.` : "הצעה שנפתחת לזמן קצר, נשלחת בוואטסאפ ובמייל.", live: !!offers.installmentsAtOnetime },
    { tag: "שדרוג", title: "משלמים רק את ההפרש", text: "עוברים למסלול גבוה יותר בכל רגע, והשנה ממשיכה מאותו תאריך.", live: false },
    { tag: "חבר מביא חבר", title: "סדנת מכירות פיזית עם ניר", text: "על כל חבר שהצטרף דרך הקישור שלך וסולק, מקבלים מקום בסדנת מכירות פיזית עם ניר דובדבני.", live: false },
    { tag: "שנה שנייה", title: `רק ${ils(RENEWAL_MONTHLY)} לחודש`, text: "אחרי השנה הראשונה הכל ממשיך במחיר סמלי, בלי לסלוק מחדש.", live: false },
  ];
};

const fmt = (iso: string) => new Date(iso).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });

export default function PlansClient({ user, conversations, focus, offers = {} }: { user: ShellUser | null; conversations: ConvItem[]; focus: string | null; offers?: Offers }) {
  const [billing, setBilling] = useState<Billing>("onetime");
  const [pick, setPick] = useState<Plan | null>(null);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState<"self" | "rep" | null>(null);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<Done | null>(null);
  const [side, setSide] = useState(false);
  const [faq, setFaq] = useState<number | null>(0);

  const [renewal, setRenewal] = useState(user?.access.renewalMode ?? "none");
  async function toggleRenewal() {
    const r = await fetch("/api/subscription", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: renewal === "cancelled" ? "resume" : "cancel" }) }).catch(() => null);
    if (r?.ok) setRenewal((await r.json()).renewalMode);
  }
  const owned: Tier | null = user?.access.plan === "paid" ? user.access.tier : null;
  const trial = !!user && user.access.plan !== "paid";

  const diff = (p: Plan) => {
    const t = priceOf(p.id, billing, offers);
    if (!owned) return t;
    const b = priceOf(owned, billing);
    const net = Math.round((t.net - b.net) * 100) / 100;
    const vat = Math.round(net * VAT * 100) / 100;
    return { ...t, net, vat, total: Math.round((net + vat) * 100) / 100 };
  };

  async function buy(via: "self" | "rep") {
    if (!pick) return;
    if (!user) { window.location.href = `/?plan=${pick.id}#register`; return; }
    if (!agree) { setErr("צריך לאשר את תנאי השימוש ותנאי החידוש."); return; }
    setBusy(via);
    setErr("");
    const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier: pick.id, billing, via }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(null);
    if (!r?.ok) { setErr(j.error ?? "משהו השתבש. נסה שוב."); return; }
    if (j.url) { window.location.href = j.url; return; }
    setDone({ status: j.status, total: j.total, plan: pick.name, via });
  }

  const content = (
    <div className="plans">
      <header className="plans-hero">
        <span className="eyebrow">מסלולים · Duvdevani Platform</span>
        <h1 className="h-display">שנה שלמה עם ניר. <span className="gold">אתה בוחר כמה עמוק.</span></h1>
        <p className="lead">כל המסלולים כוללים את הפלטפורמה, את כל הקורסים והספרים של ניר, כנס רבעוני וזום עם ניר פעם בשבועיים. ההבדל הוא כמה ליווי אישי אתה רוצה.</p>
        {trial && <p className="plans-note"><Icon name="clock" size={15} /> אתה בחודש המתנה ({user!.access.daysLeft} ימים נשארו). השנה מתחילה רק כשהמתנה נגמרת, אז לא מפסידים כלום.</p>}
        {owned && (
          <p className="plans-note">
            <Icon name="gem" size={15} /> המסלול שלך: <b>{PLANS.find((p) => p.id === owned)?.name}</b>, עד {new Date(user!.access.accessUntil).toLocaleDateString("he-IL")}. בשדרוג משלמים רק את ההפרש.
            <button className="link-btn" style={{ marginInlineStart: "auto" }} onClick={toggleRenewal}>{renewal === "cancelled" ? "החזרת החידוש החודשי" : "ביטול החידוש אחרי השנה"}</button>
          </p>
        )}
        {(offers.privateHalf || offers.installmentsAtOnetime) && (
          <div className="plans-offer">
            <Icon name="gem" size={16} />
            <div>
              {offers.privateHalf && <p><b>בונוס מצטרפים בחודש המתנה:</b> Alpha Private בחצי מחיר, ₪295 + מע״מ במקום ₪590. בתוקף עד {fmt(offers.privateHalf)}.</p>}
              {offers.installmentsAtOnetime && <p><b>הצעת 72 שעות:</b> 12 תשלומים במחיר של תשלום אחד, ₪229 לחודש + מע״מ במקום ₪299. בתוקף עד {fmt(offers.installmentsAtOnetime)}.</p>}
            </div>
          </div>
        )}
        <div className="bill-toggle" role="radiogroup" aria-label="אופן תשלום">
          <button role="radio" aria-checked={billing === "onetime"} className={billing === "onetime" ? "on" : ""} onClick={() => setBilling("onetime")}>תשלום אחד <small>הכי משתלם</small></button>
          <button role="radio" aria-checked={billing === "installments"} className={billing === "installments" ? "on" : ""} onClick={() => setBilling("installments")}>12 תשלומים</button>
        </div>
      </header>

      <section className="plan-grid" aria-label="המסלולים">
        {PLANS.map((p) => {
          const pr = priceOf(p.id, billing, offers);
          const reg = priceOf(p.id, billing);
          const mine = owned === p.id;
          const below = owned ? TIER_RANK[p.id] <= TIER_RANK[owned] : false;
          const d = diff(p);
          return (
            <article key={p.id} className={`plan-card ${p.highlight ? "hl" : ""} ${focus === p.id ? "focus" : ""} ${mine ? "mine" : ""}`}>
              {p.highlight && <span className="plan-badge">{p.highlight}</span>}
              <h2>{p.name}</h2>
              <p className="plan-tag">{p.tagline}</p>
              <div className="plan-price">
                {reg.net !== pr.net && <s className="num plan-was">{ils(reg.perMonthNet)}</s>}
                <b className="num">{ils(pr.perMonthNet)}</b>
                <span>לחודש · + מע״מ</span>
              </div>
              <p className="plan-total num">
                {billing === "onetime" ? "תשלום אחד" : "12 תשלומים"} · {ils(pr.net)} לשנה + מע״מ ({ils(pr.total)} כולל)
              </p>
              {(() => {
                const save = billing === "onetime" ? priceOf(p.id, "installments").net - pr.net : reg.net - pr.net;
                return save > 0 ? <p className="plan-save num"><Icon name="gem" size={13} /> {billing === "onetime" ? "חוסך" : "הנחה של"} {ils(save)} לעומת {billing === "onetime" ? "12 תשלומים" : "המחיר הרגיל"}</p> : null;
              })()}
              <ul className="plan-feats">
                {p.features.map((f) => <li key={f}><Icon name="check" size={15} /> {f}</li>)}
              </ul>
              {mine ? (
                <span className="btn btn-glass btn-block plan-cta" aria-disabled="true">המסלול שלך</span>
              ) : below ? (
                <span className="btn btn-ghost btn-block plan-cta" aria-disabled="true">כלול במסלול שלך</span>
              ) : (
                <button className="btn btn-primary btn-block plan-cta" onClick={() => { setPick(p); setErr(""); setAgree(false); }}>
                  {owned ? `שדרוג · +${ils(d.net)} + מע״מ` : `לבחירת ${p.name}`}
                </button>
              )}
            </article>
          );
        })}
      </section>

      <section className="plans-deals glass edge" aria-label="כל ההטבות וההנחות">
        <h3>כל ההטבות וההנחות</h3>
        <div className="deals-grid">
          {DEALS(offers, !!trial).map((d) => (
            <div key={d.title} className={`deal ${d.live ? "live" : ""}`}>
              <span className="deal-tag">{d.tag}</span>
              <b>{d.title}</b>
              <span>{d.text}</span>
            </div>
          ))}
        </div>
      </section>

      {user && <ReferralCard userId={user.id} firstName={user.firstName} />}

      <section className="plans-incl glass edge">
        <h3>מה כלול בכל מסלול</h3>
        <div className="incl-grid">
          <div><Icon name="layers" size={18} /><b>9 קורסים דיגיטליים</b><span>{COURSES.join(" · ")}</span></div>
          <div><Icon name="bookmark" size={18} /><b>כל הספרים של ניר</b><span>בגרסה דיגיטלית, נפתחים עם המנוי</span></div>
          <div><Icon name="user" size={18} /><b>כנס מינגלינג רבעוני</b><span>4 כנסים בשנה, מלא בעלי עסקים</span></div>
          <div><Icon name="phone" size={18} /><b>זום עם ניר פעם בשבועיים</b><span>שאלות, תשובות ואסטרטגיה לעסק שלך</span></div>
        </div>
        <p className="plans-renew"><Icon name="clock" size={15} /> אחרי השנה הראשונה המנוי ממשיך אוטומטית ב-{ils(RENEWAL_MONTHLY)} + מע״מ לחודש, בלי לסלוק מחדש. ביטול בכל רגע.</p>
      </section>

      <section className="plans-compare" aria-label="השוואת מסלולים">
        <h3>השוואה מלאה</h3>
        <div className="tbl">
          <table>
            <thead><tr><th scope="col">מה מקבלים</th>{PLANS.map((p) => <th key={p.id} scope="col">{p.name.replace("Alpha ", "")}</th>)}</tr></thead>
            <tbody>
              {COMPARE.map((r) => (
                <tr key={r.label}><th scope="row">{r.label}</th>{PLANS.map((p) => <td key={p.id}>{r.on.includes(p.id) ? <Icon name="check" size={16} className="gold-ico" /> : <span className="muted" aria-label="לא כלול">—</span>}</td>)}</tr>
              ))}
              <tr><th scope="row">מחיר לשנה + מע״מ</th>{PLANS.map((p) => <td key={p.id} className="num">{ils(priceOf(p.id, billing, offers).net)}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="plans-faq" aria-label="שאלות נפוצות">
        <h3>שאלות נפוצות</h3>
        {FAQ.map((f, i) => (
          <div key={f.q} className={`faq-item ${faq === i ? "open" : ""}`}>
            <button aria-expanded={faq === i} onClick={() => setFaq(faq === i ? null : i)}><span>{f.q}</span><Icon name="chevron" size={16} /></button>
            {faq === i && <p>{f.a}</p>}
          </div>
        ))}
        <p className="plans-rep">מעדיף לדבר עם בן אדם? <button className="link-btn" onClick={() => { setPick(PLANS[0]); setAgree(true); }}>נציג יחזור אליך</button> ויעזור לבחור.</p>
      </section>
    </div>
  );

  const modal = pick && (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={`רכישת ${pick.name}`} onClick={(e) => e.target === e.currentTarget && !busy && (setPick(null), setDone(null))}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <button className="icon-btn x-btn" onClick={() => { setPick(null); setDone(null); }} aria-label="סגירה"><Icon name="close" size={18} /></button>
        {done ? (
          <div className="buy-done">
            <span className="buy-ok"><Icon name="check" size={26} /></span>
            <h3>ההזמנה של {done.plan} נקלטה</h3>
            <p>{done.via === "rep" ? "נציג יחזור אליך תוך 24 שעות כדי להשלים את הרכישה." : "נציג ישלח לך תוך 24 שעות קישור תשלום מאובטח בוואטסאפ, וברגע שהתשלום עובר הכל נפתח לך אוטומטית."}</p>
            <p className="muted num">סכום: {ils(done.total, 2)} כולל מע״מ</p>
            <button className="btn btn-primary" onClick={() => { setPick(null); setDone(null); }}>מעולה</button>
          </div>
        ) : (
          <>
            <h3 style={{ marginTop: 0 }}>{owned ? `שדרוג ל-${pick.name}` : pick.name}</h3>
            <p className="sub">{pick.tagline}</p>
            <div className="bill-toggle sm" role="radiogroup" aria-label="אופן תשלום">
              <button role="radio" aria-checked={billing === "onetime"} className={billing === "onetime" ? "on" : ""} onClick={() => setBilling("onetime")}>תשלום אחד</button>
              <button role="radio" aria-checked={billing === "installments"} className={billing === "installments" ? "on" : ""} onClick={() => setBilling("installments")}>12 תשלומים</button>
            </div>
            {(() => {
              const d = diff(pick);
              return (
                <dl className="buy-sum num">
                  <div><dt>{owned ? "הפרש לשדרוג" : "מחיר לשנה"}</dt><dd>{ils(d.net, 2)}</dd></div>
                  <div><dt>מע״מ {Math.round(VAT * 100)}%</dt><dd>{ils(d.vat, 2)}</dd></div>
                  <div className="tot"><dt>סה״כ לתשלום</dt><dd>{ils(d.total, 2)}</dd></div>
                  {billing === "installments" && <div><dt>12 תשלומים של</dt><dd>{ils(Math.round((d.total / 12) * 100) / 100, 2)}</dd></div>}
                </dl>
              );
            })()}
            <p className="buy-renew"><Icon name="clock" size={14} /> {trial ? "השנה מתחילה בסוף חודש המתנה. " : ""}אחרי השנה: {ils(RENEWAL_MONTHLY)} + מע״מ לחודש אוטומטית, ביטול בכל רגע.</p>
            {user ? (
              <label className="buy-agree"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> קראתי ואני מסכים ל<Link href="/terms" target="_blank">תנאי השימוש</Link>, כולל החידוש החודשי אחרי השנה. ידוע לי שהתכנים נפתחים מיד ולכן <b>אין ביטולים</b> אחרי הסליקה.</label>
            ) : (
              <p className="buy-renew">כדי לרכוש צריך חשבון. ההרשמה לוקחת 20 שניות ונותנת 30 יום במתנה.</p>
            )}
            {err && <p className="err" role="alert">{err}</p>}
            <div className="buy-actions">
              <button className="btn btn-primary" disabled={!!busy} onClick={() => buy("self")}>{!user ? "להרשמה ורכישה" : busy === "self" ? "רגע…" : "להמשך רכישה"}</button>
              {user && <button className="btn btn-glass" disabled={!!busy} onClick={() => buy("rep")}>{busy === "rep" ? "רגע…" : "שנציג יחזור אליי"}</button>}
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (!user) {
    return (
      <>
        <Spotlight />
        <div className="xr">
          <header className="xr-top">
            <Brand sub={false} size={34} />
            <span />
            <Link href="/login" className="btn btn-glass btn-sm">כניסה</Link>
          </header>
          <main className="xr-stage" style={{ display: "block" }}>{content}</main>
        </div>
        {modal}
      </>
    );
  }

  return (
    <>
      <Spotlight />
      <div className="app">
        <Sidebar active="plans" conversations={conversations} user={user} open={side} onClose={() => setSide(false)} />
        <main className="main plans-main">
          <header className="topbar">
            <div className="who">
              <button className="icon-btn mobile-only" onClick={() => setSide(true)} aria-label="תפריט"><Icon name="menu" size={20} /></button>
              <Icon name="gem" size={22} className="gold-ico" />
              <div><b>מסלולים ומנוי</b><small>{owned ? "המנוי שלך ואפשרויות שדרוג" : "בחירת המסלול השנתי שלך"}</small></div>
            </div>
            <div className="topbar-actions"><Link className="btn btn-glass btn-sm" href="/chat"><Icon name="chat" size={16} /> לשיחה</Link></div>
          </header>
          <div className="plans-scroll">{content}</div>
        </main>
      </div>
      {modal}
    </>
  );
}

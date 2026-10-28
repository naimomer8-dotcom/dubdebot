"use client";

import Link from "next/link";
import { PERSONAS, REP_NAME, repWhatsApp } from "@/lib/platform";
import { useEffect, useState } from "react";
import { carried, ctaHref } from "@/lib/planPages";
import Spotlight from "./Spotlight";
import Sidebar from "./Sidebar";
import Icon from "./Icon";
import ReferralCard from "./ReferralCard";
import { Brand } from "./BrandBar";
import { WORKSHOP } from "@/lib/money";
import { BONUS_COURSE, BOOKS, COURSES, PLANS, REGULAR_MONTHLY, RENEWAL_MONTHLY, WORKSHOP_VALUE, TIER_RANK, VAT, ils, priceOf, type Billing, type Offers, type Plan, type Tier } from "@/lib/plans";
import type { ConvItem, ShellUser } from "@/lib/data";

type Done = { status: "rep" | "provider_pending"; total: number; plan: string; via: "self" | "rep" };

const COMPARE: { label: string; on: Tier[] }[] = [
  { label: "דובדבוט: ניר זמין 24/6 וכל הכלים", on: ["basic", "private", "upgrade", "pro"] },
  { label: `${COURSES.length} קורסים דיגיטליים + בונוס: ${BONUS_COURSE}`, on: ["basic", "private", "upgrade", "pro"] },
  { label: `${BOOKS.length} רבי המכר של ניר בדיגיטל`, on: ["basic", "private", "upgrade", "pro"] },
  { label: `סדנת "${WORKSHOP.name}", ${WORKSHOP.cadence} (4 בשנה)`, on: ["basic", "private", "upgrade", "pro"] },
  { label: "פגישה אסטרטגית חודשית בזום עם ניר", on: ["basic", "private", "upgrade", "pro"] },
  { label: "פגישת הטמעה של שעתיים וחצי עם יועץ עסקי בכיר", on: ["private", "pro"] },
  { label: "פגישה אישית עם ניר דובדבני", on: ["upgrade", "pro"] },
  { label: "פודקאסט אחד על אחד עם ניר", on: ["pro"] },
];

const FAQ = [
  { q: "מה ההבדל בין תשלום אחד ל-12 תשלומים?", a: "באותו מסלול מקבלים בדיוק את אותו דבר. בתשלום אחד המחיר נמוך יותר (Platform Basic יוצא ₪229 לחודש במקום ₪299), וב-12 תשלומים מחלקים בכרטיס אשראי." },
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
    { tag: "תשלום אחד", title: `חיסכון של ${ils(basicSave)} בשנה`, text: "Platform Basic בתשלום אחד יוצא ₪229 לחודש במקום ₪299.", live: true },
    { tag: "Platform Pro", title: `${ils(priceOf("pro", "onetime").net)} בתשלום אחד`, text: `במקום ${ils(priceOf("pro", "installments").net)} ב-12 תשלומים. חיסכון של ${ils(proSave)}.`, live: true },
    { tag: "חודש המתנה", title: "Platform Private בחצי מחיר", text: offers.privateHalf ? `₪295 במקום ₪590, בתוקף עד ${fmt(offers.privateHalf)}.` : "₪295 במקום ₪590 למי שמצטרף לפני שחודש המתנה נגמר.", live: !!offers.privateHalf || trial },
    { tag: "72 שעות", title: "12 תשלומים במחיר של תשלום אחד", text: offers.installmentsAtOnetime ? `₪229 לחודש במקום ₪299, בתוקף עד ${fmt(offers.installmentsAtOnetime)}.` : "הצעה שנפתחת לזמן קצר, נשלחת בוואטסאפ ובמייל.", live: !!offers.installmentsAtOnetime },
    { tag: "שדרוג", title: "משלמים רק את ההפרש", text: "עוברים למסלול גבוה יותר בכל רגע, והשנה ממשיכה מאותו תאריך.", live: false },
    { tag: "חבר מביא חבר", title: `מקום בסדנה "${WORKSHOP.name}"`, text: `על כל חבר שהצטרף דרך הקישור שלך וסולק, מקבלים מקום נוסף בסדנה "${WORKSHOP.name}" עם ניר דובדבני.`, live: false },
    { tag: "שנה שנייה", title: `רק ${ils(RENEWAL_MONTHLY)} לחודש`, text: "אחרי השנה הראשונה הכל ממשיך במחיר סמלי, בלי לסלוק מחדש.", live: false },
  ];
};

const fmt = (iso: string) => new Date(iso).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });

export default function PlansClient({ user, conversations, focus, offers = {}, autoBuy = false, initialBilling = "onetime" }: { user: ShellUser | null; conversations: ConvItem[]; focus: string | null; offers?: Offers; autoBuy?: boolean; initialBilling?: Billing }) {
  const [billing, setBilling] = useState<Billing>(initialBilling);
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

  // arrived from a plan page (/plans/<id>): open that plan's checkout right away
  useEffect(() => {
    if (!autoBuy || !focus) return;
    const p = PLANS.find((x) => x.id === focus);
    if (!p) return;
    if (owned && TIER_RANK[p.id] <= TIER_RANK[owned]) return;
    setPick(p);
    setAgree(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function buy(via: "self" | "rep") {
    if (!pick) return;
    if (!user) { window.location.href = ctaHref(pick.id, billing, false, carried(new URLSearchParams(window.location.search))); return; }
    if (!agree) { setErr("צריך לאשר את תנאי השימוש ותנאי החידוש."); return; }
    setBusy(via);
    setErr("");
    const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier: pick.id, billing, via, utm: carried(new URLSearchParams(window.location.search)) }) }).catch(() => null);
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
        <p className="lead">כל המסלולים כוללים את הפלטפורמה להצלחה בעסקים: דובדבוט 24/6, הקורסים הדיגיטליים והספרים של ניר, הסדנה "להעיר את הכסף שבך" פעם ברבעון ופגישה אסטרטגית חודשית בזום עם ניר. ההבדל הוא כמה ליווי אישי אתה רוצה.</p>
        <div className="plans-anchor" role="note">
          <span className="pa-tag">מחיר השקה</span>
          <span>מחיר רגיל <s className="num">{ils(REGULAR_MONTHLY)}</s> לחודש</span>
          <b className="num">עכשיו מ-{ils(priceOf("basic", "onetime").perMonthNet)} לחודש</b>
          <small>מנוי שנתי* · + מע״מ</small>
        </div>
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
              {offers.privateHalf && <p><b>בונוס מצטרפים בחודש המתנה:</b> Platform Private בחצי מחיר, ₪295 + מע״מ במקום ₪590. בתוקף עד {fmt(offers.privateHalf)}.</p>}
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
              <span className="plan-persona">{PERSONAS[p.id]}</span>
              <h2>{p.name}</h2>
              <p className="plan-tag">{p.tagline}</p>
              <div className="plan-price">
                {reg.net !== pr.net ? <s className="num plan-was">{ils(reg.perMonthNet)}</s> : !p.flat && <s className="num plan-was" title="מחיר רגיל">{ils(REGULAR_MONTHLY + p.extra / 12)}</s>}
                <b className="num">{ils(pr.perMonthNet)}</b>
                <span>לחודש · + מע״מ</span>
              </div>
              <p className="plan-total num">
                מנוי שנתי* · {billing === "onetime" ? "תשלום אחד" : "12 תשלומים"} · {ils(pr.net)} לשנה + מע״מ ({ils(pr.total)} כולל)
              </p>
              {(() => {
                const save = billing === "onetime" ? priceOf(p.id, "installments").net - pr.net : reg.net - pr.net;
                return save > 0 ? <p className="plan-save num"><Icon name="gem" size={13} /> {billing === "onetime" ? "חוסך" : "הנחה של"} {ils(save)} לעומת {billing === "onetime" ? "12 תשלומים" : "המחיר הרגיל"}</p> : null;
              })()}
              <ul className="plan-feats">
                {p.features.map((f) => <li key={f}><Icon name="check" size={15} /> {f}</li>)}
              </ul>
              <Link className="plan-more" href={`/plans/${p.id}`}>כל הפרטים על {p.name} <Icon name="arrowLeft" size={14} className="ico-move" /></Link>
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
          <div><Icon name="layers" size={18} /><b>{COURSES.length} קורסים דיגיטליים + בונוס</b><span>{COURSES.join(" · ")} · בונוס: {BONUS_COURSE}</span></div>
          <div><Icon name="bookmark" size={18} /><b>{BOOKS.length} רבי המכר של ניר</b><span>{BOOKS.join(" · ")}</span></div>
          <div><Icon name="user" size={18} /><b>סדנת &quot;{WORKSHOP.name}&quot;</b><span>{WORKSHOP.subtitle} · {WORKSHOP.cadence}, {WORKSHOP.hours} שעות בכיתה עם ניר · {WORKSHOP.topics.slice(0, 3).join(" · ")}</span></div>
          <div><Icon name="phone" size={18} /><b>פגישה אסטרטגית חודשית בזום</b><span>ניר על מנועי צמיחה, ואחר כך שאלות ותשובות. שולחים שאלה 24 שעות לפני, וניר עונה עליה בזום</span></div>
        </div>
        <div className="plans-value">
          <h4>מה זה שווה, במחיר רגיל</h4>
          <div className="pv-row"><span>הפלטפורמה ודובדבוט, 12 חודשים × {ils(REGULAR_MONTHLY)}</span><b className="num">{ils(REGULAR_MONTHLY * 12)}</b></div>
          <div className="pv-row"><span>4 מפגשי סדנה &quot;{WORKSHOP.name}&quot; של 4 שעות × {ils(WORKSHOP_VALUE)}</span><b className="num">{ils(WORKSHOP_VALUE * 4)}</b></div>
          <div className="pv-row"><span>12 פגישות אסטרטגיות בזום עם ניר</span><b>כלול</b></div>
          <div className="pv-row"><span>{COURSES.length} קורסים דיגיטליים, בונוס ו-{BOOKS.length} ספרים</span><b>כלול</b></div>
          <div className="pv-row pv-total"><span>שווי לפחות</span><b className="num">{ils(REGULAR_MONTHLY * 12 + WORKSHOP_VALUE * 4)}</b></div>
          <div className="pv-row pv-you"><span>אתה משלם במחיר השקה, מנוי שנתי בתשלום אחד, לא כולל מע״מ</span><b className="num">{ils(priceOf("basic", "onetime").net)}</b></div>
          <a className="pv-more" href="/platform">ההסבר המלא על הפלטפורמה ←</a>
        </div>
        <p className="plans-renew"><Icon name="clock" size={15} /> * מנוי שנתי: משלמים פעם אחת לשנה (או ב-12 תשלומים). דובדבוט זמין 24/6, כי בשבת אנחנו נחים ומתמקדים במשפחה. אחרי השנה הראשונה המנוי ממשיך אוטומטית ב-{ils(RENEWAL_MONTHLY)} + מע״מ לחודש, בלי לסלוק מחדש. ביטול בכל רגע.</p>
      </section>

      <section className="plans-compare" aria-label="השוואת מסלולים">
        <h3>השוואה מלאה</h3>
        <div className="tbl">
          <table>
            <thead><tr><th scope="col">מה מקבלים</th>{PLANS.map((p) => <th key={p.id} scope="col">{p.name.replace("Platform ", "")}</th>)}</tr></thead>
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
        <p className="plans-rep">מעדיף לדבר עם בן אדם? <a className="link-btn" href={repWhatsApp()} target="_blank" rel="noreferrer">וואטסאפ ל{REP_NAME} לתיאום שיחה מהירה</a>, או <button className="link-btn" onClick={() => { setPick(PLANS[0]); setAgree(true); }}>שנציג יחזור אליך</button>.</p>
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
            <div className="buy-actions">
              <a className="btn btn-glass" href={repWhatsApp(done.plan)} target="_blank" rel="noreferrer">לא רוצה לחכות? וואטסאפ ל{REP_NAME}</a>
              <button className="btn btn-primary" onClick={() => { setPick(null); setDone(null); }}>מעולה</button>
            </div>
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
            <p className="buy-renew" style={{ textAlign: "center" }}><a className="link-btn" href={repWhatsApp(pick.name)} target="_blank" rel="noreferrer">או וואטסאפ ישיר ל{REP_NAME} לתיאום שיחה מהירה</a></p>
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

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Spotlight from "./Spotlight";
import Icon, { type IconName } from "./Icon";
import AiCore from "./AiCore";
import NirPhoto from "./NirPhoto";
import { Brand, GroupLogo } from "./BrandBar";
import { BONUS_COURSE, BOOKS, COURSES, PLANS, REGULAR_MONTHLY, RENEWAL_MONTHLY, TIER_RANK, WORKSHOP_VALUE, VAT, ils, planById, priceOf, type Billing, type Offers, type Tier } from "@/lib/plans";
import { PERSONAS, SHABBAT_NOTE } from "@/lib/platform";
import { WORKSHOP } from "@/lib/money";
import { COMMON_FAQ, PLAN_PAGES, ctaHref } from "@/lib/planPages";
import { DISCLAIMER_LONG } from "@/lib/disclaimer";

const BASE_ITEMS: { icon: IconName; t: string; d: string }[] = [
  { icon: "spark", t: "דובדבוט 24/6", d: "ניר בגרסה דיגיטלית: תחזית, תוכנית עבודה, תסריט מכירה, ניתוח דוחות ועוד, על העסק שלך. בשבת נחים." },
  { icon: "layers", t: `${COURSES.length} קורסים + בונוס`, d: `${COURSES.slice(0, 4).join(" · ")} ועוד. בונוס: ${BONUS_COURSE}.` },
  { icon: "bookmark", t: `${BOOKS.length} רבי המכר של ניר`, d: BOOKS.join(" · ") },
  { icon: "coin", t: `הסדנה "${WORKSHOP.name}"`, d: `${WORKSHOP.subtitle}. ${WORKSHOP.perYear} מפגשים בשנה, ${WORKSHOP.cadence}, ${WORKSHOP.hours} שעות פנים מול פנים עם ניר.` },
  { icon: "calendar", t: "זום חודשי עם ניר", d: "פגישה אסטרטגית: מנועי צמיחה, ואחר כך שאלות ותשובות. שולחים שאלה מראש וניר עונה עליה." },
  { icon: "vault", t: "התיק העסקי שלך", d: "כל התוצרים, המשימות והמספרים נשמרים במקום אחד, ודובדבוט זוכר את העסק." },
];

export default function PlanLanding({ tier, signedIn, firstName, owned, offers, passParams }: { tier: Tier; signedIn: boolean; firstName: string | null; owned: Tier | null; offers: Offers; passParams: Record<string, string> }) {
  const plan = planById(tier)!;
  const page = PLAN_PAGES[tier];
  const [billing, setBilling] = useState<Billing>("onetime");
  const [faq, setFaq] = useState<number | null>(0);
  const [stuck, setStuck] = useState(false);
  const pr = priceOf(tier, billing, offers);
  const other = priceOf(tier, billing === "onetime" ? "installments" : "onetime", offers);
  const regularMonthly = plan.flat ? null : REGULAR_MONTHLY + plan.extra / 12;
  const included = owned ? TIER_RANK[tier] <= TIER_RANK[owned] : false;
  const href = ctaHref(tier, billing, signedIn, passParams);
  const ctaLabel = included ? "כלול במסלול שלך" : owned ? `שדרוג ל-${plan.name}` : `להצטרף ל-${plan.name}`;
  const giftHref = `/?${new URLSearchParams(passParams).toString()}#signup`;

  // sticky mobile CTA shows once the hero CTA scrolls away
  useEffect(() => {
    const el = document.getElementById("hero-cta");
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting), { rootMargin: "0px 0px -40px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Cta = ({ id, block = false }: { id?: string; block?: boolean }) =>
    included ? (
      <Link id={id} className={`btn btn-glass btn-lg ${block ? "btn-block" : ""}`} href="/chat">{ctaLabel} · לפלטפורמה</Link>
    ) : (
      <a id={id} className={`btn btn-primary btn-lg ${block ? "btn-block" : ""}`} href={href}>{ctaLabel} <Icon name="arrowLeft" size={18} className="ico-move" /></a>
    );

  return (
    <>
      <Spotlight />
      <div className="page pl">
        <nav className="topnav scrolled">
          <div className="topnav-in">
            <Brand href={signedIn ? "/chat" : "/"} />
            <div className="topnav-links">
              {PLANS.map((p) => (
                <Link key={p.id} href={`/plans/${p.id}`} aria-current={p.id === tier ? "page" : undefined} className={p.id === tier ? "on" : ""}>{p.name.replace("Platform ", "")}</Link>
              ))}
            </div>
            <div className="topnav-end">
              <GroupLogo className="group-logo nav-logo" />
              <Link className="btn btn-glass btn-sm" href="/plans">כל המסלולים</Link>
            </div>
          </div>
        </nav>

        {/* ---------- hero ---------- */}
        <header className="wrap pl-hero">
          <div className="pl-hero-copy">
            <span className="badge"><Icon name="gem" size={14} /> {page.eyebrow} · {PERSONAS[tier]}</span>
            <h1 className="h-display">{page.title} <span className="gold">{page.gold}</span></h1>
            <p className="lead">{page.promise}</p>
            <div className="pl-price-chip">
              {regularMonthly && <s className="num">{ils(regularMonthly)}</s>}
              <b className="num">{ils(priceOf(tier, "onetime", offers).perMonthNet)}</b>
              <span>לחודש · מנוי שנתי בתשלום אחד · לא כולל מע״מ</span>
            </div>
            <div className="pl-hero-cta">
              <Cta id="hero-cta" />
              {!signedIn && <a className="btn btn-ghost" href={giftHref}>או 30 יום במתנה, בלי כרטיס</a>}
            </div>
            <ul className="pl-proof">
              <li><b className="num">22</b><span>שנה של ליווי עסקים</span></li>
              <li><b className="num">23,000+</b><span>עסקים עברו את השיטה</span></li>
              <li><b className="num">24/6</b><span>דובדבוט זמין לך</span></li>
            </ul>
          </div>
          <div className="pl-hero-art" aria-hidden="true">
            <div className="pl-orb"><AiCore size={220} state="idle" /></div>
            <div className="pl-card glass gb live">
              <span className="eyebrow">{plan.name}</span>
              <b className="num">{ils(pr.net)}</b>
              <small>לשנה · {billing === "onetime" ? "תשלום אחד" : "12 תשלומים"} · לא כולל מע״מ</small>
            </div>
          </div>
        </header>

        {/* ---------- who it's for ---------- */}
        <section className="section pl-sec">
          <div className="wrap">
            <div className="sec-head"><span className="eyebrow">למי זה</span><h2 className="h-display">{PERSONAS[tier]}.</h2></div>
            <div className="pl-who">
              {page.forWho.map((w) => <div key={w} className="pl-who-i glass edge"><Icon name="check" size={18} className="gold-ico" /> {w}</div>)}
            </div>
          </div>
        </section>

        {/* ---------- what's included ---------- */}
        <section className="section pl-sec">
          <div className="wrap">
            <div className="sec-head"><span className="eyebrow">מה כלול</span><h2 className="h-display">{tier === "basic" ? "הכל, לשנה שלמה." : <>כל מה שב-Basic. <span className="gold">ועוד.</span></>}</h2></div>
            {page.extras.length > 0 && (
              <div className="pl-extras">
                {page.extras.map((x) => (
                  <div key={x.t} className="pl-extra gb">
                    <span className="pl-extra-tag">כלול ב-{plan.name.replace("Platform ", "")}</span>
                    <b>{x.t}</b><p>{x.d}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="pl-grid">
              {BASE_ITEMS.map((x) => (
                <div key={x.t} className="pl-item glass edge">
                  <span className="feat-ico"><Icon name={x.icon} size={22} /></span>
                  <b>{x.t}</b><p>{x.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- value + price ---------- */}
        <section className="section pl-sec" id="price">
          <div className="wrap pl-buy">
            <div className="plans-value pl-value glass edge">
              <h4>מה זה שווה, במחיר רגיל</h4>
              <div className="pv-row"><span>הפלטפורמה ודובדבוט, 12 חודשים × {ils(REGULAR_MONTHLY)}</span><b className="num">{ils(REGULAR_MONTHLY * 12)}</b></div>
              <div className="pv-row"><span>4 מפגשי סדנה &quot;{WORKSHOP.name}&quot; × {ils(WORKSHOP_VALUE)}</span><b className="num">{ils(WORKSHOP_VALUE * 4)}</b></div>
              <div className="pv-row"><span>12 פגישות אסטרטגיות בזום עם ניר</span><b>כלול</b></div>
              <div className="pv-row"><span>{COURSES.length} קורסים, בונוס ו-{BOOKS.length} ספרים</span><b>כלול</b></div>
              {page.extras.map((x) => <div key={x.t} className="pv-row"><span>{x.t}</span><b>כלול</b></div>)}
              {REGULAR_MONTHLY * 12 + WORKSHOP_VALUE * 4 > priceOf(tier, "onetime").net && <div className="pv-row pv-total"><span>{tier === "basic" ? "שווי לפחות" : "שווי לפחות, עוד לפני הליווי האישי"}</span><b className="num">{ils(REGULAR_MONTHLY * 12 + WORKSHOP_VALUE * 4)}</b></div>}
              <small className="muted">כל הסכומים לא כוללים מע״מ.</small>
            </div>

            <div className="pl-pricebox glass gb live" aria-labelledby="pb-h">
              <span className="plans-anchor pl-anchor"><span className="pa-tag">מחיר השקה</span>{regularMonthly && <span>מחיר רגיל <s className="num">{ils(regularMonthly)}</s> לחודש</span>}</span>
              <h3 id="pb-h">{plan.name}</h3>
              <div className="bill-toggle" role="radiogroup" aria-label="אופן תשלום">
                <button role="radio" aria-checked={billing === "onetime"} className={billing === "onetime" ? "on" : ""} onClick={() => setBilling("onetime")}>תשלום אחד <small>הכי משתלם</small></button>
                <button role="radio" aria-checked={billing === "installments"} className={billing === "installments" ? "on" : ""} onClick={() => setBilling("installments")}>12 תשלומים</button>
              </div>
              <div className="plan-price">
                <b className="num">{ils(pr.perMonthNet)}</b>
                <span>לחודש · לא כולל מע״מ</span>
              </div>
              <p className="plan-total num">{ils(pr.net)} לשנה + מע״מ ({ils(pr.total)} כולל {Math.round(VAT * 100)}% מע״מ)</p>
              {billing === "onetime" && other.net > pr.net && <p className="plan-save num"><Icon name="gem" size={13} /> חוסך {ils(other.net - pr.net)} לעומת 12 תשלומים</p>}
              {billing === "installments" && <p className="muted pl-small">בתשלום אחד: {ils(other.net)} לשנה + מע״מ</p>}
              <ul className="pl-terms">
                <li><Icon name="check" size={15} /> הכל נפתח מיד עם הסליקה</li>
                <li><Icon name="check" size={15} /> מהשנה השנייה: {ils(RENEWAL_MONTHLY)} + מע״מ לחודש, אפשר לבטל את החידוש בכל רגע</li>
                <li><Icon name="alert" size={15} /> אין ביטולים והחזרים אחרי הסליקה, כי התכנים נפתחים מיד</li>
                {owned && !included && <li><Icon name="gem" size={15} /> כבר במנוי? בשדרוג משלמים רק את ההפרש</li>}
              </ul>
              <Cta block />
              {!signedIn && <p className="pl-small muted">עוד לא רשום? נרשמים בדקה, וחוזרים ישר לרכישה של {plan.name}.</p>}
            </div>
          </div>
        </section>

        {/* ---------- after you buy ---------- */}
        <section className="section pl-sec">
          <div className="wrap">
            <div className="sec-head"><span className="eyebrow">אחרי הרכישה</span><h2 className="h-display">ככה זה עובד.</h2></div>
            <div className="steps3">
              {page.steps.map((s, i) => (
                <div key={s.t} className="step3"><span className="step3-n">0{i + 1}</span><h4>{s.t}</h4><p>{s.d}</p></div>
              ))}
            </div>
            {!signedIn && (
              <div className="pl-gift glass edge">
                <div><b>רוצה להתחיל בלי לשלם?</b><span>30 יום במתנה עם דובדבוט וכל הכלים. בלי כרטיס אשראי.</span></div>
                <a className="btn btn-glass" href={giftHref}>להתחיל 30 יום במתנה</a>
              </div>
            )}
          </div>
        </section>

        {/* ---------- Nir ---------- */}
        <section className="section pl-sec">
          <div className="wrap pl-nir glass edge">
            <NirPhoto size={132} />
            <div>
              <span className="eyebrow">ניר דובדבני</span>
              <blockquote className="h-display">&quot;ידע שלא הופך לפעולה לא שווה כלום. זה בדיוק מה שהפלטפורמה עושה.&quot;</blockquote>
              <p className="muted">22 שנה של ליווי עסקים, יותר מ-23,000 עסקים שעברו את השיטה, מנחה &quot;עסקים עכשיו&quot; בערוץ 14, מייסד קבוצת דובדבני.</p>
            </div>
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section className="section pl-sec">
          <div className="wrap pl-faq">
            <div className="sec-head"><span className="eyebrow">שאלות</span><h2 className="h-display">לפני שמצטרפים.</h2></div>
            <div className="faq">
              {[...page.faq, ...COMMON_FAQ].map((f, i) => (
                <div key={f.q} className={`faq-item ${faq === i ? "open" : ""}`}>
                  <button className="faq-q" aria-expanded={faq === i} onClick={() => setFaq(faq === i ? null : i)}>{f.q}<Icon name="chevron" size={18} /></button>
                  {faq === i && <p className="faq-a">{f.a}</p>}
                </div>
              ))}
            </div>
            <div className="pl-final">
              <Cta />
              <small className="muted">{SHABBAT_NOTE}</small>
            </div>
          </div>
        </section>

        <footer className="wrap footer">
          <div className="footer-brand"><GroupLogo /><span>{firstName ? `${firstName}, ` : ""}Duvdevani Platform · קבוצת דובדבני</span></div>
          <nav><Link href="/plans">כל המסלולים</Link><Link href="/terms">תנאי שימוש</Link><Link href="/privacy">פרטיות</Link></nav>
          <p className="pl-disc">{DISCLAIMER_LONG}</p>
        </footer>
      </div>

      {/* ---------- sticky mobile CTA ---------- */}
      <div className={`pl-sticky ${stuck ? "on" : ""}`} aria-hidden={!stuck}>
        <span><b className="num">{ils(pr.perMonthNet)}</b><small>לחודש · לא כולל מע״מ</small></span>
        {included ? <Link className="btn btn-glass btn-sm" href="/chat" tabIndex={stuck ? 0 : -1}>לפלטפורמה</Link> : <a className="btn btn-primary btn-sm" href={href} tabIndex={stuck ? 0 : -1}>{owned ? "לשדרוג" : "להצטרפות"}</a>}
      </div>
    </>
  );
}

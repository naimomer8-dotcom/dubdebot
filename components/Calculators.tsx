"use client";

import { useState } from "react";

/** Business calculators – plain formulas, no AI calls, zero cost per use. */
const VAT = 0.18; // שיעור המע"מ בישראל מינואר 2025

const n = (s: string) => {
  const v = Number(String(s).replace(/[,₪%\s]/g, ""));
  return Number.isFinite(v) ? v : NaN;
};
const ils = (v: number) => (Number.isFinite(v) ? `₪${Math.round(v).toLocaleString("he-IL")}` : "—");
const num = (v: number, d = 0) => (Number.isFinite(v) ? v.toLocaleString("he-IL", { maximumFractionDigits: d }) : "—");

function F({ label, v, set, hint }: { label: string; v: string; set: (s: string) => void; hint?: string }) {
  return (
    <div className="field">
      <label>
        {label}
        <input className="input" inputMode="decimal" dir="ltr" value={v} onChange={(e) => set(e.target.value)} placeholder={hint} style={{ textAlign: "right", marginTop: 6, width: "100%" }} />
      </label>
    </div>
  );
}

function Out({ rows, note }: { rows: [string, string, boolean?][]; note?: string }) {
  return (
    <div className="calc-out">
      {rows.map(([k, v, big]) => (
        <div key={k} className={big ? "big" : ""}><span>{k}</span><b className="num">{v}</b></div>
      ))}
      {note && <p className="muted" style={{ margin: "6px 0 0", fontSize: 14 }}>{note}</p>}
    </div>
  );
}

function BreakEven() {
  const [fixed, setFixed] = useState("40000");
  const [price, setPrice] = useState("350");
  const [varc, setVarc] = useState("120");
  const m = n(price) - n(varc);
  const units = m > 0 ? Math.ceil(n(fixed) / m) : NaN;
  return (
    <>
      <F label="הוצאות קבועות בחודש (שכירות, שכר, מערכות)" v={fixed} set={setFixed} />
      <F label="מחיר ממוצע לעסקה (לפני מע״מ)" v={price} set={setPrice} />
      <F label="עלות משתנה לעסקה (חומרים, עמלות, שליח)" v={varc} set={setVarc} />
      <Out
        rows={[["רווח גולמי לעסקה", ils(m)], ["עסקאות בחודש כדי לא להפסיד", num(units), true], ["מחזור נדרש בחודש", ils(units * n(price))]]}
        note={m <= 0 ? "העלות לעסקה גבוהה מהמחיר – כל מכירה מגדילה את ההפסד. קודם מחיר, אחר כך שיווק." : "כל עסקה מעבר למספר הזה היא רווח."}
      />
    </>
  );
}

function Pricing() {
  const [cost, setCost] = useState("200");
  const [margin, setMargin] = useState("40");
  const p = n(cost) / (1 - n(margin) / 100);
  return (
    <>
      <F label="העלות שלך למוצר / שירות" v={cost} set={setCost} />
      <F label="רווח רצוי מהמחיר (%)" v={margin} set={setMargin} />
      <Out
        rows={[["מחיר לפני מע״מ", ils(p), true], ["מחיר ללקוח כולל מע״מ", ils(p * (1 + VAT))], ["רווח בשקלים לעסקה", ils(p - n(cost))]]}
        note={n(margin) >= 100 ? "רווח של 100% מהמחיר לא אפשרי – הזן אחוז קטן מ-100." : "שים לב: 40% רווח מהמחיר זה לא 40% תוספת על העלות. זו הטעות הכי נפוצה בתמחור."}
      />
    </>
  );
}

function Vat() {
  const [amount, setAmount] = useState("1180");
  const [mode, setMode] = useState<"remove" | "add">("remove");
  const a = n(amount);
  const before = mode === "remove" ? a / (1 + VAT) : a;
  return (
    <>
      <div className="calc-seg">
        <button className={mode === "remove" ? "on" : ""} onClick={() => setMode("remove")}>הסכום כולל מע״מ</button>
        <button className={mode === "add" ? "on" : ""} onClick={() => setMode("add")}>הסכום לפני מע״מ</button>
      </div>
      <F label="סכום" v={amount} set={setAmount} />
      <Out rows={[["לפני מע״מ", ils(before)], ["מע״מ (18%)", ils(before * VAT)], ["כולל מע״מ", ils(before * (1 + VAT)), true]]} note="לפי שיעור מע״מ של 18%." />
    </>
  );
}

function Promo() {
  const [price, setPrice] = useState("300");
  const [cost, setCost] = useState("150");
  const [disc, setDisc] = useState("20");
  const m = n(price) - n(cost);
  const newPrice = n(price) * (1 - n(disc) / 100);
  const newM = newPrice - n(cost);
  const lift = newM > 0 ? (m / newM - 1) * 100 : NaN;
  return (
    <>
      <F label="מחיר רגיל" v={price} set={setPrice} />
      <F label="עלות לעסקה" v={cost} set={setCost} />
      <F label="הנחה במבצע (%)" v={disc} set={setDisc} />
      <Out
        rows={[["רווח לעסקה היום", ils(m)], ["רווח לעסקה במבצע", ils(newM)], ["כמה יותר מכירות צריך רק כדי להישאר באותו רווח", Number.isFinite(lift) ? `+${num(lift)}%` : "—", true]]}
        note={newM <= 0 ? "במחיר הזה כל מכירה בהפסד. המבצע הזה שורף כסף." : "אם המבצע לא מביא לפחות את התוספת הזו – הוא מקטין לך את הרווח."}
      />
    </>
  );
}

function Ltv() {
  const [deal, setDeal] = useState("500");
  const [perYear, setPerYear] = useState("4");
  const [years, setYears] = useState("2");
  const [margin, setMargin] = useState("50");
  const ltv = n(deal) * n(perYear) * n(years) * (n(margin) / 100);
  return (
    <>
      <F label="עסקה ממוצעת" v={deal} set={setDeal} />
      <F label="כמה פעמים בשנה לקוח קונה" v={perYear} set={setPerYear} />
      <F label="כמה שנים לקוח נשאר" v={years} set={setYears} />
      <F label="רווח גולמי (%)" v={margin} set={setMargin} />
      <Out
        rows={[["רווח מלקוח לאורך כל החיים (LTV)", ils(ltv), true], ["כמה מותר לשלם כדי להשיג לקוח (שליש מה-LTV)", ils(ltv / 3)]]}
        note="זה המספר שקובע כמה אפשר להשקיע בקמפיין לכל לקוח חדש – ועדיין להרוויח."
      />
    </>
  );
}

const CALCS = [
  { id: "breakeven", title: "נקודת איזון", sub: "כמה עסקאות צריך בחודש כדי לא להפסיד", C: BreakEven },
  { id: "pricing", title: "תמחור לפי רווח", sub: "מה המחיר כדי להרוויח את האחוז שאתה רוצה", C: Pricing },
  { id: "promo", title: "כדאיות מבצע", sub: "כמה מכירות הנחה צריכה להביא כדי לא להפסיד", C: Promo },
  { id: "ltv", title: "ערך לקוח ועלות גיוס", sub: "כמה מותר לשלם על לקוח חדש", C: Ltv },
  { id: "vat", title: "מע״מ", sub: "הוספה / הורדה של 18%", C: Vat },
];

export default function Calculators() {
  const [open, setOpen] = useState("breakeven");
  return (
    <div className="calc-list">
      {CALCS.map(({ id, title, sub, C }) => (
        <section key={id} className={`calc glass edge ${open === id ? "on" : ""}`}>
          <button className="calc-head" onClick={() => setOpen(open === id ? "" : id)} aria-expanded={open === id}>
            <b>{title}</b>
            <span className="muted">{sub}</span>
          </button>
          {open === id && <div className="calc-body"><C /></div>}
        </section>
      ))}
    </div>
  );
}

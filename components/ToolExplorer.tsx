"use client";

import { useEffect, useState } from "react";
import Mascot from "./Mascot";
import { TOOLS, ToolMode } from "@/lib/persona";

const SAMPLES: Record<Exclude<ToolMode, "chat">, { ask: string; answer: React.ReactNode }> = {
  forecast: {
    ask: "מסעדה בפתח תקווה. 180 אלף מחזור בחודש, ואני בקושי סוגר את החודש.",
    answer: (
      <>
        <p>180 אלף מחזור ובקושי סוגר? אתה לא בבעיית מחזור. אתה בבעיית <strong>עלות מנה</strong>.</p>
        <table>
          <thead><tr><th>תרחיש</th><th>רווח חודשי</th><th>רווח שנתי</th></tr></thead>
          <tbody>
            <tr><td>היום</td><td>₪4,200</td><td>₪50K</td></tr>
            <tr><td>עיקריות +8 ₪</td><td>₪13,400</td><td>₪161K</td></tr>
            <tr><td>+ תפריט מקוצר</td><td>₪21,900</td><td>₪263K</td></tr>
          </tbody>
        </table>
        <p>המנוף הכי חזק שלך הוא לא עוד לקוחות. זה 8 שקלים על מנה. מה מחיר העיקרית הכי נמכרת אצלך היום?</p>
      </>
    ),
  },
  workplan: {
    ask: "סטודיו לפילאטיס, 3 מדריכות. רוצה להכפיל את העסק בשנה.",
    answer: (
      <>
        <p><strong>היעד:</strong> 140 מנויים קבועים עד יוני. לא שיעורים – מנויים.</p>
        <p><strong>חודש 1 – תמחור ומבנה.</strong> מבטלים כרטיסיות. שני מסלולי מנוי בלבד. מעלים מחיר ל-80% מהלקוחות הקיימים עם הודעה אישית.</p>
        <p><strong>חודש 2 – מנוע לידים.</strong> שיעור ניסיון ב-49 ₪ + שיחת המרה באותו יום. KPI: 40% המרה.</p>
        <p><strong>חודש 3 – לצאת מהסטודיו.</strong> את מפסיקה ללמד 18 שעות בשבוע. מדריכה רביעית במשמרות ערב.</p>
        <p>מה את מפסיקה לעשות כבר השבוע?</p>
      </>
    ),
  },
  sales_script: {
    ask: "אני מוכר מערכות סולאריות לבתים פרטיים. עסקה ממוצעת 45 אלף.",
    answer: (
      <>
        <p><strong>פתיחה (15 שניות):</strong> ״היי דני, ניר מ-[החברה]. השארת פרטים על מערכת לגג. יש לך 4 דקות עכשיו, או שאני חוזר בערב?״</p>
        <p><strong>שאלת הכאב:</strong> ״כמה יצא חשבון החשמל באוגוסט האחרון? ומה עשית כשראית אותו?״</p>
        <p><strong>״יקר לי״:</strong> ״יקר ביחס למה? אתה כבר משלם את המערכת הזאת – רק לחברת החשמל, כל חודש, בלי שזה יהיה שלך.״</p>
        <p><strong>סגירה:</strong> ״בוא נקבע סוקר לגג לחמישי. אם המספרים לא מסתדרים – לא קרה כלום.״</p>
      </>
    ),
  },
  feasibility: {
    ask: "רוצה לפתוח עגלת קפה בחוף בתל אביב. השקעה של 120 אלף.",
    answer: (
      <>
        <p className="score"><i style={{ background: "#e8b931" }} /> צהוב</p>
        <p>הרעיון עובד. העונה לא. יש לך 5 חודשים טובים ו-7 חודשים של עגלה עומדת.</p>
        <table>
          <tbody>
            <tr><td>כוסות ביום לאיזון</td><td>168</td></tr>
            <tr><td>חודשי החזר השקעה</td><td>14–19</td></tr>
            <tr><td>הסיכון הכי גדול</td><td>רישוי ומיקום</td></tr>
          </tbody>
        </table>
        <p>לפני שאתה שם 120 אלף – תשכור עגלה לסוף שבוע אחד ותספור כוסות. 3,000 ₪ שיחסכו לך שנה.</p>
      </>
    ),
  },
  objections: {
    ask: "תהיה לקוח קשה. אני מוכר ליווי עסקי ב-6,000 ₪ לחודש.",
    answer: (
      <>
        <p>🥊 ״תשמע, 6,000 בחודש זה המון כסף. אני צריך לחשוב על זה.״</p>
        <p style={{ color: "var(--muted)" }}>— אתה עונה: ״בטח, קח את הזמן.״</p>
        <p><strong>ציון 3/10.</strong> נתת לו לברוח. ״לחשוב על זה״ זה לא החלטה – זה פחד. תגיד: ״על מה בדיוק? על המחיר, או על זה שאתה לא בטוח שזה יעבוד אצלך?״</p>
        <p>🥊 ״אני צריך להתייעץ עם אשתי.״</p>
      </>
    ),
  },
};

export default function ToolExplorer({ onStart }: { onStart: () => void }) {
  const tools = TOOLS.filter((t) => t.id !== "chat") as (typeof TOOLS[number] & { id: Exclude<ToolMode, "chat"> })[];
  const [active, setActive] = useState<Exclude<ToolMode, "chat">>("forecast");

  useEffect(() => {
    const on = (e: Event) => {
      const id = (e as CustomEvent).detail;
      if (id && id in SAMPLES) setActive(id);
    };
    window.addEventListener("dd:tool", on);
    return () => window.removeEventListener("dd:tool", on);
  }, []);

  const sample = SAMPLES[active];

  return (
    <div className="explorer">
      <div className="tool-list" role="tablist" aria-orientation="vertical">
        {tools.map((t) => (
          <button
            key={t.id}
            role="tab"
            className="tool-row"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            onMouseEnter={() => setActive(t.id)}
          >
            <span className="t-ico">{t.icon}</span>
            <span>
              <span className="t-name">{t.title}</span>
              <span className="t-desc">{t.desc}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="preview-pane" role="tabpanel">
        <div key={active}>
          <div className="ask">{sample.ask}</div>
          <div className="answer" style={{ display: "flex", gap: 14 }}>
            <div style={{ flexShrink: 0 }}><Mascot size={44} mood="talking" track={false} /></div>
            <div>{sample.answer}</div>
          </div>
        </div>
        <div style={{ marginTop: 18, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn btn-gold btn-sm" onClick={onStart}>לנסות על העסק שלי</button>
          <small style={{ color: "var(--muted)" }}>תשובה לדוגמה. אצלך היא נבנית על המספרים שלך.</small>
        </div>
      </div>
    </div>
  );
}

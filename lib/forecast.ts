export type ForecastInput = {
  price: number; // avg deal ₪
  deals: number; // deals / month today
  growth: number; // % monthly growth
  margin: number; // % gross margin
  fixed: number; // ₪ fixed costs / month
  marketing: number; // ₪ marketing / month
};

export const DEFAULT_INPUT: ForecastInput = { price: 1500, deals: 40, growth: 4, margin: 55, fixed: 28000, marketing: 6000 };

export type Month = { i: number; label: string; deals: number; revenue: number; gross: number; profit: number };

const HEB_MONTHS = ["ינו׳", "פבר׳", "מרץ", "אפר׳", "מאי", "יוני", "יולי", "אוג׳", "ספט׳", "אוק׳", "נוב׳", "דצמ׳"];

export function project(inp: ForecastInput, months = 12): Month[] {
  const start = new Date().getMonth() + 1;
  return Array.from({ length: months }, (_, i) => {
    const deals = inp.deals * Math.pow(1 + inp.growth / 100, i);
    const revenue = deals * inp.price;
    const gross = revenue * (inp.margin / 100);
    const profit = gross - inp.fixed - inp.marketing;
    return { i, label: HEB_MONTHS[(start + i) % 12], deals, revenue, gross, profit };
  });
}

export function summarize(inp: ForecastInput) {
  const m = project(inp);
  const revenue = m.reduce((s, x) => s + x.revenue, 0);
  const profit = m.reduce((s, x) => s + x.profit, 0);
  const beIdx = m.findIndex((x) => x.profit >= 0);
  // levers: +10% price (cost per deal unchanged) vs +10% deals
  const priceLever = revenue * 0.1;
  const dealsLever = revenue * 0.1 * (inp.margin / 100);
  return { months: m, revenue, profit, breakEven: beIdx, netMargin: revenue ? profit / revenue : 0, priceLever, dealsLever };
}

export const ils = (n: number) =>
  (n < 0 ? "-" : "") + "₪" + Math.round(Math.abs(n)).toLocaleString("he-IL");

export const ilsShort = (n: number) => {
  const a = Math.abs(n);
  const s = a >= 1_000_000 ? (a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1) + "M" : a >= 1000 ? Math.round(a / 1000) + "K" : Math.round(a).toString();
  return (n < 0 ? "-" : "") + "₪" + s;
};

/** One-liner verdict in Nir's voice. Returns simple HTML-safe segments. */
export function verdict(inp: ForecastInput): { bold: string; rest: string } {
  const s = summarize(inp);
  const mkt = s.revenue ? (inp.marketing * 12) / s.revenue : 0;
  if (inp.margin < 35) {
    return {
      bold: "הבעיה שלך היא לא מכירות. זה תמחור.",
      rest: ` ברווח גולמי של ${inp.margin}% כל עסקה עובדת בשבילך כמעט בחינם. לפני שמביאים עוד לקוחות – מתקנים את המחיר.`,
    };
  }
  if (s.breakEven === -1) {
    return {
      bold: "כרגע העסק מממן את עצמו מהכיס שלך.",
      rest: ` עם המספרים האלה אתה לא מגיע לאיזון בשנה הקרובה. צריך לשנות לפחות מנוף אחד – מחיר, נפח או הוצאות קבועות.`,
    };
  }
  if (inp.growth >= 8 && mkt < 0.04) {
    return {
      bold: `צמיחה של ${inp.growth}% בחודש עם תקציב שיווק כזה? לא חמוד.`,
      rest: " או שמגדילים את מנוע הלידים, או שמורידים ציפיות. חלומות לא נכנסים לתחזית.",
    };
  }
  if (s.breakEven > 4) {
    return {
      bold: `יש פה עסק, אבל האיזון מגיע רק בחודש ${s.breakEven + 1}.`,
      rest: " השאלה היא לא אם זה יעבוד – אלא אם יש לך אוויר עד אז.",
    };
  }
  if (s.netMargin < 0.1) {
    return {
      bold: `אתה עובד קשה בשביל ${Math.round(s.netMargin * 100)}% רווח נקי.`,
      rest: ` העלאת מחיר של 10% מוסיפה ${ilsShort(s.priceLever)} בשנה. 10% יותר עסקאות – רק ${ilsShort(s.dealsLever)}. תחשוב על זה.`,
    };
  }
  return {
    bold: "זה כבר נראה כמו עסק.",
    rest: ` עכשיו השאלה היא איך מכפילים את ה-${ilsShort(s.profit)} בלי להכפיל את השעות שלך. שם אסטרטגיה מנצחת טקטיקה.`,
  };
}

export function toPrompt(inp: ForecastInput) {
  const s = summarize(inp);
  return [
    "בניתי תחזית בסטודיו. אלה המספרים שלי:",
    `• מחיר ממוצע לעסקה: ${ils(inp.price)}`,
    `• עסקאות בחודש היום: ${inp.deals}`,
    `• צמיחה חודשית צפויה: ${inp.growth}%`,
    `• רווח גולמי: ${inp.margin}%`,
    `• הוצאות קבועות בחודש: ${ils(inp.fixed)}`,
    `• שיווק בחודש: ${ils(inp.marketing)}`,
    `לפי החישוב: הכנסות שנתיות ${ils(s.revenue)}, רווח שנתי ${ils(s.profit)}, ${
      s.breakEven === -1 ? "בלי איזון בשנה הקרובה" : s.breakEven === 0 ? "רווחי מהחודש הראשון" : `איזון בחודש ${s.breakEven + 1}`
    }.`,
    "תפרק לי את זה: מה המנוף הכי חזק, מה הסיכון הכי גדול, ומה אתה היית עושה במקומי ב-90 הימים הקרובים?",
  ].join("\n");
}

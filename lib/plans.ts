/** Duvdevani Platform – subscription tiers. All prices are before VAT; VAT is added on top. */
export const VAT = 0.18;
export type Tier = "basic" | "private" | "upgrade" | "pro";
export type Billing = "onetime" | "installments";

export const COURSES = [
  "מקצוען בנדל״ן",
  "מקצוען בכספים",
  "מקצוען ב-AI",
  "המבוא לאסטרטגיית הון",
  "פשוט להיות עסק אלפא",
  "פשוט למכור יותר",
  "שפת גוף של כוכב מכירות",
  "איך לבנות קורס דיגיטלי",
  "NLP עסקי",
];

const BASE_FEATURES = [
  "גישה מלאה לפלטפורמה: ניר זמין לך 24/6 עם כל הכלים",
  `כל 9 הקורסים הדיגיטליים של ניר (${COURSES.slice(0, 3).join(", ")} ועוד)`,
  "כל הספרים של ניר",
  "כנס מינגלינג ענק של בעלי עסקים, אחת לרבעון",
  "זום עם ניר דובדבני פעם בשבועיים: שאלות, תשובות ואסטרטגיה לעסק שלך",
];

/** Base annual price: 12 × 299 in installments, or 12 × 229 paid at once. */
const BASIC = { installments: 299 * 12, onetime: 229 * 12 };

export type Plan = {
  id: Tier;
  name: string;
  tagline: string;
  extra: number; // added on top of the basic price (0 for basic); pro is a flat price
  flat?: Record<Billing, number>;
  features: string[];
  highlight?: string;
};

export const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Alpha Basic",
    tagline: "כל הידע של ניר, זמין לך 24/6, לשנה שלמה",
    extra: 0,
    features: BASE_FEATURES,
  },
  {
    id: "private",
    name: "Alpha Private",
    tagline: "הכל, ויועץ עסקי אמיתי שמטמיע איתך",
    extra: 590,
    features: ["כל מה שב-Alpha Basic", "פגישת הטמעה של 3 שעות, אחד על אחד, עם יועץ עסקי בכיר שמטמיע איתך את הכל על העסק שלך"],
    highlight: "הכי משתלם",
  },
  {
    id: "upgrade",
    name: "Alpha Upgrade",
    tagline: "הכל, ופגישה אישית עם ניר דובדבני בעצמו",
    extra: 2500,
    features: ["כל מה שב-Alpha Basic", "פגישת אסטרטגיה אישית עם ניר דובדבני (במקום הפגישות עם היועץ)"],
  },
  {
    id: "pro",
    name: "Alpha Pro",
    tagline: "הכל כלול. כולל פודקאסט אחד על אחד עם ניר",
    extra: 0,
    flat: { onetime: 8700, installments: 9700 },
    features: ["כל מה שב-Alpha Basic", "פגישת הטמעה של 3 שעות עם יועץ עסקי בכיר", "פגישה אישית עם ניר דובדבני", "פרק פודקאסט אחד על אחד עם ניר דובדבני על העסק שלך, מוקלט עד 60 יום מהסליקה"],
    highlight: "הכל כלול",
  },
];

export const RENEWAL_MONTHLY = 69; // after the first year, before VAT

export const planById = (id: string | null | undefined) => PLANS.find((p) => p.id === id) ?? null;
export const TIER_RANK: Record<Tier, number> = { basic: 1, private: 2, upgrade: 3, pro: 4 };

/** Time-limited offers a person currently holds (see lib/offers.ts). Values are ISO expiry times. */
export type Offers = { privateHalf?: string; installmentsAtOnetime?: string };
export const PRIVATE_HALF_EXTRA = 295;

export function priceOf(tier: Tier, billing: Billing, offers?: Offers | null) {
  const p = planById(tier)!;
  // win-back: 12 installments at the one-time price
  const base = billing === "installments" && offers?.installmentsAtOnetime ? BASIC.onetime : BASIC[billing];
  // trial bonus: Alpha Private add-on at half price
  const extra = tier === "private" && offers?.privateHalf ? PRIVATE_HALF_EXTRA : p.extra;
  const net = p.flat ? p.flat[billing] : base + extra;
  const vat = Math.round(net * VAT * 100) / 100;
  const total = Math.round((net + vat) * 100) / 100;
  return { net, vat, total, perMonth: Math.round((total / 12) * 100) / 100, perMonthNet: Math.round((net / 12) * 100) / 100 };
}

export const ils = (n: number, digits = 0) => `₪${n.toLocaleString("he-IL", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

/** The next tier to offer someone who already owns `tier` (smart upsell). */
export function nextTier(tier: Tier | null): Plan | null {
  if (!tier) return planById("basic");
  if (tier === "basic") return planById("private");
  if (tier === "private") return planById("upgrade");
  if (tier === "upgrade") return planById("pro");
  return null;
}

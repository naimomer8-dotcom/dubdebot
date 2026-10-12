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
  "גישה מלאה לפלטפורמה: ניר בכיס, כל הכלים, 24/6",
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
  flat?: number;
  features: string[];
  highlight?: string;
};

export const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Alpha Basic",
    tagline: "כל הידע של ניר, בכיס, לשנה שלמה",
    extra: 0,
    features: BASE_FEATURES,
  },
  {
    id: "private",
    name: "Alpha Private",
    tagline: "הכל, ויועץ עסקי אמיתי שמטמיע איתך",
    extra: 590,
    features: ["כל מה שב-Alpha Basic", "4 שעות אחד על אחד עם יועץ עסקי בכיר שיושב להטמיע איתך את הכל, על העסק שלך"],
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
    flat: 9700,
    features: ["כל מה שב-Alpha Basic", "4 שעות עם יועץ עסקי בכיר", "פגישה אישית עם ניר דובדבני", "פרק פודקאסט אחד על אחד עם ניר דובדבני על העסק שלך"],
    highlight: "הכל כלול",
  },
];

export const RENEWAL_MONTHLY = 69; // after the first year, before VAT

export const planById = (id: string | null | undefined) => PLANS.find((p) => p.id === id) ?? null;
export const TIER_RANK: Record<Tier, number> = { basic: 1, private: 2, upgrade: 3, pro: 4 };

export function priceOf(tier: Tier, billing: Billing) {
  const p = planById(tier)!;
  const net = p.flat ?? BASIC[billing] + p.extra;
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

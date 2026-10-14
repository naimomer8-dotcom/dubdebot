import { db } from "./supabase";
import { alert } from "./alerts";

/**
 * Monthly AI budget (₪). Every Gemini call is priced from its token usage and added to ai_spend.
 * At 80% an alert is emailed; at 100% AI features pause until the 1st of next month (or until the cap is raised).
 * Prices are USD per 1M tokens and deliberately on the high side; override with AI_PRICES (JSON) in Vercel.
 */
export const BUDGET_ILS = Number(process.env.AI_MONTHLY_BUDGET_ILS || 2000);
const USD_ILS = Number(process.env.USD_ILS || 3.8);

type Price = { in: number; out: number; cached?: number };
const DEFAULT_PRICES: Record<string, Price> = {
  "flash-lite": { in: 0.25, out: 1.5, cached: 0.05 },
  flash: { in: 0.6, out: 3.6, cached: 0.15 },
  pro: { in: 2.5, out: 15, cached: 0.6 },
  embedding: { in: 0.15, out: 0 },
  tts: { in: 1, out: 20 },
};
function priceFor(model: string): Price {
  let custom: Record<string, Price> = {};
  try { custom = JSON.parse(process.env.AI_PRICES || "{}"); } catch {}
  const all = { ...DEFAULT_PRICES, ...custom };
  const m = model.toLowerCase();
  if (all[m]) return all[m];
  for (const k of ["tts", "embedding", "flash-lite", "pro", "flash"]) if (m.includes(k)) return all[k];
  return all.flash;
}

export type Usage = { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number; cachedContentTokenCount?: number; totalTokenCount?: number } | null | undefined;

export const monthKey = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" }).slice(0, 7);

export function costIls(model: string, u: Usage, fallbackInputChars = 0) {
  const p = priceFor(model);
  const cached = u?.cachedContentTokenCount ?? 0;
  const input = u?.promptTokenCount ?? Math.ceil(fallbackInputChars / 3);
  const out = (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0);
  const usd = ((input - cached) * p.in + cached * (p.cached ?? p.in) + out * p.out) / 1_000_000;
  return Math.max(0, usd * USD_ILS);
}

let cache: { month: string; ils: number; at: number } | null = null;

export async function spentThisMonth(): Promise<number> {
  const month = monthKey();
  if (cache && cache.month === month && Date.now() - cache.at < 30_000) return cache.ils;
  const { data } = await db().from("ai_spend").select("ils").eq("month", month).maybeSingle();
  cache = { month, ils: Number(data?.ils ?? 0), at: Date.now() };
  return cache.ils;
}

export async function overBudget() {
  try {
    return (await spentThisMonth()) >= BUDGET_ILS;
  } catch {
    return false; // never block users because the meter itself failed
  }
}

export async function recordSpend(model: string, u: Usage, fallbackInputChars = 0) {
  const ils = costIls(model, u, fallbackInputChars);
  if (!(ils > 0)) return;
  try {
    const month = monthKey();
    const { data: total } = await db().rpc("add_ai_spend", { p_month: month, p_ils: Number(ils.toFixed(5)) });
    const t = Number(total ?? 0);
    cache = { month, ils: t, at: Date.now() };
    if (t >= BUDGET_ILS) {
      await alert(`budget100:${month}`, "תקרת התקציב של ה-AI הושגה", [`הוצאה החודש: ₪${t.toFixed(0)} מתוך ₪${BUDGET_ILS}.`, "הצ'אט והכלים מושהים עד תחילת החודש הבא.", "כדי להמשיך: להעלות את AI_MONTHLY_BUDGET_ILS ב-Vercel."], 60 * 24 * 31);
    } else if (t >= BUDGET_ILS * 0.8) {
      await alert(`budget80:${month}`, "80% מתקציב ה-AI החודשי", [`הוצאה החודש: ₪${t.toFixed(0)} מתוך ₪${BUDGET_ILS}.`, "ב-100% הצ'אט והכלים יושהו אוטומטית."], 60 * 24 * 31);
    }
  } catch (e) {
    console.error("recordSpend failed", (e as Error).message);
  }
}

export class BudgetExceeded extends Error {
  constructor() { super("ai_budget_exceeded"); }
}
export const BUDGET_MESSAGE = "ניר לוקח הפסקה קצרה. הכלים חוזרים לפעול בקרוב. אפשר להשאיר פרטים ונחזור אליך.";

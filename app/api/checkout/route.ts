import { getSession } from "@/lib/session";
import { db } from "@/lib/supabase";
import { limited } from "@/lib/ratelimit";
import { emit } from "@/lib/automation";
import { PLANS, priceOf, TIER_RANK, type Billing, type Tier } from "@/lib/plans";
import { offersFor } from "@/lib/offers";

export const runtime = "nodejs";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

/**
 * Starts a purchase. Creates a pending order and:
 * - when a payment provider is connected (PAYMENT_PROVIDER + its keys) → returns its hosted payment URL;
 * - until then → opens a "purchase" lead so a rep sends a payment link within 24h.
 * Body: { tier, billing, via?: "self" | "rep" }
 */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return json({ error: "unauthorized" }, 401);
  if (await limited(`u:${s.userId}`, "checkout", 10, 60)) return json({ error: "יותר מדי ניסיונות. נסה שוב בעוד כמה דקות." }, 429);
  const b = await req.json().catch(() => ({}));
  const tier = String(b.tier) as Tier;
  const billing = (b.billing === "installments" ? "installments" : "onetime") as Billing;
  const via = b.via === "rep" ? "rep" : "self";
  if (!PLANS.some((p) => p.id === tier)) return json({ error: "מסלול לא קיים" }, 400);

  const supabase = db();
  const { data: u } = await supabase.from("users").select("id, full_name, phone, email, plan, tier").eq("id", s.userId).single();
  if (!u) return json({ error: "unauthorized" }, 401);

  // upgrade: pay only the difference
  const owned = u.plan === "paid" ? (u.tier as Tier | null) : null;
  if (owned && TIER_RANK[tier] <= TIER_RANK[owned]) return json({ error: "המסלול הזה כבר כלול במנוי שלך." }, 400);
  const offers = owned ? {} : await offersFor(s.userId);
  const target = priceOf(tier, billing, offers);
  const base = owned ? priceOf(owned, billing) : null;
  const net = Math.round((target.net - (base?.net ?? 0)) * 100) / 100;
  const vat = Math.round(net * 0.18 * 100) / 100;
  const total = Math.round((net + vat) * 100) / 100;

  const { data: order, error } = await supabase
    .from("orders")
    .insert({ user_id: s.userId, tier, billing, amount_net: net, vat, amount_total: total, status: "pending", channel: via, kind: Object.keys(offers).length ? `annual:offer:${Object.keys(offers).join("+")}` : "annual" })
    .select("id")
    .single();
  if (error || !order) return json({ error: "משהו השתבש. נסה שוב." }, 500);

  await emit("checkout_started", s.userId, { order_id: order.id, tier, billing, via, upgrade_from: owned, amount_total: total });

  const provider = process.env.PAYMENT_PROVIDER;
  if (provider && via === "self") {
    // Wired when the provider is chosen: create a hosted payment page for `order.id` and return its URL.
    return json({ status: "provider_pending", orderId: order.id, total, message: "דף התשלום יחובר בקרוב." });
  }

  // no provider yet (or the user asked for a rep): a rep closes it with a payment link
  const planName = PLANS.find((p) => p.id === tier)!.name;
  await supabase.from("leads").insert({
    user_id: s.userId,
    meeting_type: "purchase",
    full_name: u.full_name,
    phone: u.phone,
    email: u.email,
    note: `${owned ? `שדרוג מ-${owned} ל-` : "רכישת "}${planName}${offers.privateHalf && tier === "private" ? " · בונוס Private בחצי מחיר" : ""}${offers.installmentsAtOnetime && billing === "installments" ? " · הצעת 72 שעות: תשלומים במחיר תשלום אחד" : ""} · ${billing === "installments" ? "12 תשלומים" : "תשלום אחד"} · ₪${total.toLocaleString("he-IL")} כולל מע״מ · הזמנה ${order.id.slice(0, 8)}`,
    trigger: via === "rep" ? "rep_requested" : "checkout_no_provider",
  });
  await supabase.from("users").update({ renewal_requested_at: new Date().toISOString() }).eq("id", s.userId);
  if (via === "rep") await emit("rep_requested", s.userId, { order_id: order.id, tier, billing });

  return json({ status: "rep", orderId: order.id, total });
}

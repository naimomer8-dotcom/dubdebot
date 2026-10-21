import { db } from "./supabase";
import { emit } from "./automation";
import { enrollAllCourses } from "./schooler";
import { alert } from "./alerts";
import { rewardReferrer } from "./referral";
import { priceOf, TIER_RANK, type Billing, type Tier } from "./plans";

const YEAR = 365 * 86400_000;

/**
 * Marks a purchase as paid and opens the plan:
 * - a new member gets 365 days, counted from the END of the gift month (no free days are lost);
 * - an upgrade only raises the tier and keeps the current end date;
 * - after the year the membership continues automatically at the monthly renewal price (renewal_mode = monthly69).
 * Opens all courses (Schooler) and fires the "purchase"/"upgrade" automation.
 */
export async function activateSubscription(opts: { userId: string; tier: Tier; billing: Billing; channel: "self" | "rep" | "admin"; by?: string; orderId?: string; adminId?: string }) {
  const supabase = db();
  const { data: u } = await supabase.from("users").select("id, email, full_name, phone, plan, tier, access_until").eq("id", opts.userId).single();
  if (!u) throw new Error("user not found");
  const now = Date.now();
  const isUpgrade = u.plan === "paid" && u.tier && TIER_RANK[opts.tier] > TIER_RANK[u.tier as Tier];
  const until = u.access_until ? new Date(u.access_until).getTime() : now;
  const newUntil = isUpgrade ? until : Math.max(now, until) + YEAR;

  const patch: Record<string, unknown> = {
    plan: "paid",
    tier: opts.tier,
    billing: opts.billing,
    access_until: new Date(newUntil).toISOString(),
    renewal_requested_at: null,
    renewal_mode: "monthly69",
    paid_at: new Date().toISOString(),
    paid_by: opts.by ?? opts.channel,
  };
  if (!isUpgrade) {
    patch.subscribed_at = new Date().toISOString();
    patch.year_ends_at = new Date(newUntil).toISOString();
  }
  const { error } = await supabase.from("users").update(patch).eq("id", opts.userId);
  if (error) throw new Error(error.message);

  let order: { id: string; amount_net: number; amount_total: number } | null = null;
  if (opts.orderId) {
    const { data } = await supabase.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", opts.orderId).select("id, amount_net, amount_total").maybeSingle();
    order = data;
  } else {
    const p = priceOf(opts.tier, opts.billing);
    const { data } = await supabase.from("orders").insert({ user_id: opts.userId, tier: opts.tier, billing: opts.billing, amount_net: p.net, vat: p.vat, amount_total: p.total, status: "paid", channel: opts.channel, paid_at: new Date().toISOString(), installments: opts.billing === "installments" ? 12 : 1, customer_name: u.full_name, customer_phone: u.phone, customer_email: u.email, rep_name: opts.channel === "rep" ? opts.by ?? null : null, created_by_admin: opts.adminId ?? null, source: "admin_activate" }).select("id, amount_net, amount_total").maybeSingle();
    order = data;
  }

  const enroll = await enrollAllCourses({ email: u.email, full_name: u.full_name, phone: u.phone });
  if (!enroll.ok) await alert(`schooler:${opts.userId}`, "פתיחת קורסים ב-Schooler נכשלה", [`מנוי: ${u.full_name} · ${u.email}`, `תוצאה: ${JSON.stringify((enroll as { results?: unknown }).results ?? (enroll as { reason?: string }).reason).slice(0, 400)}`, "המנוי שילם אבל הקורסים לא נפתחו. אפשר לנסות שוב מעמוד 'הקורסים שלי' או לפתוח ידנית."], 60 * 24);
  const now2 = new Date().toISOString();
  await supabase.from("users").update({ ...(enroll.ok ? { courses_enrolled_at: now2 } : {}), ...(enroll.links && Object.keys(enroll.links).length ? { course_links: enroll.links } : {}), courses_synced_at: now2 }).eq("id", opts.userId);

  await emit(isUpgrade ? "upgrade" : "purchase", opts.userId, { tier: opts.tier, billing: opts.billing, channel: opts.channel, access_until: patch.access_until, order_id: order?.id ?? null, amount_net: order?.amount_net ?? null, amount_total: order?.amount_total ?? null, upgrade_from: isUpgrade ? u.tier : null, courses: { ok: enroll.ok } });
  if (!isUpgrade) await rewardReferrer(opts.userId).catch((e) => console.error("referral", e));
  return { accessUntil: patch.access_until as string, upgrade: !!isUpgrade, courses: enroll };
}

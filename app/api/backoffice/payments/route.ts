import { db } from "@/lib/supabase";
import { getAdmin, json } from "@/lib/adminAuth";
import { activateSubscription } from "@/lib/subscription";
import { PLANS, type Tier } from "@/lib/plans";
import { PAY_METHODS, PAY_STATUSES, VAT_RATE, round2, type Payment, type PayStatus, type RepRequest } from "@/lib/payments";
import { cleanName, isEmail, normalizeIsraeliPhone } from "@/lib/validation";

export const runtime = "nodejs";

const UUID = /^[0-9a-f-]{36}$/;
const ORDER_COLS =
  "id, user_id, tier, billing, kind, amount_net, vat, amount_total, status, channel, provider, provider_ref, created_at, paid_at, customer_name, customer_phone, customer_email, installments, rep_name, method, notes, created_by_admin, source, refund_amount, refunded_at";

type OrderRow = Record<string, unknown> & { id: string; user_id: string | null; created_at: string };

/**
 * Revenue dashboard data. Payments live in public.orders:
 * - channel 'self' = סליקה עצמית (checkout; the Cardcom webhook will mark these paid by order_id / provider_ref)
 * - channel 'rep'  = דרך נציג (added here by an admin, or opened from the users list)
 * Amounts: amount_net before VAT, vat 18%, amount_total incl. VAT.
 */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return json({ error: "unauthorized" }, 401);
  const supabase = db();
  const [{ data: orders }, { data: users }, { data: leads }, { data: admins }] = await Promise.all([
    supabase.from("orders").select(ORDER_COLS).order("created_at", { ascending: false }).limit(10000),
    supabase.from("users").select("id, full_name, email, phone, created_at, plan, tier, billing, access_until, year_ends_at, renewal_mode, paid_at, renewal_requested_at").order("created_at", { ascending: false }).limit(20000),
    supabase.from("leads").select("id, user_id, meeting_type, trigger, full_name, phone, email, note, created_at, status").in("meeting_type", ["purchase", "renewal"]).order("created_at", { ascending: false }).limit(2000),
    supabase.from("admins").select("id, display_name"),
  ]);
  const adminName = new Map((admins ?? []).map((a) => [a.id, a.display_name as string]));
  const userById = new Map((users ?? []).map((u) => [u.id as string, u]));

  const payments: Payment[] = ((orders ?? []) as OrderRow[]).map((o) => {
    const u = o.user_id ? userById.get(o.user_id) : undefined;
    return {
      id: o.id,
      userId: o.user_id,
      name: (o.customer_name as string) || (u?.full_name as string) || "ללא שם",
      phone: (o.customer_phone as string) || (u?.phone as string) || null,
      email: (o.customer_email as string) || (u?.email as string) || null,
      tier: String(o.tier),
      billing: String(o.billing),
      kind: String(o.kind ?? "annual"),
      installments: Number(o.installments ?? 1),
      net: Number(o.amount_net ?? 0),
      vat: Number(o.vat ?? 0),
      total: Number(o.amount_total ?? 0),
      status: (PAY_STATUSES.includes(o.status as PayStatus) ? o.status : "pending") as PayStatus,
      channel: o.channel === "self" ? "self" : "rep",
      repName: (o.rep_name as string) ?? null,
      method: (o.method as Payment["method"]) ?? null,
      provider: (o.provider as string) ?? null,
      ref: (o.provider_ref as string) ?? null,
      notes: (o.notes as string) ?? null,
      source: String(o.source ?? "checkout"),
      createdAt: o.created_at,
      paidAt: (o.paid_at as string) ?? null,
      refundAmount: o.refund_amount == null ? null : Number(o.refund_amount),
      refundedAt: (o.refunded_at as string) ?? null,
      createdBy: o.created_by_admin ? adminName.get(o.created_by_admin as string) ?? null : null,
    };
  });

  // open requests: pending orders whose person has not paid since, plus renewal leads without an order
  const paidAfter = (userId: string | null, iso: string) => {
    if (!userId) return false;
    const u = userById.get(userId);
    if (u?.paid_at && String(u.paid_at) > iso) return true;
    return payments.some((p) => p.userId === userId && p.status === "paid" && (p.paidAt ?? "") > iso);
  };
  const requests: RepRequest[] = [];
  const seenUsers = new Set<string>();
  for (const p of payments) {
    if (p.status !== "pending" || paidAfter(p.userId, p.createdAt)) continue;
    if (p.userId) {
      if (seenUsers.has(p.userId)) continue; // newest pending order per person
      seenUsers.add(p.userId);
    }
    requests.push({ key: `o:${p.id}`, orderId: p.id, userId: p.userId, name: p.name, phone: p.phone, email: p.email, tier: p.tier, billing: p.billing, net: p.net, total: p.total, createdAt: p.createdAt, via: p.channel === "rep" ? "rep" : "self", note: p.notes });
  }
  for (const l of leads ?? []) {
    if (l.meeting_type !== "renewal" || l.status === "done") continue;
    const uid = (l.user_id as string) ?? null;
    if (uid && (seenUsers.has(uid) || paidAfter(uid, l.created_at as string))) continue;
    if (uid) seenUsers.add(uid);
    requests.push({ key: `l:${l.id}`, orderId: null, userId: uid, name: l.full_name as string, phone: (l.phone as string) ?? null, email: (l.email as string) ?? null, tier: null, billing: null, net: null, total: null, createdAt: l.created_at as string, via: "renewal", note: (l.note as string) ?? null });
  }
  requests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // funnel: people who asked for a rep (rep-channel orders + purchase/renewal leads)
  const repLeads = [
    ...payments.filter((p) => p.channel === "rep" && p.source === "checkout").map((p) => ({ userId: p.userId, createdAt: p.createdAt })),
    ...(leads ?? []).filter((l) => l.trigger === "rep_requested" || l.meeting_type === "renewal").map((l) => ({ userId: (l.user_id as string) ?? null, createdAt: l.created_at as string })),
  ];

  return json({
    admin,
    payments,
    requests,
    repLeads,
    users: (users ?? []).map((u) => ({ id: u.id, name: u.full_name, email: u.email, phone: u.phone, createdAt: u.created_at, plan: u.plan, tier: u.tier, billing: u.billing, accessUntil: u.access_until, yearEndsAt: u.year_ends_at, renewalMode: u.renewal_mode })),
  });
}

/** Validates the money part of a create/edit body. Amount is typed before VAT unless `amountIncludesVat`. */
function amounts(b: Record<string, unknown>) {
  const raw = Number(String(b.amount ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(raw) || raw <= 0 || raw > 1_000_000) return null;
  const net = b.amountIncludesVat === true ? round2(raw / (1 + VAT_RATE)) : round2(raw);
  const vat = round2(net * VAT_RATE);
  return { amount_net: net, vat, amount_total: round2(net + vat) };
}
const isoOrNull = (v: unknown) => {
  if (!v) return null;
  const t = new Date(String(v));
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
};
const clip = (v: unknown, n: number) => {
  const s = String(v ?? "").trim().slice(0, n);
  return s || null;
};

/** Add a payment (usually a rep deal). With `orderId` it closes that pending order instead of creating a new one. */
export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return json({ error: "unauthorized" }, 401);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const supabase = db();

  const tier = String(b.tier ?? "");
  if (!PLANS.some((p) => p.id === tier)) return json({ error: "צריך לבחור מסלול" }, 422);
  const money = amounts(b);
  if (!money) return json({ error: "סכום לא תקין" }, 422);
  const status = String(b.status ?? "paid") as PayStatus;
  if (!PAY_STATUSES.includes(status)) return json({ error: "סטטוס לא תקין" }, 422);
  const channel = b.channel === "self" ? "self" : "rep";
  const method = PAY_METHODS.includes(b.method as (typeof PAY_METHODS)[number]) ? String(b.method) : null;
  const installments = Math.min(36, Math.max(1, Math.round(Number(b.installments ?? 1)) || 1));
  const userId = typeof b.userId === "string" && UUID.test(b.userId) ? b.userId : null;
  const orderId = typeof b.orderId === "string" && UUID.test(b.orderId) ? b.orderId : null;

  let user: { id: string; full_name: string; phone: string; email: string } | null = null;
  if (userId) {
    const { data } = await supabase.from("users").select("id, full_name, phone, email").eq("id", userId).maybeSingle();
    if (!data) return json({ error: "המשתמש לא נמצא" }, 404);
    user = data;
  }
  const name = cleanName(String(b.name ?? "")) || user?.full_name || "";
  if (name.length < 2) return json({ error: "צריך שם לקוח" }, 422);
  const phone = normalizeIsraeliPhone(String(b.phone ?? "")) || user?.phone || null;
  const emailIn = String(b.email ?? "").trim().toLowerCase();
  if (emailIn && !isEmail(emailIn)) return json({ error: "המייל לא תקין" }, 422);
  const email = emailIn || user?.email || null;
  const repName = channel === "rep" ? clip(b.repName, 80) ?? admin.displayName : clip(b.repName, 80);
  const paidAt = status === "paid" ? isoOrNull(b.paidAt) ?? new Date().toISOString() : null;

  const row = {
    user_id: user?.id ?? null,
    tier,
    billing: installments > 1 ? "installments" : "onetime",
    installments,
    ...money,
    status,
    channel,
    rep_name: repName,
    method,
    provider: channel === "self" ? clip(b.provider, 40) : null,
    provider_ref: clip(b.ref, 120),
    notes: clip(b.notes, 1000),
    customer_name: name,
    customer_phone: phone,
    customer_email: email,
    paid_at: paidAt,
    updated_at: new Date().toISOString(),
  };

  let id: string;
  let before: Record<string, unknown> | null = null;
  if (orderId) {
    const { data: o } = await supabase.from("orders").select(ORDER_COLS).eq("id", orderId).maybeSingle();
    if (!o) return json({ error: "ההזמנה לא נמצאה" }, 404);
    before = o;
    const { error } = await supabase.from("orders").update({ ...row, user_id: row.user_id ?? o.user_id }).eq("id", orderId);
    if (error) return json({ error: error.message }, 500);
    id = orderId;
  } else {
    const { data, error } = await supabase.from("orders").insert({ ...row, kind: "annual", source: "manual", created_by_admin: admin.id, created_at: new Date().toISOString() }).select("id").single();
    if (error || !data) return json({ error: error?.message ?? "insert failed" }, 500);
    id = data.id;
  }

  // optional: open the plan for the linked member (courses + the usual purchase automation)
  let activated: unknown = null;
  const linkedUser = (user?.id ?? (before?.user_id as string | null)) || null;
  if (b.activate === true && status === "paid" && linkedUser) {
    try {
      activated = await activateSubscription({ userId: linkedUser, tier: tier as Tier, billing: row.billing as "onetime" | "installments", channel, by: repName ?? admin.displayName, orderId: id, adminId: admin.id });
      await supabase.from("orders").update({ paid_at: paidAt }).eq("id", id); // keep the date the admin typed
    } catch (e) {
      activated = { error: (e as Error).message };
    }
  }
  if (linkedUser && status === "paid") await supabase.from("users").update({ renewal_requested_at: null }).eq("id", linkedUser);

  await supabase.from("admin_audit").insert({ admin_id: admin.id, user_id: linkedUser, action: orderId ? "payment_close_request" : "payment_create", meta: { order_id: id, row, before, activate: b.activate === true, activated } });
  return json({ ok: true, id, activated });
}

/** Edit one payment: { id, action: "status" | "refund" | "edit", ... }. */
export async function PATCH(req: Request) {
  const admin = await getAdmin();
  if (!admin) return json({ error: "unauthorized" }, 401);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(b.id ?? "");
  if (!UUID.test(id)) return json({ error: "bad id" }, 400);
  const supabase = db();
  const { data: o } = await supabase.from("orders").select(ORDER_COLS).eq("id", id).maybeSingle();
  if (!o) return json({ error: "not found" }, 404);
  const action = String(b.action ?? "");
  const now = new Date().toISOString();
  let patch: Record<string, unknown>;

  if (action === "status") {
    const status = String(b.status ?? "") as PayStatus;
    if (!PAY_STATUSES.includes(status)) return json({ error: "סטטוס לא תקין" }, 422);
    patch = { status, updated_at: now };
    if (status === "paid" && !o.paid_at) patch.paid_at = now;
    if (status === "refunded" && !o.refunded_at) {
      patch.refunded_at = now;
      patch.refund_amount = o.refund_amount ?? o.amount_total;
    }
  } else if (action === "refund") {
    const total = Number(o.amount_total);
    const amt = b.amount == null || b.amount === "" ? total : Number(String(b.amount).replace(/[^\d.]/g, ""));
    if (!Number.isFinite(amt) || amt <= 0 || amt > total + 0.01) return json({ error: "סכום ההחזר לא תקין" }, 422);
    const note = clip(b.note, 400);
    patch = { status: "refunded", refund_amount: round2(amt), refunded_at: isoOrNull(b.refundedAt) ?? now, updated_at: now, ...(note ? { notes: [o.notes, `החזר: ${note}`].filter(Boolean).join("\n").slice(0, 1000) } : {}) };
  } else if (action === "edit") {
    patch = { updated_at: now };
    if ("notes" in b) patch.notes = clip(b.notes, 1000);
    if ("repName" in b) patch.rep_name = clip(b.repName, 80);
    if ("ref" in b) patch.provider_ref = clip(b.ref, 120);
    if ("method" in b) patch.method = PAY_METHODS.includes(b.method as (typeof PAY_METHODS)[number]) ? b.method : null;
    if ("paidAt" in b) patch.paid_at = isoOrNull(b.paidAt);
    if ("amount" in b) {
      const m = amounts(b);
      if (!m) return json({ error: "סכום לא תקין" }, 422);
      Object.assign(patch, m);
    }
  } else return json({ error: "bad action" }, 400);

  const { error } = await supabase.from("orders").update(patch).eq("id", id);
  if (error) return json({ error: error.message }, 500);
  await supabase.from("admin_audit").insert({ admin_id: admin.id, user_id: o.user_id, action: `payment_${action}`, meta: { order_id: id, patch, before: { status: o.status, amount_total: o.amount_total, refund_amount: o.refund_amount, notes: o.notes, rep_name: o.rep_name, paid_at: o.paid_at } } });
  return json({ ok: true });
}

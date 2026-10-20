import { db } from "@/lib/supabase";
import { getAdmin, json } from "@/lib/adminAuth";
import { accessOf } from "@/lib/session";
import { activateSubscription } from "@/lib/subscription";
import { PLANS, type Billing, type Tier } from "@/lib/plans";
import { moneyFromProfile } from "@/lib/money";

export const runtime = "nodejs";

const DAY = 86400_000;

/** Back-office: list users with subscription status, plus open requests. */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return json({ error: "unauthorized" }, 401);
  const supabase = db();
  const [{ data: users }, { data: convs }, { data: leads }, { data: usage }] = await Promise.all([
    supabase.from("users").select("id, full_name, email, phone, created_at, plan, tier, billing, renewal_mode, access_until, paid_at, paid_by, renewal_requested_at, admin_note, profile").order("created_at", { ascending: false }).limit(2000),
    supabase.from("conversations").select("user_id, updated_at").order("updated_at", { ascending: false }).limit(20000),
    supabase.from("leads").select("id, user_id, meeting_type, full_name, phone, email, note, created_at, status").order("created_at", { ascending: false }).limit(500),
    supabase.from("user_usage_30d").select("user_id, answers, tokens_in, tokens_out, answers_today"),
  ]);
  // Flash-Lite list prices (USD per 1M tokens) → shekels at ~3.7
  const use = new Map((usage ?? []).map((u) => [u.user_id, u]));
  const costIls = (i: number, o: number) => Math.round(((i * 0.25 + o * 1.5) / 1e6) * 3.7 * 100) / 100;
  const stats = new Map<string, { n: number; last: string }>();
  for (const c of convs ?? []) {
    const s = stats.get(c.user_id);
    if (s) s.n++;
    else stats.set(c.user_id, { n: 1, last: c.updated_at });
  }
  const rows = (users ?? []).map((u) => {
    const a = accessOf(u);
    const st = stats.get(u.id);
    const profile = (u.profile ?? {}) as Record<string, unknown>;
    return {
      id: u.id,
      name: u.full_name,
      email: u.email,
      phone: u.phone,
      createdAt: u.created_at,
      status: a.status,
      tier: a.tier,
      billing: u.billing,
      accessUntil: a.accessUntil,
      daysLeft: a.daysLeft,
      paidAt: u.paid_at,
      paidBy: u.paid_by,
      renewalRequestedAt: u.renewal_requested_at,
      note: u.admin_note,
      business: [profile.business_type, profile.business_name].filter(Boolean).join(" · ") || null,
      conversations: st?.n ?? 0,
      answers30: use.get(u.id)?.answers ?? 0,
      answersToday: use.get(u.id)?.answers_today ?? 0,
      cost30: costIls(Number(use.get(u.id)?.tokens_in ?? 0), Number(use.get(u.id)?.tokens_out ?? 0)),
      lastActive: st?.last ?? null,
      money: moneyFromProfile(profile)?.score ?? null,
      moneyLevel: moneyFromProfile(profile)?.levelLabel ?? null,
    };
  });
  return json({ admin, users: rows, leads: leads ?? [] });
}

/** Back-office actions on one user: paid (1 year), extend30, block, note. */
export async function PATCH(req: Request) {
  const admin = await getAdmin();
  if (!admin) return json({ error: "unauthorized" }, 401);
  const b = await req.json().catch(() => ({}));
  const userId = String(b.userId ?? "");
  const action = String(b.action ?? "");
  if (!/^[0-9a-f-]{36}$/.test(userId)) return json({ error: "bad user" }, 400);
  const supabase = db();
  const { data: u } = await supabase.from("users").select("id, access_until, plan").eq("id", userId).maybeSingle();
  if (!u) return json({ error: "not found" }, 404);
  const now = Date.now();
  const current = Math.max(now, new Date(u.access_until).getTime());
  let patch: Record<string, unknown>;
  if (action === "paid") {
    // a rep closed the deal: open the chosen plan (a year from the end of the gift month), courses + automations
    const tier = (PLANS.some((p) => p.id === b.tier) ? b.tier : "basic") as Tier;
    const billing = (b.billing === "installments" ? "installments" : "onetime") as Billing;
    try {
      const r = await activateSubscription({ userId, tier, billing, channel: "rep", by: admin.displayName });
      await supabase.from("admin_audit").insert({ admin_id: admin.id, user_id: userId, action, meta: { tier, billing, ...r } });
      return json({ ok: true, ...r });
    } catch (e) {
      return json({ error: (e as Error).message }, 500);
    }
  } else if (action === "extend30") {
    patch = { access_until: new Date(current + 30 * DAY).toISOString() };
  } else if (action === "block") {
    patch = { access_until: new Date(now - 1000).toISOString() };
  } else if (action === "clear_request") {
    patch = { renewal_requested_at: null };
  } else if (action === "note") {
    patch = { admin_note: String(b.note ?? "").slice(0, 500) || null };
  } else return json({ error: "bad action" }, 400);
  const { error } = await supabase.from("users").update(patch).eq("id", userId);
  if (error) return json({ error: error.message }, 500);
  await supabase.from("admin_audit").insert({ admin_id: admin.id, user_id: userId, action, meta: patch });
  return json({ ok: true, patch });
}

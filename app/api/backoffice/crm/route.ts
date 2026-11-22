import { db } from "@/lib/supabase";
import { getAdmin, hiddenFor, json } from "@/lib/adminAuth";
import { isCrmStatus, logActivity, MEETING_LABEL, PARTNERS, statusLabel } from "@/lib/crm";
import { planById } from "@/lib/plans";

export const runtime = "nodejs";

const fmtIL = (iso: string) => new Date(iso).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Back-office CRM: leads (onboarding meetings first), their activity, admins, and external sales. */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return json({ error: "unauthorized" }, 401);
  const supabase = db();
  const [{ data: leads }, { data: acts }, { data: admins }, { data: sales }] = await Promise.all([
    supabase.from("leads").select("id, user_id, meeting_type, full_name, phone, email, note, summary, trigger, status, created_at, updated_at, assigned_to, meeting_at, next_call_at").order("created_at", { ascending: false }).limit(3000),
    supabase.from("lead_activities").select("id, lead_id, user_id, admin_id, kind, body, meta, synced_at, created_at").order("created_at", { ascending: false }).limit(5000),
    supabase.from("admins").select("id, display_name, username").order("created_at"),
    supabase.from("external_sales").select("id, user_id, customer_name, customer_phone, partner, product, amount_net, commission_pct, commission_amount, commission_paid, sold_at, admin_id, note, created_at").order("sold_at", { ascending: false }).limit(2000),
  ]);
  const userIds = [...new Set((leads ?? []).map((l) => l.user_id).filter(Boolean))] as string[];
  const users = new Map<string, { plan: string; tier: string | null; access_until: string | null; created_at: string; paid_at: string | null }>();
  for (let i = 0; i < userIds.length; i += 500) {
    const { data } = await supabase.from("users").select("id, plan, tier, access_until, created_at, paid_at").in("id", userIds.slice(i, i + 500));
    for (const u of data ?? []) users.set(u.id, u);
  }
  const now = Date.now();
  // A partner admin (data_since) does not see customers who bought before their start date.
  const pastBuyers = new Set([...users.entries()].filter(([, u]) => hiddenFor(admin, u.paid_at)).map(([id]) => id));
  const rows = (leads ?? []).filter((l) => !(l.user_id && pastBuyers.has(l.user_id))).map((l) => {
    const u = l.user_id ? users.get(l.user_id) : undefined;
    const status = !u ? "lead" : u.plan === "paid" ? "paid" : u.access_until && Date.parse(u.access_until) < now ? "expired" : "trial";
    return { ...l, user: u ? { status, tier: u.tier ? planById(u.tier)?.name ?? u.tier : null, signedUp: u.created_at } : null };
  });
  const leadIds = new Set(rows.map((l) => l.id));
  const visibleActs = (acts ?? []).filter((a) => !a.lead_id || leadIds.has(a.lead_id));
  const visibleSales = (sales ?? []).filter((s) => !hiddenFor(admin, s.sold_at) && !(s.user_id && pastBuyers.has(s.user_id)));
  return json({ me: admin, admins: admins ?? [], leads: rows, activities: visibleActs, sales: visibleSales });
}

/** Update a lead: status / assign / meeting time / next call / note / call logged. Every change is logged and mirrored to Fireberry. */
export async function PATCH(req: Request) {
  const admin = await getAdmin();
  if (!admin) return json({ error: "unauthorized" }, 401);
  const b = await req.json().catch(() => ({}));
  const supabase = db();
  const { data: lead } = await supabase.from("leads").select("id, user_id, full_name, phone, email, status, meeting_type").eq("id", String(b.leadId ?? "")).maybeSingle();
  if (!lead) return json({ error: "not found" }, 404);
  const contact = { phone: lead.phone, full_name: lead.full_name, email: lead.email };
  const base = { leadId: lead.id, userId: lead.user_id, adminId: admin.id, adminName: admin.displayName, contact };
  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const done: string[] = [];

  if (b.status !== undefined) {
    if (!isCrmStatus(b.status)) return json({ error: "bad status" }, 422);
    upd.status = b.status;
    if (!lead.status || lead.status === "new") upd.assigned_to = admin.id;
    done.push(`סטטוס: ${statusLabel(b.status)}`);
  }
  if (b.meetingAt !== undefined) {
    const t = b.meetingAt ? Date.parse(String(b.meetingAt)) : NaN;
    upd.meeting_at = Number.isFinite(t) ? new Date(t).toISOString() : null;
    if (upd.meeting_at && b.status === undefined) upd.status = "scheduled";
  }
  if (b.nextCallAt !== undefined) {
    const t = b.nextCallAt ? Date.parse(String(b.nextCallAt)) : NaN;
    upd.next_call_at = Number.isFinite(t) ? new Date(t).toISOString() : null;
  }
  if (b.assignTo !== undefined) {
    upd.assigned_to = b.assignTo ? String(b.assignTo) : null;
  }
  const { error } = await supabase.from("leads").update(upd).eq("id", lead.id);
  if (error) return json({ error: "save failed" }, 500);

  const note = String(b.note ?? "").trim().slice(0, 2000);
  let synced = true;
  const log = async (kind: "note" | "call" | "status" | "meeting" | "assign", body: string, extra: Record<string, unknown> = {}) => {
    const r = await logActivity({ ...base, kind, body, ...extra });
    synced = synced && r.synced;
  };
  if (upd.meeting_at) await log("meeting", `נקבעה ${MEETING_LABEL[lead.meeting_type] ?? "פגישה"}: ${fmtIL(String(upd.meeting_at))}${note ? `\n${note}` : ""}`, { meetingAt: upd.meeting_at, status: "scheduled" });
  else if (b.status !== undefined) await log(b.call ? "call" : "status", `${done.join(" · ")}${note ? `\n${note}` : ""}`, { status: b.status });
  else if (note) await log(b.call ? "call" : "note", note);
  if (upd.next_call_at) await log("note", `לחזור אליו: ${fmtIL(String(upd.next_call_at))}`);
  if (b.assignTo !== undefined) {
    const { data: who } = b.assignTo ? await supabase.from("admins").select("display_name").eq("id", String(b.assignTo)).maybeSingle() : { data: null };
    await log("assign", who ? `הליד הועבר ל${who.display_name}` : "הליד שוחרר מהשיוך");
  }
  return json({ ok: true, synced });
}

/** Add an external sale (e.g. a package Olmo sold) under a customer card, with the commission owed to us. */
export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin) return json({ error: "unauthorized" }, 401);
  const b = await req.json().catch(() => ({}));
  const supabase = db();
  if (b.action === "commission_paid") {
    const { error } = await supabase.from("external_sales").update({ commission_paid: !!b.paid }).eq("id", String(b.saleId ?? ""));
    return error ? json({ error: "save failed" }, 500) : json({ ok: true });
  }
  const product = String(b.product ?? "").trim().slice(0, 200);
  const amount = Number(b.amountNet);
  const pct = Number(b.commissionPct);
  const partner = PARTNERS[String(b.partner)] ? String(b.partner) : "olmo";
  const errors: Record<string, string> = {};
  if (!product) errors.product = "מה נמכר?";
  if (!Number.isFinite(amount) || amount <= 0) errors.amountNet = "סכום לא תקין";
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) errors.commissionPct = "אחוז בין 0 ל-100";
  let lead: { id: string; user_id: string | null; full_name: string; phone: string; email: string | null } | null = null;
  if (b.leadId) {
    const { data } = await supabase.from("leads").select("id, user_id, full_name, phone, email").eq("id", String(b.leadId)).maybeSingle();
    lead = data;
  }
  const name = lead?.full_name ?? String(b.customerName ?? "").trim();
  if (!name) errors.customerName = "שם הלקוח";
  if (Object.keys(errors).length) return json({ errors }, 422);
  const soldAt = b.soldAt && /^\d{4}-\d{2}-\d{2}$/.test(String(b.soldAt)) ? String(b.soldAt) : new Date().toISOString().slice(0, 10);
  const { data: sale, error } = await supabase
    .from("external_sales")
    .insert({ user_id: lead?.user_id ?? null, customer_name: name, customer_phone: lead?.phone ?? (String(b.customerPhone ?? "").replace(/\D/g, "") || null), partner, product, amount_net: amount, commission_pct: pct, sold_at: soldAt, admin_id: admin.id, note: String(b.note ?? "").slice(0, 1000) || null })
    .select("id, commission_amount")
    .single();
  if (error || !sale) return json({ error: "save failed" }, 500);
  const body = `מכירה חיצונית (${PARTNERS[partner]}): ${product} · ${amount.toLocaleString("he-IL")} ₪ לפני מע"מ · עמלה ${pct}% = ${Number(sale.commission_amount).toLocaleString("he-IL")} ₪`;
  const r = await logActivity({ leadId: lead?.id ?? null, userId: lead?.user_id ?? null, adminId: admin.id, adminName: admin.displayName, kind: "sale", body, meta: { sale_id: sale.id }, contact: { phone: lead?.phone ?? (String(b.customerPhone ?? "") || null), full_name: name, email: lead?.email }, status: lead ? "sold" : null });
  if (lead) await supabase.from("leads").update({ status: "sold", updated_at: new Date().toISOString() }).eq("id", lead.id);
  return json({ ok: true, synced: r.synced, saleId: sale.id });
}

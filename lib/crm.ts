import { db } from "./supabase";

/**
 * Platform CRM: every signup opens an onboarding lead ("פגישת הטמעה והדרכה"), the call center works it
 * from the back office, and every update is mirrored to Fireberry as a note on the person's
 * Duvdevani Platform opportunity (Make scenario behind CRM_WEBHOOK_URL).
 */
import { CRM_STATUSES, MEETING_LABEL, PARTNERS, statusLabel, isCrmStatus, type CrmStatus } from "./crmShared";
export { CRM_STATUSES, MEETING_LABEL, PARTNERS, statusLabel, isCrmStatus, type CrmStatus };

type SyncPayload = {
  kind: "onboarding_opened" | "status" | "note" | "call" | "meeting" | "assign" | "sale";
  phone: string | null;
  full_name: string | null;
  email?: string | null;
  text: string;
  admin?: string | null;
  lead_id?: string | null;
  meeting_at?: string | null;
  status?: string | null;
};

/** Mirror one CRM update to Fireberry (via Make). Never throws; returns whether it was delivered. */
export async function syncCrm(p: SyncPayload): Promise<boolean> {
  const url = process.env.CRM_WEBHOOK_URL;
  if (!url || !p.phone) return false;
  const phone = p.phone.replace(/\D/g, "");
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, phone, phone_e164: `+972${phone.replace(/^0/, "")}`, at: new Date().toISOString(), source: "Duvdevani Platform · בק אופיס", notetext_json: JSON.stringify(`~~~ Duvdevani Platform · CRM ~~~\n${p.text}${p.admin ? `\nנציג: ${p.admin}` : ""}`).slice(1, -1) }),
    });
    return r.ok;
  } catch (e) {
    console.error("crm sync failed", e);
    return false;
  }
}

/** Record an activity on a lead and mirror it to Fireberry. */
export async function logActivity(a: { leadId: string | null; userId: string | null; adminId: string | null; adminName?: string | null; kind: "note" | "call" | "status" | "meeting" | "sale" | "assign"; body: string; meta?: Record<string, unknown>; contact: { phone: string | null; full_name: string | null; email?: string | null }; sync?: SyncPayload["kind"]; meetingAt?: string | null; status?: string | null }) {
  const supabase = db();
  const { data: row } = await supabase
    .from("lead_activities")
    .insert({ lead_id: a.leadId, user_id: a.userId, admin_id: a.adminId, kind: a.kind, body: a.body, meta: a.meta ?? {} })
    .select("id")
    .single();
  const ok = await syncCrm({ kind: a.sync ?? a.kind, phone: a.contact.phone, full_name: a.contact.full_name, email: a.contact.email, text: a.body, admin: a.adminName ?? null, lead_id: a.leadId, meeting_at: a.meetingAt ?? null, status: a.status ?? null });
  if (ok && row) await supabase.from("lead_activities").update({ synced_at: new Date().toISOString() }).eq("id", row.id);
  return { id: row?.id ?? null, synced: ok };
}

/**
 * Every new account gets an onboarding & training meeting: a lead for the call center
 * (rep calls within 24 hours). One open onboarding lead per user.
 */
export async function openOnboardingLead(u: { userId: string; fullName: string; phone: string | null; email: string | null; source: string }) {
  const supabase = db();
  const { data: existing } = await supabase.from("leads").select("id").eq("user_id", u.userId).eq("meeting_type", "onboarding").limit(1).maybeSingle();
  if (existing) return existing.id as string;
  const { data: lead } = await supabase
    .from("leads")
    .insert({ user_id: u.userId, meeting_type: "onboarding", full_name: u.fullName, phone: u.phone ?? "", email: u.email, status: "new", trigger: u.source, note: "נרשם לפלטפורמה. לתאם פגישת הטמעה והדרכה תוך 24 שעות." })
    .select("id")
    .single();
  if (!lead) return null;
  await logActivity({
    leadId: lead.id,
    userId: u.userId,
    adminId: null,
    kind: "status",
    body: "נרשם לפלטפורמה וקיבל פגישת הטמעה והדרכה. נציג חוזר אליו תוך 24 שעות לתיאום.",
    contact: { phone: u.phone, full_name: u.fullName, email: u.email },
    sync: "onboarding_opened",
    status: "new",
  });
  return lead.id as string;
}

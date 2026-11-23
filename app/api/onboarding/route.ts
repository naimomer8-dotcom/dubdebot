import { db } from "@/lib/supabase";
import { getSession } from "@/lib/session";
import { alert } from "@/lib/alerts";
import { logActivity } from "@/lib/crm";
import { SLOTS, nextAt, whenLabel } from "@/lib/callSlots";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The signed-in user's 15-minute explanation call: waiting (and the window they picked), or booked. */
export async function GET() {
  const sess = await getSession();
  if (!sess) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { data } = await db().from("leads").select("status, meeting_at, next_call_at, created_at").eq("user_id", sess.userId).eq("meeting_type", "onboarding").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return Response.json({ onboarding: null }, { headers: { "Cache-Control": "no-store" } });
  const stage = data.status === "met" || data.status === "sold" ? "done" : data.status === "scheduled" && data.meeting_at ? "booked" : data.status === "not_relevant" ? "closed" : "waiting";
  return Response.json({ onboarding: { stage, meetingAt: data.meeting_at, callAt: data.next_call_at, since: data.created_at } }, { headers: { "Cache-Control": "no-store" } });
}

/** The person picks morning / noon / evening for the call: "לחזור אליו" at that window, a CRM note and a team alert. */
export async function POST(req: Request) {
  const sess = await getSession();
  if (!sess) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { slot } = (await req.json().catch(() => ({}))) as { slot?: string };
  const s = SLOTS.find((x) => x.id === slot);
  if (!s) return Response.json({ error: "bad slot" }, { status: 400 });
  const supabase = db();
  const { data: lead } = await supabase.from("leads").select("id, user_id, full_name, phone, email, status").eq("user_id", sess.userId).eq("meeting_type", "onboarding").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!lead) return Response.json({ error: "no lead" }, { status: 404 });
  if (["scheduled", "met", "sold"].includes(lead.status)) return Response.json({ ok: true, unchanged: true });
  const at = nextAt(s.hour);
  await supabase.from("leads").update({ next_call_at: at.toISOString(), status: "callback", updated_at: new Date().toISOString() }).eq("id", lead.id);
  const body = `בחר מועד באתר: ביקש את שיחת ההסבר (רבע שעה) ב${s.label}. נקבע "לחזור אליו" ל-${whenLabel(at)}.`;
  await logActivity({ leadId: lead.id, userId: lead.user_id, adminId: null, kind: "note", body, contact: { phone: lead.phone, full_name: lead.full_name, email: lead.email }, status: "callback" });
  await alert(`call_pick:${lead.id}`, `ביקש שיחת הסבר: ${lead.full_name}`, [`${lead.full_name} · ${lead.phone}`, body], 30);
  return Response.json({ ok: true, callAt: at.toISOString() });
}

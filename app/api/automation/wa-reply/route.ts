import { timingSafeEqual } from "crypto";
import { db } from "@/lib/supabase";
import { alert } from "@/lib/alerts";
import { logActivity } from "@/lib/crm";
import { normalizeIsraeliPhone } from "@/lib/validation";
import { SLOTS, nextAt, whenLabel } from "@/lib/callSlots";

export const runtime = "nodejs";

/**
 * WhatsApp button replies from ManyChat (flows "DP2 | reply rep / slot / postpone", External Request with
 * Full Contact Data). ?k=<WA_REPLY_TOKEN>&r=rep|slot|postpone.
 * The reply lands on the person's onboarding lead as a note (mirrored to Fireberry), sets "לחזור אליו"
 * and alerts the team.
 */
function pickPhone(b: Record<string, unknown>): string | null {
  const cf = (b.custom_fields ?? {}) as Record<string, unknown>;
  const tries = [b.whatsapp_phone, b.phone, ...Object.values(cf)];
  for (const t of tries) {
    const p = normalizeIsraeliPhone(String(t ?? ""));
    if (p) return p;
  }
  return null;
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const token = process.env.WA_REPLY_TOKEN || "";
  const k = Buffer.from(url.searchParams.get("k") ?? "");
  if (!token || k.length !== token.length || !timingSafeEqual(k, Buffer.from(token))) return new Response("unauthorized", { status: 401 });
  const kind = url.searchParams.get("r") ?? "rep";
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const phone = pickPhone(b);
  const text = String(b.last_input_text ?? "").trim().slice(0, 200);
  if (!phone) return Response.json({ ok: false, reason: "no phone" });

  const supabase = db();
  const { data: user } = await supabase.from("users").select("id, full_name, email").eq("phone", phone).maybeSingle();

  // Removal request ("הסר" / "הסרה" / STOP), from the dedicated keyword flow (r=optout) or typed into any reply.
  if (kind === "optout" || /^(הסר|הסרה|הסירו|להסרה|תסירו|stop|unsubscribe)[.!\s]*$/i.test(text) || /הסר(ה)?\s*(אותי|מרשימ)/.test(text)) {
    const now = new Date().toISOString();
    if (user) await supabase.from("users").update({ marketing_opt_out: true, unsubscribed_at: now }).eq("id", user.id);
    const { data: ld } = await supabase.from("leads").select("id, user_id, full_name, phone, email").eq("phone", phone).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (ld) await logActivity({ leadId: ld.id, userId: ld.user_id, adminId: null, kind: "note", body: "ביקש הסרה בוואטסאפ (\"הסר\"). הוסר מכל הדיוור השיווקי. לא לשלוח לו הודעות שיווקיות.", contact: { phone: ld.phone, full_name: ld.full_name, email: ld.email } });
    await alert(`wa_optout:${phone}`, `בקשת הסרה מוואטסאפ: ${user?.full_name ?? ld?.full_name ?? phone}`, [`${phone}`, user ? "סומן כמוסר מדיוור בפלטפורמה." : "לא נמצא משתמש למספר הזה. לבדוק ידנית."], 30);
    return Response.json({ ok: true, optout: true, user: !!user });
  }
  let { data: lead } = await supabase.from("leads").select("id, user_id, full_name, phone, email, status, assigned_to").eq("phone", phone).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!lead && user) {
    const { data } = await supabase.from("leads").select("id, user_id, full_name, phone, email, status, assigned_to").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    lead = data;
  }
  const name = lead?.full_name ?? user?.full_name ?? String(b.name ?? "");

  let body = "";
  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (kind === "slot") {
    const s = SLOTS.find((x) => text.includes(x.word));
    const at = nextAt(s?.hour ?? 9);
    upd.next_call_at = at.toISOString();
    if (!["scheduled", "met", "sold"].includes(lead?.status ?? "")) upd.status = "callback";
    body = `ענה בוואטסאפ: ביקש את שיחת ההסבר (רבע שעה) ב${s?.label ?? (text || "בוקר")}. נקבע "לחזור אליו" ל-${whenLabel(at)}.`;
  } else if (kind === "postpone") {
    upd.status = "callback";
    upd.next_call_at = new Date().toISOString();
    body = "ענה בוואטסאפ: מבקש לדחות את הפגישה. לחזור אליו לתאם מועד חדש.";
  } else {
    upd.next_call_at = new Date().toISOString();
    if (!["scheduled", "met", "sold"].includes(lead?.status ?? "")) upd.status = "callback";
    body = text.includes("אסטרטגיה")
      ? "ענה בוואטסאפ: מבקש פגישת אסטרטגיה (ניר / נדב / תומר). ליד חם, לחזור היום ולקבוע."
      : `ענה בוואטסאפ: ${text ? `"${text}" · ` : ""}רוצה שנציג יחזור אליו. ליד חם, לחזור היום.`;
  }

  if (lead) {
    await supabase.from("leads").update(upd).eq("id", lead.id);
    await logActivity({ leadId: lead.id, userId: lead.user_id, adminId: null, kind: "note", body, contact: { phone: lead.phone, full_name: lead.full_name, email: lead.email }, status: (upd.status as string) ?? null });
  }
  let rep = "";
  if (lead?.assigned_to) {
    const { data: a } = await supabase.from("admins").select("display_name").eq("id", lead.assigned_to).maybeSingle();
    rep = a?.display_name ?? "";
  }
  await alert(`wa_reply:${phone}:${kind}`, `${kind === "postpone" ? "מבקש לדחות פגישה" : "ליד חם מוואטסאפ"}: ${name}`, [`${name} · ${phone}`, body, rep ? `נציג משויך: ${rep}` : "אין נציג משויך. לשייך ולחזור.", lead ? "" : "לא נמצא ליד ב-CRM למספר הזה."], 30);
  return Response.json({ ok: true, lead: !!lead });
}

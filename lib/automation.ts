import { createHmac } from "crypto";
import { db } from "./supabase";

/**
 * Automation bus: every lifecycle event is stored in `events` and pushed to Make
 * (MAKE_EVENTS_WEBHOOK_URL), which routes it to ManyChat (WhatsApp / Instagram) and email.
 * Payloads are signed with X-Signature = HMAC-SHA256(body, AUTOMATION_SECRET).
 */
export type AutomationEvent =
  | "signup"
  | "first_question"
  | "activated"
  | "checkout_started"
  | "purchase"
  | "upgrade"
  | "rep_requested"
  | "referral_reward" // a friend who joined via this member's link paid → sales workshop seat
  | "journey"; // a scheduled journey stage (see lib/journeys.ts)

export async function contactOf(userId: string) {
  const { data } = await db()
    .from("users")
    .select("id, full_name, email, phone, plan, tier, billing, access_until, created_at, year_ends_at, renewal_mode, marketing_opt_out")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;
  const phone = String(data.phone ?? "").replace(/\D/g, "");
  return {
    id: data.id,
    first_name: String(data.full_name ?? "").split(" ")[0],
    full_name: data.full_name,
    email: data.email,
    phone,
    phone_e164: phone ? `+972${phone.replace(/^0/, "")}` : null,
    plan: data.plan === "paid" ? "paid" : "trial",
    tier: data.tier,
    billing: data.billing,
    access_until: data.access_until,
    signed_up_at: data.created_at,
    year_ends_at: data.year_ends_at,
    renewal_mode: data.renewal_mode,
    marketing_opt_out: data.marketing_opt_out,
  };
}

export async function emit(event: AutomationEvent, userId: string, data: Record<string, unknown> = {}) {
  try {
    await db().from("events").insert({ user_id: userId, type: `auto:${event === "journey" ? `journey:${data.stage}` : event}`, meta: data });
  } catch {}
  const url = process.env.MAKE_EVENTS_WEBHOOK_URL;
  if (!url) return { sent: false, reason: "MAKE_EVENTS_WEBHOOK_URL not set" };
  const contact = await contactOf(userId);
  if (!contact) return { sent: false, reason: "no user" };
  const body = JSON.stringify({ event, at: new Date().toISOString(), app: process.env.PUBLIC_APP_URL || "https://dubdebot.vercel.app", contact, data });
  const secret = process.env.AUTOMATION_SECRET || process.env.SESSION_SECRET || "";
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Signature": createHmac("sha256", secret).update(body).digest("hex") },
      body,
      signal: AbortSignal.timeout(8000),
    });
    return { sent: r.ok, status: r.status };
  } catch (e) {
    console.error("automation emit failed", event, (e as Error).message);
    return { sent: false, reason: "network" };
  }
}

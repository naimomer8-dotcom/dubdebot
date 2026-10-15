import { createHmac } from "crypto";
import { db } from "./supabase";

/**
 * Ops alerts by email to the team (ALERT_EMAIL, default omern@rnd.org.il).
 * Rides the existing Make "journey → email" route (Rav Messer), so no new scenario is needed.
 * De-duplicated: the same `key` is sent at most once per `everyMin` minutes.
 */
export async function alert(key: string, subject: string, lines: string[], everyMin = 60) {
  try {
    const supabase = db();
    const { data: prev } = await supabase.from("alerts_sent").select("sent_at").eq("key", key).maybeSingle();
    if (prev && Date.now() - new Date(prev.sent_at).getTime() < everyMin * 60_000) return { sent: false, reason: "throttled" };
    await supabase.from("alerts_sent").upsert({ key, sent_at: new Date().toISOString() });

    const url = process.env.MAKE_EVENTS_WEBHOOK_URL;
    if (!url) return { sent: false, reason: "no webhook" };
    const email = process.env.ALERT_EMAIL || "omern@rnd.org.il";
    const text = [...lines, "", `זמן: ${new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}`].join("\n");
    const body = JSON.stringify({
      event: "journey",
      at: new Date().toISOString(),
      app: process.env.PUBLIC_APP_URL || "https://dubdebot.vercel.app",
      contact: { id: "ops-alert", first_name: "צוות", full_name: "התראות Duvdevani Platform", email, phone: "", plan: "trial" },
      data: { stage: `alert:${key}`, track: "ops", whatsapp_template: "", email_subject: `⚠️ Duvdevani Platform: ${subject}`, text, email_parts: [text, "", "", ""], vars: { plans_url: `${process.env.PUBLIC_APP_URL || "https://dubdebot.vercel.app"}/admin` }, transactional: true },
    });
    const secret = process.env.AUTOMATION_SECRET || process.env.SESSION_SECRET || "";
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "X-Signature": createHmac("sha256", secret).update(body).digest("hex") }, body, signal: AbortSignal.timeout(8000) });
    return { sent: r.ok };
  } catch (e) {
    console.error("alert failed", key, (e as Error).message);
    return { sent: false, reason: "error" };
  }
}

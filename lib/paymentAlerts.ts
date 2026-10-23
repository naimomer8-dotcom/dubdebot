import { createHmac } from "crypto";
import { emailParts } from "./journeys";
import { appUrl } from "./cardcom";

/**
 * "New payment" notification to the owners (Omer + Nir), by email and WhatsApp.
 * - Email rides the existing Make "journey → email" route (same path as ops alerts), one message per recipient.
 * - WhatsApp needs its own Make scenario (PAYMENT_ALERT_WEBHOOK_URL) that sends a WhatsApp template to each phone;
 *   until it exists, only email goes out.
 * Recipients: PAYMENT_NOTIFY_EMAILS / PAYMENT_NOTIFY_PHONES (comma separated).
 */
const list = (v: string | undefined, dflt: string) => (v || dflt).split(",").map((s) => s.trim()).filter(Boolean);

export type PaidInfo = {
  orderId: string;
  name: string;
  phone: string | null;
  email: string | null;
  plan: string;
  kind: string; // "annual" | "upgrade" | "monthly69"
  payments: number;
  total: number;
  net: number;
  docNumber?: string | null;
  docUrl?: string | null;
  provider: string;
  ref?: string | null;
};

function sign(body: string) {
  const secret = process.env.AUTOMATION_SECRET || process.env.SESSION_SECRET || "";
  return createHmac("sha256", secret).update(body).digest("hex");
}

export async function notifyPayment(p: PaidInfo) {
  const kindLabel = p.kind === "monthly69" ? "חידוש חודשי" : p.kind === "upgrade" ? "שדרוג" : "רכישה";
  const lines = [
    `${kindLabel} חדשה בפלטפורמה 🍒`,
    `לקוח: ${p.name}`,
    `טלפון: ${p.phone ?? "-"}`,
    `מייל: ${p.email ?? "-"}`,
    `מסלול: ${p.plan}`,
    `סכום: ₪${p.total.toLocaleString("he-IL")} כולל מע״מ${p.payments > 1 ? ` · ${p.payments} תשלומים` : " · תשלום אחד"}`,
    p.docNumber ? `חשבונית מס/קבלה מס׳ ${p.docNumber}` : "",
    `הזמנה: ${p.orderId.slice(0, 8)} · ${p.provider}${p.ref ? ` #${p.ref}` : ""}`,
  ].filter(Boolean);
  const text = [...lines, "", `זמן: ${new Date().toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}`].join("\n");
  const app = appUrl();
  const out: { email: number; whatsapp: boolean } = { email: 0, whatsapp: false };

  const events = process.env.MAKE_EVENTS_WEBHOOK_URL;
  if (events) {
    for (const email of list(process.env.PAYMENT_NOTIFY_EMAILS, process.env.ALERT_EMAIL || "omern@rnd.org.il")) {
      const body = JSON.stringify({
        event: "journey",
        at: new Date().toISOString(),
        app,
        contact: { id: `pay-alert:${email}`, first_name: "צוות", full_name: "התראות תשלום", email, phone: "", plan: "trial" },
        data: { stage: `pay:${p.orderId}`, track: "ops", whatsapp_template: "", email_subject: `💳 ${kindLabel}: ${p.name} · ₪${p.total.toLocaleString("he-IL")}`, text, email_parts: emailParts(text), vars: { plans_url: `${app}/admin/payments` }, transactional: true },
      });
      try {
        const r = await fetch(events, { method: "POST", headers: { "Content-Type": "application/json", "X-Signature": sign(body) }, body, signal: AbortSignal.timeout(8000) });
        if (r.ok) out.email++;
      } catch (e) {
        console.error("payment email alert failed", (e as Error).message);
      }
    }
  }

  const wa = process.env.PAYMENT_ALERT_WEBHOOK_URL;
  if (wa) {
    const body = JSON.stringify({
      event: "payment_alert",
      at: new Date().toISOString(),
      app,
      phones: list(process.env.PAYMENT_NOTIFY_PHONES, "0524618086").map((x) => x.replace(/\D/g, "").replace(/^0/, "972")),
      emails: list(process.env.PAYMENT_NOTIFY_EMAILS, process.env.ALERT_EMAIL || "omern@rnd.org.il"),
      text,
      payment: { ...p, kind_label: kindLabel },
    });
    try {
      const r = await fetch(wa, { method: "POST", headers: { "Content-Type": "application/json", "X-Signature": sign(body) }, body, signal: AbortSignal.timeout(8000) });
      out.whatsapp = r.ok;
    } catch (e) {
      console.error("payment whatsapp alert failed", (e as Error).message);
    }
  }
  return out;
}

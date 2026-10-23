import { db } from "@/lib/supabase";
import { emit } from "@/lib/automation";
import { alert } from "@/lib/alerts";
import { cardcomReady, chargeToken } from "@/lib/cardcom";
import { notifyPayment } from "@/lib/paymentAlerts";
import { VAT } from "@/lib/plans";

export const runtime = "nodejs";
export const maxDuration = 300;

const NET = 69;

/**
 * Monthly renewal after the first year (renewal_mode = monthly69): charges the card token Cardcom
 * saved at the first purchase, extends access by a month and emails the tax invoice.
 * Safety: does nothing unless RENEWAL_AUTOCHARGE=1. Skips Shabbat. One attempt per user per 20h.
 * Protected by CRON_SECRET. ?dry=1 lists who would be charged.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  if (!dry && process.env.RENEWAL_AUTOCHARGE !== "1") return Response.json({ skipped: "RENEWAL_AUTOCHARGE is off" });
  if (!cardcomReady()) return Response.json({ skipped: "cardcom not configured" });
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", weekday: "short" }).format(new Date());
  if (day === "Sat") return Response.json({ skipped: "shabbat" });

  const supabase = db();
  const soon = new Date(Date.now() + 86400_000).toISOString();
  const { data: due } = await supabase
    .from("users")
    .select("id, full_name, email, phone, access_until, card_token, card_exp, last_renewal_attempt_at, year_ends_at")
    .eq("plan", "paid")
    .eq("renewal_mode", "monthly69")
    .not("card_token", "is", null)
    .lte("access_until", soon)
    .limit(200);
  const list = (due ?? []).filter((u) => (!u.year_ends_at || new Date(u.year_ends_at).getTime() <= Date.now() + 86400_000) && (!u.last_renewal_attempt_at || Date.now() - new Date(u.last_renewal_attempt_at).getTime() > 20 * 3600_000));
  if (dry) return Response.json({ due: list.map((u) => ({ id: u.id, access_until: u.access_until })) });

  const vat = Math.round(NET * VAT * 100) / 100;
  const total = Math.round((NET + vat) * 100) / 100;
  const out = { charged: 0, failed: 0 };
  for (const u of list) {
    await supabase.from("users").update({ last_renewal_attempt_at: new Date().toISOString() }).eq("id", u.id);
    const period = new Date(u.access_until).toISOString().slice(0, 7);
    try {
      const r = await chargeToken({ token: u.card_token!, expMMYY: u.card_exp ?? "", amount: total, uniqueId: `renew-${u.id}-${period}`, productName: "Duvdevani Platform · חידוש חודשי", customer: { name: u.full_name ?? "", email: u.email, phone: u.phone } });
      if (r.ResponseCode !== 0) throw new Error(`${r.ResponseCode}: ${r.Description ?? ""}`);
      const next = new Date(Math.max(Date.now(), new Date(u.access_until).getTime()));
      next.setMonth(next.getMonth() + 1);
      await supabase.from("users").update({ access_until: next.toISOString() }).eq("id", u.id);
      const { data: o } = await supabase.from("orders").insert({ user_id: u.id, tier: "basic", billing: "installments", kind: "monthly69", amount_net: NET, vat, amount_total: total, status: "paid", channel: "self", provider: "cardcom", provider_ref: String(r.TranzactionId ?? ""), method: "credit", doc_number: r.DocumentNumber ? String(r.DocumentNumber) : null, doc_url: r.DocumentUrl ?? null, paid_at: new Date().toISOString(), notified_at: new Date().toISOString(), customer_name: u.full_name, customer_phone: u.phone, customer_email: u.email, source: "renewal", installments: 1, num_payments: 1 }).select("id").single();
      await notifyPayment({ orderId: o?.id ?? u.id, name: u.full_name ?? "", phone: u.phone, email: u.email, plan: "חידוש חודשי", kind: "monthly69", payments: 1, total, net: NET, docNumber: r.DocumentNumber ? String(r.DocumentNumber) : null, docUrl: r.DocumentUrl ?? null, provider: "Cardcom", ref: String(r.TranzactionId ?? "") });
      out.charged++;
    } catch (e) {
      out.failed++;
      await emit("journey", u.id, { stage: "renewal_failed", text: "החיוב החודשי לא עבר. נעדכן אמצעי תשלום?", transactional: true });
      await alert(`renewal_fail:${u.id}:${period}`, "חידוש חודשי נכשל", [`מנוי: ${u.full_name} · ${u.email}`, `שגיאה: ${(e as Error).message.slice(0, 200)}`], 60 * 24);
    }
  }
  return Response.json(out);
}

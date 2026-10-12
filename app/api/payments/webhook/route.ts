import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/supabase";
import { activateSubscription } from "@/lib/subscription";
import { emit } from "@/lib/automation";
import type { Billing, Tier } from "@/lib/plans";

export const runtime = "nodejs";

/**
 * Generic payment webhook – the chosen provider (or Make in front of it) posts here.
 * Header X-Signature = HMAC-SHA256(raw body, PAYMENT_WEBHOOK_SECRET).
 * Body: { order_id, status: "paid"|"failed"|"refunded", provider?, provider_ref?, kind?: "annual"|"monthly69", user_id? }
 * - annual paid  → opens the plan (courses + automations)
 * - monthly69 paid → extends access by one month (the post-year renewal)
 */
export async function POST(req: Request) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  const raw = await req.text();
  if (!secret) return new Response("not configured", { status: 503 });
  const sig = Buffer.from(req.headers.get("x-signature") ?? "");
  const want = Buffer.from(createHmac("sha256", secret).update(raw).digest("hex"));
  if (sig.length !== want.length || !timingSafeEqual(sig, want)) return new Response("bad signature", { status: 401 });

  const b = JSON.parse(raw || "{}");
  const supabase = db();

  if (b.kind === "monthly69") {
    const userId = String(b.user_id ?? "");
    const { data: u } = await supabase.from("users").select("id, access_until").eq("id", userId).maybeSingle();
    if (!u) return new Response("no user", { status: 404 });
    if (b.status === "paid") {
      const base = Math.max(Date.now(), new Date(u.access_until).getTime());
      const next = new Date(base);
      next.setMonth(next.getMonth() + 1);
      await supabase.from("users").update({ access_until: next.toISOString(), renewal_mode: "monthly69" }).eq("id", userId);
      await supabase.from("orders").insert({ user_id: userId, tier: "basic", billing: "installments", kind: "monthly69", amount_net: 69, vat: 12.42, amount_total: 81.42, status: "paid", channel: "self", provider: b.provider ?? null, provider_ref: b.provider_ref ?? null, paid_at: new Date().toISOString() });
    } else if (b.status === "failed") {
      await emit("journey", userId, { stage: "renewal_failed", text: "החיוב החודשי לא עבר. נעדכן אמצעי תשלום?", transactional: true });
    }
    return Response.json({ ok: true });
  }

  const { data: order } = await supabase.from("orders").select("id, user_id, tier, billing, status").eq("id", String(b.order_id ?? "")).maybeSingle();
  if (!order) return new Response("no order", { status: 404 });
  await supabase.from("orders").update({ provider: b.provider ?? null, provider_ref: b.provider_ref ?? null }).eq("id", order.id);
  if (b.status === "paid" && order.status !== "paid") {
    await activateSubscription({ userId: order.user_id, tier: order.tier as Tier, billing: order.billing as Billing, channel: "self", orderId: order.id });
  } else if (b.status === "failed" || b.status === "refunded") {
    await supabase.from("orders").update({ status: b.status }).eq("id", order.id);
  }
  return Response.json({ ok: true });
}

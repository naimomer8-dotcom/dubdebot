import { db } from "./supabase";
import { getPaymentResult } from "./cardcom";
import { activateSubscription } from "./subscription";
import { notifyPayment } from "./paymentAlerts";
import { alert } from "./alerts";
import { capi } from "./metaCapi";
import { planById, type Billing, type Tier } from "./plans";

export type SettleResult = { status: "paid" | "pending" | "failed" | "not_found"; orderId?: string; tier?: string; docUrl?: string | null; message?: string };

/**
 * Confirms an order with Cardcom (GetLpResult) and opens the plan. Safe to call many times
 * (webhook, thank-you page, retries): the order is claimed once via `notified_at`.
 */
export async function settleCardcomOrder(orderId: string): Promise<SettleResult> {
  const supabase = db();
  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, tier, billing, kind, status, amount_total, amount_net, lp_id, customer_name, customer_phone, customer_email, installments, doc_url, notified_at")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { status: "not_found" };
  if (order.status === "paid") return { status: "paid", orderId, tier: order.tier, docUrl: order.doc_url };
  if (!order.lp_id) return { status: "pending", orderId };

  const r = await getPaymentResult(order.lp_id);
  const tr = r.TranzactionInfo;
  const ok = r.ResponseCode === 0 && tr && tr.ResponseCode === 0 && String(r.ReturnValue ?? "") === order.id;
  if (!ok) {
    // 5117/5118/5119 = the customer has not finished on the payment page yet
    const stillOpen = [5117, 5118, 5119].includes(Number(r.ResponseCode));
    if (!stillOpen && r.ResponseCode !== 0) {
      await supabase.from("orders").update({ provider_error: `${r.ResponseCode}: ${String(r.Description ?? "").slice(0, 200)}` }).eq("id", order.id);
    }
    return { status: stillOpen || r.ResponseCode === 0 ? "pending" : "failed", orderId, message: r.Description };
  }
  const paid = Number(tr!.Amount ?? 0);
  if (Math.abs(paid - Number(order.amount_total)) > 0.01) {
    await alert(`cardcom_amount:${order.id}`, "סכום ששולם לא תואם להזמנה", [`הזמנה ${order.id}`, `בהזמנה: ₪${order.amount_total}`, `שולם בקארדקום: ₪${paid}`, "המנוי לא נפתח אוטומטית. לבדוק ידנית בדשבורד התשלומים."], 1);
    return { status: "pending", orderId, message: "amount mismatch" };
  }

  // claim once
  const { data: claimed } = await supabase.from("orders").update({ notified_at: new Date().toISOString() }).eq("id", order.id).is("notified_at", null).select("id").maybeSingle();
  if (!claimed) return { status: "pending", orderId, message: "processing" };

  const doc = r.DocumentInfo;
  const docNumber = doc?.DocumentNumber ? String(doc.DocumentNumber) : tr!.DocumentNumber ? String(tr!.DocumentNumber) : null;
  const docUrl = doc?.DocumentUrl || tr!.DocumentUrl || null;
  const last4 = tr!.Last4CardDigitsString || null;
  const payments = Number(tr!.NumberOfPayments || r.UIValues?.NumOfPayments || order.installments || 1);
  await supabase
    .from("orders")
    .update({ provider: "cardcom", provider_ref: String(tr!.TranzactionId ?? r.TranzactionId ?? ""), method: "credit", doc_number: docNumber, doc_url: docUrl, card_last4: last4, num_payments: payments, provider_error: null })
    .eq("id", order.id);

  const tk = r.TokenInfo;
  if (tk?.Token) {
    const mm = String(tk.CardMonth ?? "").padStart(2, "0");
    const yy = String(tk.CardYear ?? "").slice(-2);
    const ex = tk.TokenExDate && /^\d{8}$/.test(tk.TokenExDate) ? `${tk.TokenExDate.slice(0, 4)}-${tk.TokenExDate.slice(4, 6)}-${tk.TokenExDate.slice(6, 8)}` : null;
    await supabase.from("users").update({ card_token: tk.Token, card_exp: `${mm}${yy}`, card_last4: last4, card_token_expires: ex }).eq("id", order.user_id);
  }

  try {
    await activateSubscription({ userId: order.user_id, tier: order.tier as Tier, billing: order.billing as Billing, channel: "self", orderId: order.id });
  } catch (e) {
    await alert(`cardcom_activate:${order.id}`, "תשלום עבר אבל פתיחת המנוי נכשלה", [`הזמנה ${order.id}`, `שגיאה: ${(e as Error).message}`, "לפתוח ידנית מדשבורד התשלומים."], 1);
  }

  // Meta server copy of the purchase (same event_id as the thank-you page pixel)
  await capi("Purchase", `pur_${order.id}`, { email: order.customer_email, phone: order.customer_phone, userId: order.user_id }, { value: Number(order.amount_total), currency: "ILS", content_name: order.tier, content_type: "product" });

  await notifyPayment({
    orderId: order.id,
    name: order.customer_name ?? "",
    phone: order.customer_phone,
    email: order.customer_email,
    plan: planById(order.tier)?.name ?? order.tier,
    kind: String(order.kind ?? "annual").startsWith("upgrade") ? "upgrade" : "annual",
    payments,
    total: Number(order.amount_total),
    net: Number(order.amount_net),
    docNumber,
    docUrl,
    provider: "Cardcom",
    ref: String(tr!.TranzactionId ?? ""),
  }).catch((e) => console.error("notify payment", (e as Error).message));

  return { status: "paid", orderId, tier: order.tier, docUrl };
}

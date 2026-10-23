import { settleCardcomOrder } from "@/lib/cardcomOrders";
import { cardcomReady } from "@/lib/cardcom";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Cardcom WebHookUrl. The body is never trusted: we only take the order id (query `o` or ReturnValue)
 * and the LowProfileId, then confirm everything server-to-server with LowProfile/GetLpResult.
 */
export async function POST(req: Request) {
  if (!cardcomReady()) return new Response("not configured", { status: 503 });
  const url = new URL(req.url);
  const raw = await req.text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw);
  } catch {
    body = Object.fromEntries(new URLSearchParams(raw));
  }
  const orderId = String(url.searchParams.get("o") ?? body.ReturnValue ?? body.returnValue ?? "");
  if (!UUID.test(orderId)) return new Response("bad order", { status: 400 });
  const lp = String(body.LowProfileId ?? body.lowprofilecode ?? "");
  if (lp) {
    // only fill the LP id if we don't have one yet (the one saved at checkout is authoritative)
    await db().from("orders").update({ lp_id: lp }).eq("id", orderId).is("lp_id", null);
  }
  try {
    const r = await settleCardcomOrder(orderId);
    return Response.json({ ok: true, status: r.status });
  } catch (e) {
    console.error("cardcom webhook", (e as Error).message);
    return new Response("error", { status: 500 }); // Cardcom retries
  }
}

export const GET = POST;

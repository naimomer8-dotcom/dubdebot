import { createHash } from "crypto";

/**
 * Meta Conversions API (server events). Same dataset as the browser pixel; event_id matches the
 * browser eventID so Meta keeps one copy. No-op until META_CAPI_TOKEN is set in Vercel.
 * Email / phone are SHA-256 hashed here and never leave the server in plain text.
 */
const PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID || "454361155165301";
const sha = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

export type CapiUser = { email?: string | null; phone?: string | null; userId?: string; ip?: string | null; ua?: string | null; fbc?: string | null; fbp?: string | null };

export async function capi(event: string, eventId: string, user: CapiUser, custom: Record<string, unknown> = {}, sourceUrl?: string): Promise<boolean> {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return false;
  const ud: Record<string, unknown> = {};
  if (user.email) ud.em = [sha(user.email)];
  if (user.phone) ud.ph = [sha(String(user.phone).replace(/\D/g, "").replace(/^0/, "972"))];
  if (user.userId) ud.external_id = [sha(user.userId)];
  if (user.ip) ud.client_ip_address = user.ip;
  if (user.ua) ud.client_user_agent = user.ua;
  if (user.fbc) ud.fbc = user.fbc;
  if (user.fbp) ud.fbp = user.fbp;
  const body = {
    data: [{ event_name: event, event_time: Math.floor(Date.now() / 1000), event_id: eventId, action_source: "website", event_source_url: sourceUrl ?? process.env.PUBLIC_APP_URL ?? "https://dubdebot.vercel.app", user_data: ud, custom_data: custom }],
    ...(process.env.META_CAPI_TEST_CODE ? { test_event_code: process.env.META_CAPI_TEST_CODE } : {}),
  };
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${PIXEL}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** Pull ip / user agent / _fbc / _fbp from an incoming request. */
export function capiCtx(req: Request): Pick<CapiUser, "ip" | "ua" | "fbc" | "fbp"> {
  const h = req.headers;
  const cookie = h.get("cookie") ?? "";
  const ck = (n: string) => cookie.match(new RegExp(`(?:^|; )${n}=([^;]+)`))?.[1] ?? null;
  return { ip: (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || null, ua: h.get("user-agent"), fbc: ck("_fbc"), fbp: ck("_fbp") };
}

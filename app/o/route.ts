import { NextResponse } from "next/server";
import { OFFER_COOKIE, OFFER_HOURS, offerCookieValue, offerFromCookie } from "@/lib/offerLink";
import { planById } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** /o?p=upgrade → opens the 72h "12 installments at the one-time price" offer and lands on that plan's checkout. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tier = planById(url.searchParams.get("p"))?.id ?? "upgrade";
  const until = (await offerFromCookie()) ?? new Date(Date.now() + OFFER_HOURS * 3600_000).toISOString();
  const pass = new URLSearchParams({ up: tier, billing: "installments", buy: "1", utm_source: url.searchParams.get("utm_source") || "offer", utm_medium: url.searchParams.get("utm_medium") || "link", utm_campaign: url.searchParams.get("utm_campaign") || "12_at_1" });
  const res = NextResponse.redirect(new URL(`/plans?${pass}`, url));
  res.cookies.set(OFFER_COOKIE, offerCookieValue(until), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: new Date(until) });
  return res;
}

import { NextResponse } from "next/server";
import { GIFT_CODE, GIFT_COOKIE, giftCookieValue, giftWindow } from "@/lib/webinarGift";
import { getSessionUserId } from "@/lib/session";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UTM = "utm_source=webinar&utm_medium=qr&utm_campaign=webinar_2027&utm_content=gift";

/** /gift?c=stay → the webinar "stay to the end" gift (Platform Private at 50%), only while the window is open. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("c") || "").toLowerCase();
  const until = code === GIFT_CODE ? giftWindow() : null;
  if (!until) return NextResponse.redirect(new URL(`/plans/private?gift=closed&${UTM}`, url));

  const res = NextResponse.redirect(new URL(`/plans/private?gift=1&${UTM}`, url));
  res.cookies.set(GIFT_COOKIE, giftCookieValue(until), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: new Date(until) });
  const userId = await getSessionUserId().catch(() => null);
  if (userId) await db().from("events").insert({ user_id: userId, type: "webinar_gift", meta: { until } }).then(() => null, () => null);
  return res;
}

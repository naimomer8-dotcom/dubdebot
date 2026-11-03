import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getSessionUserId } from "@/lib/session";
import { LIVE_EVENT_TYPE, workshopOpen, type LiveEventKey } from "@/lib/liveEvents";
import { nextWebinar } from "@/lib/webinarDates";
import { contactOf } from "@/lib/automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Which live events this member already holds a seat for (workshop gift, next webinar). */
async function state(userId: string) {
  const webinar = nextWebinar();
  const { data } = await db().from("events").select("type, meta").eq("user_id", userId).in("type", Object.values(LIVE_EVENT_TYPE));
  const rows = data ?? [];
  return {
    workshop: rows.some((r) => r.type === LIVE_EVENT_TYPE.workshop),
    webinar: rows.some((r) => r.type === LIVE_EVENT_TYPE.webinar && (r.meta as { date?: string } | null)?.date === webinar),
    workshopOpen: workshopOpen(),
    webinarDate: webinar,
  };
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await state(userId));
}

/** One-click registration with the member's existing details. Body: { items: ["workshop","webinar"] } */
export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const raw: unknown[] = Array.isArray(body.items) ? body.items : [];
  const items = raw.filter((x): x is LiveEventKey => x === "workshop" || x === "webinar");
  if (!items.length) return NextResponse.json({ error: "לא נבחר אירוע" }, { status: 400 });
  const now = await state(userId);
  const rows = items
    .filter((k) => !now[k] && (k !== "workshop" || now.workshopOpen))
    .map((k) => ({ user_id: userId, type: LIVE_EVENT_TYPE[k], meta: k === "webinar" ? { date: now.webinarDate, source: "app_popup" } : { date: "2026-11-15", source: "app_popup" } }));
  if (rows.length) {
    const { error } = await db().from("events").insert(rows);
    if (error) return NextResponse.json({ error: "לא הצלחנו לשמור. נסה שוב." }, { status: 500 });
    await forward(userId, rows.some((r) => r.type === LIVE_EVENT_TYPE.workshop), rows.some((r) => r.type === LIVE_EVENT_TYPE.webinar) ? now.webinarDate : "");
  }
  return NextResponse.json(await state(userId));
}

/** New seats go to Make (REGISTRATIONS_WEBHOOK_URL): a row in the leads sheet tab "הרשמות סדנה ווובינר" + a Fireberry note. Never blocks the member. */
async function forward(userId: string, workshop: boolean, webinarDate: string) {
  const url = process.env.REGISTRATIONS_WEBHOOK_URL;
  if (!url) return;
  try {
    const c = await contactOf(userId);
    if (!c) return;
    const [y, m, d] = webinarDate ? webinarDate.split("-") : [];
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact: { full_name: c.full_name, phone: c.phone, email: c.email, plan: c.plan }, workshop, webinar_date: webinarDate ? `${Number(d)}.${Number(m)}.${y}` : "", source: "app_popup" }),
      signal: AbortSignal.timeout(6000),
    });
  } catch (e) {
    console.error("registrations forward", (e as Error).message);
  }
}

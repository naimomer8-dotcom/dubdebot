import { NextResponse } from "next/server";
import { clearSession, getSessionUserId } from "@/lib/session";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";

/** Log out this device. With {everywhere: true} – every device (bumps the session version). */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body.everywhere) {
    const userId = await getSessionUserId();
    if (userId) {
      const { data } = await db().from("users").select("session_version").eq("id", userId).single();
      await db().from("users").update({ session_version: (data?.session_version ?? 1) + 1 }).eq("id", userId);
    }
  }
  await clearSession();
  return NextResponse.json({ ok: true });
}

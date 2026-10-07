import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getSessionUserId } from "@/lib/session";

export const runtime = "nodejs";
const ALLOWED = new Set(["cta_clicked", "cta_dismissed", "tool_opened", "file_attached", "xray_shared", "call_started"]);

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const type = String(body.type ?? "");
  if (!ALLOWED.has(type)) return NextResponse.json({ error: "bad type" }, { status: 400 });
  await db().from("events").insert({
    user_id: userId,
    conversation_id: body.conversationId ?? null,
    type,
    meta: typeof body.meta === "object" && body.meta ? body.meta : {},
  });
  return NextResponse.json({ ok: true });
}

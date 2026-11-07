import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { requireMember } from "@/lib/session";

export const runtime = "nodejs";
const ALLOWED = new Set(["cta_clicked", "cta_dismissed", "tool_opened", "file_attached", "xray_shared", "call_started", "wa_group_clicked"]);

export async function POST(req: Request) {
  const m = await requireMember();
  if (m instanceof Response) return m;
  const userId = m;
  const body = await req.json().catch(() => ({}));
  const type = String(body.type ?? "");
  if (!ALLOWED.has(type)) return NextResponse.json({ error: "bad type" }, { status: 400 });
  await db().from("events").insert({
    user_id: userId,
    conversation_id: typeof body.conversationId === "string" && /^[0-9a-f-]{36}$/.test(body.conversationId) ? body.conversationId : null,
    type,
    meta: typeof body.meta === "object" && body.meta && JSON.stringify(body.meta).length < 2000 ? body.meta : {},
  });
  return NextResponse.json({ ok: true });
}

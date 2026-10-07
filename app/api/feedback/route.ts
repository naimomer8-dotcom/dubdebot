import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getSessionUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const rating = body.rating === 1 ? 1 : body.rating === -1 ? -1 : null;
  if (!body.messageId || rating === null) return NextResponse.json({ error: "bad request" }, { status: 400 });

  // make sure the message belongs to this user
  const { data: msg } = await db()
    .from("messages")
    .select("id, conversations!inner(user_id)")
    .eq("id", body.messageId)
    .eq("conversations.user_id", userId)
    .maybeSingle();
  if (!msg) return NextResponse.json({ error: "not found" }, { status: 404 });

  await db()
    .from("feedback")
    .upsert(
      { message_id: body.messageId, user_id: userId, rating, comment: body.comment ? String(body.comment).slice(0, 1000) : null },
      { onConflict: "message_id,user_id" }
    );
  return NextResponse.json({ ok: true });
}

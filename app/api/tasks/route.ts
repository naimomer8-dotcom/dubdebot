import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getSessionUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id, done } = await req.json().catch(() => ({}));
  if (typeof id !== "string") return NextResponse.json({ error: "bad id" }, { status: 400 });
  await db().from("tasks").update({ done: !!done, done_at: done ? new Date().toISOString() : null }).eq("id", id).eq("user_id", userId);
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { text } = await req.json().catch(() => ({}));
  const t = String(text ?? "").trim().slice(0, 200);
  if (!t) return NextResponse.json({ error: "empty" }, { status: 400 });
  const { data } = await db().from("tasks").insert({ user_id: userId, text: t, priority: "important", position: 999 }).select("id, text, priority, done").single();
  return NextResponse.json({ ok: true, task: data });
}

export async function DELETE(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string") return NextResponse.json({ error: "bad id" }, { status: 400 });
  await db().from("tasks").delete().eq("id", id).eq("user_id", userId);
  return NextResponse.json({ ok: true });
}

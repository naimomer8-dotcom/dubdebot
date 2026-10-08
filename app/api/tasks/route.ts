import { guard } from "@/lib/guard";
import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  const gate = await guard("tasks", 300, 60);
  if (gate instanceof Response) return gate;
  const userId = gate;
  const { id, done } = await req.json().catch(() => ({}));
  if (typeof id !== "string") return NextResponse.json({ error: "bad id" }, { status: 400 });
  await db().from("tasks").update({ done: !!done, done_at: done ? new Date().toISOString() : null }).eq("id", id).eq("user_id", userId);
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const gate = await guard("tasks", 300, 60);
  if (gate instanceof Response) return gate;
  const userId = gate;
  const { text } = await req.json().catch(() => ({}));
  const t = String(text ?? "").trim().slice(0, 200);
  if (!t) return NextResponse.json({ error: "empty" }, { status: 400 });
  const { data } = await db().from("tasks").insert({ user_id: userId, text: t, priority: "important", position: 999 }).select("id, text, priority, done").single();
  return NextResponse.json({ ok: true, task: data });
}

export async function DELETE(req: Request) {
  const gate = await guard("tasks", 300, 60);
  if (gate instanceof Response) return gate;
  const userId = gate;
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string") return NextResponse.json({ error: "bad id" }, { status: 400 });
  await db().from("tasks").delete().eq("id", id).eq("user_id", userId);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createClonedVoice, nirVoice, CLONE_MODEL } from "@/lib/voiceClone";

export const runtime = "nodejs";
export const maxDuration = 60;

function authed(req: Request) {
  const expected = process.env.ADMIN_TOKEN ?? "";
  const got = Buffer.from(req.headers.get("x-admin-token") ?? "");
  const exp = Buffer.from(expected);
  return expected.length >= 24 && got.length === exp.length && timingSafeEqual(got, exp);
}

/** Admin: current cloned voice. */
export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ voice: await nirVoice() });
}

/** Admin: create Nir's cloned voice from a 10–30s source clip + his recorded consent statement. */
export async function POST(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const ok = (a: unknown): a is { mime_type: string; data: string } =>
    !!a && typeof (a as { data?: unknown }).data === "string" && typeof (a as { mime_type?: unknown }).mime_type === "string";
  if (!ok(b.source) || !ok(b.consent)) return NextResponse.json({ error: "source and consent audio required" }, { status: 400 });
  try {
    return NextResponse.json(await createClonedVoice(b.source, b.consent, b.model || CLONE_MODEL));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

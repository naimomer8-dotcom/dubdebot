import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createClonedVoice, nirVoice, speakCloned, probeCloned, CLONE_MODEL } from "@/lib/voiceClone";

export const runtime = "nodejs";
export const maxDuration = 90;

function authed(req: Request) {
  const expected = process.env.ADMIN_TOKEN ?? "";
  const got = Buffer.from(req.headers.get("x-admin-token") ?? "");
  const exp = Buffer.from(expected);
  return expected.length >= 24 && got.length === exp.length && timingSafeEqual(got, exp);
}

/** Admin: current cloned voice. */
export async function GET(req: Request) {
  if (!authed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const u = new URL(req.url);
  const test = u.searchParams.get("test");
  const via = u.searchParams.get("via");
  if (test && via) return NextResponse.json(await probeCloned(test.slice(0, 300), via, u.searchParams.get("model") || CLONE_MODEL));
  if (test) {
    const t0 = Date.now();
    const out = await speakCloned(test.slice(0, 300), u.searchParams.get("style") || undefined, u.searchParams.get("model") || undefined);
    return NextResponse.json({ ms: Date.now() - t0, bytes: out?.audio.length ?? 0, mime: out?.mime ?? null });
  }
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

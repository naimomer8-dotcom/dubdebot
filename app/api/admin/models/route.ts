import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { gemini } from "@/lib/gemini";

export const runtime = "nodejs";

/** Admin-only: list Gemini models available to this API key (to pick TTS / chat models). */
export async function GET(req: Request) {
  const expected = process.env.ADMIN_TOKEN ?? "";
  const got = Buffer.from(req.headers.get("x-admin-token") ?? "");
  const exp = Buffer.from(expected);
  if (expected.length < 24 || got.length !== exp.length || !timingSafeEqual(got, exp)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const names: { name: string; actions?: string[] }[] = [];
  const pager = await gemini().models.list({ config: { pageSize: 100 } });
  for await (const m of pager) names.push({ name: m.name ?? "", actions: m.supportedActions });
  return NextResponse.json({ models: names });
}

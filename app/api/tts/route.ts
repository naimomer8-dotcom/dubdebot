import { getSessionUserId } from "@/lib/session";
import { synthesize } from "@/lib/tts";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return new Response("unauthorized", { status: 401 });
  const { text } = await req.json().catch(() => ({}));
  const clean = String(text ?? "").replace(/[*#_`>|]/g, "").trim().slice(0, 900);
  if (!clean) return new Response("empty", { status: 400 });
  const out = await synthesize(clean);
  if (!out) return new Response("tts unavailable", { status: 503 });
  return new Response(new Uint8Array(out.wav), {
    headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store", "X-TTS-Model": out.model },
  });
}

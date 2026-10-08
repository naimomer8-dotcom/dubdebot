import { guard } from "@/lib/guard";
import { synthesize } from "@/lib/tts";
import { streamCloned } from "@/lib/voiceClone";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const gate = await guard("tts", 500, 60);
  if (gate instanceof Response) return gate;
  const body = await req.json().catch(() => ({}));
  const clean = String(body.text ?? "").replace(/[*#_`>|]/g, "").trim().slice(0, 900);
  if (!clean) return new Response("empty", { status: 400 });
  // live calls: stream raw PCM in Nir's voice so playback starts after the first chunk
  if (body.stream === true) {
    try {
      const s = await streamCloned(clean);
      if (s) return new Response(s, { headers: { "Content-Type": "audio/l16; rate=24000; channels=1", "Cache-Control": "no-store", "X-TTS-Model": "nir-clone-stream" } });
    } catch (e) {
      console.error("tts stream failed", String(e).slice(0, 200));
    }
  }
  const out = await synthesize(clean);
  if (!out) return new Response("tts unavailable", { status: 503 });
  return new Response(new Uint8Array(out.wav), {
    headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store", "X-TTS-Model": out.model },
  });
}

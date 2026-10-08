import { db } from "./supabase";

const BASE = "https://generativelanguage.googleapis.com/v1beta";
export const CLONE_MODEL = process.env.GEMINI_CLONE_TTS_MODEL || "gemini-3.8-flash-tts";

type Audio = { mime_type: string; data: string };

function key() {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error("Missing GEMINI_API_KEY");
  return k;
}

/** Creates a replicated (cloned) voice. Google verifies the consent clip matches the source speaker. */
export async function createClonedVoice(source: Audio, consent: Audio, model = CLONE_MODEL) {
  const r = await fetch(`${BASE}/voices`, {
    method: "POST",
    headers: { "x-goog-api-key": key(), "Content-Type": "application/json" },
    body: JSON.stringify({
      store: true,
      // creation uses Google's default replication model; `model` is only used later for synthesis
      voice: { type: "replicated", display_name: "Nir Duvdevani", replicated: { source_audio: source, consent_audio: consent } },
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`voice create ${r.status}: ${JSON.stringify(j).slice(0, 500)}`);
  const id: string | undefined = j.id ?? j.name?.split("/").pop();
  if (!id) throw new Error(`voice create: no id in ${JSON.stringify(j).slice(0, 300)}`);
  await db().from("app_settings").upsert({ key: "nir_voice", value: { id, model }, updated_at: new Date().toISOString() });
  cached = { id, model, at: Date.now() };
  return { id, model };
}

let cached: { id: string | null; model: string; at: number } | null = null;

/** The active cloned voice (from env, or saved by the admin endpoint). Cached for 5 minutes. */
export async function nirVoice(): Promise<{ id: string; model: string } | null> {
  if (process.env.NIR_VOICE_ID) return { id: process.env.NIR_VOICE_ID, model: CLONE_MODEL };
  if (process.env.NIR_VOICE_OFF === "1") return null;
  if (cached && Date.now() - cached.at < 300_000) return cached.id ? { id: cached.id, model: cached.model } : null;
  const { data } = await db().from("app_settings").select("value").eq("key", "nir_voice").maybeSingle();
  const v = data?.value as { id?: string; model?: string } | undefined;
  cached = { id: v?.id ?? null, model: v?.model ?? CLONE_MODEL, at: Date.now() };
  return v?.id ? { id: v.id, model: cached.model } : null;
}

/** Speech in Nir's cloned voice via the Interactions API. Returns raw audio bytes + mime, or null. */
export async function speakCloned(text: string, style?: string, modelOverride?: string): Promise<{ audio: Buffer; mime: string } | null> {
  const v = await nirVoice();
  if (!v) return null;
  const model = modelOverride || CLONE_MODEL;
  const part: Record<string, unknown> = { type: "text", text };
  if (style) part.annotations = [{ type: "speech_metadata", style }];
  const r = await fetch(`${BASE}/interactions`, {
    method: "POST",
    headers: { "x-goog-api-key": key(), "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: [{ type: "user_input", content: [part] }],
      generation_config: { speech_config: [{ voice: v.id }] },
      response_format: { type: "audio" },
    }),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j) {
    console.error("cloned tts failed", r.status, JSON.stringify(j).slice(0, 300));
    return null;
  }
  type C = { type?: string; data?: string; mime_type?: string; mimeType?: string };
  const outs: C[] = (j.steps ?? []).filter((s: { type?: string }) => s.type === "model_output").flatMap((s: { content?: C[] }) => s.content ?? []);
  const a = [...outs].reverse().find((c) => c.type === "audio" && c.data) ?? (j.output_audio as C | undefined);
  if (!a?.data) return null;
  return { audio: Buffer.from(a.data, "base64"), mime: a.mime_type ?? a.mimeType ?? "" };
}

/** Experimental latency probes for the cloned voice (admin only). */
export async function probeCloned(text: string, via: string, model: string) {
  const v = await nirVoice();
  if (!v) return { error: "no voice" };
  const t0 = Date.now();
  if (via === "gc") {
    const r = await fetch(`${BASE}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key(), "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: v.id } } } },
      }),
    });
    const j = await r.text();
    return { via, status: r.status, ms: Date.now() - t0, head: j.slice(0, 300) };
  }
  // streaming interactions: time to first byte and to first audio chunk
  const r = await fetch(`${BASE}/interactions?alt=sse`, {
    method: "POST",
    headers: { "x-goog-api-key": key(), "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({
      model,
      stream: true,
      input: [{ type: "user_input", content: [{ type: "text", text }] }],
      generation_config: { speech_config: [{ voice: v.id }] },
      response_format: { type: "audio" },
    }),
  });
  const ttfb = Date.now() - t0;
  let firstAudio = -1;
  let buf = "";
  const reader = r.body?.getReader();
  const dec = new TextDecoder();
  let events = 0;
  while (reader) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    events++;
    if (firstAudio < 0 && /"data"\s*:\s*"[A-Za-z0-9+/]{100}/.test(buf)) firstAudio = Date.now() - t0;
  }
  return { via, status: r.status, ttfb, firstAudio, total: Date.now() - t0, events, head: buf.slice(0, 400) };
}

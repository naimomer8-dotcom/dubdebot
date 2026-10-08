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

/**
 * Speech in Nir's cloned voice. Uses streamGenerateContent (≈1.2s to first audio, ≈2s total per sentence –
 * the Interactions API took 6–10s). Returns raw PCM (audio/l16) or WAV bytes + mime, or null.
 */
export async function speakCloned(text: string, _style?: string, modelOverride?: string): Promise<{ audio: Buffer; mime: string } | null> {
  const v = await nirVoice();
  if (!v) return null;
  const model = modelOverride || CLONE_MODEL;
  const r = await fetch(`${BASE}/models/${model}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: { "x-goog-api-key": key(), "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text }] }],
      generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { voice: v.id } } },
    }),
  });
  if (!r.ok || !r.body) {
    console.error("cloned tts failed", r.status, (await r.text().catch(() => "")).slice(0, 300));
    return null;
  }
  const parts: Buffer[] = [];
  let mime = "";
  let buf = "";
  const rd = r.body.getReader();
  const dec = new TextDecoder();
  const take = (line: string) => {
    if (!line.startsWith("data:")) return;
    try {
      const j = JSON.parse(line.slice(5));
      for (const p of j.candidates?.[0]?.content?.parts ?? []) {
        if (p.inlineData?.data) {
          parts.push(Buffer.from(p.inlineData.data, "base64"));
          mime = mime || p.inlineData.mimeType || "";
        }
      }
    } catch {}
  };
  while (true) {
    const { value, done } = await rd.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n")) >= 0) {
      take(buf.slice(0, i).trim());
      buf = buf.slice(i + 1);
    }
  }
  take(buf.trim());
  if (!parts.length) return null;
  return { audio: Buffer.concat(parts), mime: mime || "audio/l16; rate=24000" };
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
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { voice: v.id } } },
      }),
    });
    const j = await r.text();
    return { via, status: r.status, ms: Date.now() - t0, head: j.slice(0, 200) };
  }
  if (via === "gcs") {
    const r = await fetch(`${BASE}/models/${model}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: { "x-goog-api-key": key(), "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { voice: v.id } } },
      }),
    });
    const ttfb = Date.now() - t0;
    let first = -1, n = 0, buf = "";
    const rd = r.body?.getReader();
    const dec = new TextDecoder();
    while (rd) {
      const { value, done } = await rd.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      n++;
      if (first < 0 && /"data"\s*:\s*"[A-Za-z0-9+/]{100}/.test(buf)) first = Date.now() - t0;
    }
    return { via, status: r.status, ttfb, firstAudio: first, total: Date.now() - t0, chunks: n, head: buf.slice(0, 200) };
  }
  if (via === "live") {
    const { gemini } = await import("./gemini");
    let first = -1;
    let bytes = 0;
    let err = "";
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 20000);
      gemini()
        .live.connect({
          model,
          config: {
            responseModalities: ["AUDIO" as never],
            speechConfig: { voiceConfig: { voice: v.id } } as never,
            systemInstruction: "Repeat the user's text out loud exactly as written, in Hebrew, nothing else.",
          },
          callbacks: {
            onmessage: (m: { serverContent?: { modelTurn?: { parts?: { inlineData?: { data?: string } }[] }; turnComplete?: boolean } }) => {
              for (const p of m.serverContent?.modelTurn?.parts ?? []) {
                if (p.inlineData?.data) {
                  if (first < 0) first = Date.now() - t0;
                  bytes += p.inlineData.data.length;
                }
              }
              if (m.serverContent?.turnComplete) {
                clearTimeout(timer);
                resolve();
              }
            },
            onerror: (e: unknown) => {
              err = String((e as { message?: string })?.message ?? e);
              clearTimeout(timer);
              resolve();
            },
            onclose: (e: unknown) => {
              err = err || `closed ${(e as { reason?: string })?.reason ?? ""}`;
              clearTimeout(timer);
              resolve();
            },
          },
        })
        .then((s) => {
          s.sendClientContent({ turns: [{ role: "user", parts: [{ text }] }], turnComplete: true });
        })
        .catch((e) => {
          err = String(e);
          clearTimeout(timer);
          resolve();
        });
    });
    return { via, firstAudio: first, total: Date.now() - t0, bytes, err: err.slice(0, 300) };
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

/** Streams Nir's cloned voice as raw 24kHz 16-bit mono PCM, chunk by chunk as Gemini produces it. */
export async function streamCloned(text: string): Promise<ReadableStream<Uint8Array> | null> {
  const v = await nirVoice();
  if (!v) return null;
  const r = await fetch(`${BASE}/models/${CLONE_MODEL}:streamGenerateContent?alt=sse`, {
    method: "POST",
    headers: { "x-goog-api-key": key(), "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text }] }],
      generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { voice: v.id } } },
    }),
  });
  if (!r.ok || !r.body) {
    console.error("clone stream failed", r.status, (await r.text().catch(() => "")).slice(0, 200));
    return null;
  }
  const rd = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        const nl = buf.indexOf("\n");
        if (nl >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith("data:")) continue;
          try {
            const j = JSON.parse(line.slice(5));
            let out = false;
            for (const p of j.candidates?.[0]?.content?.parts ?? []) {
              if (p.inlineData?.data) {
                controller.enqueue(new Uint8Array(Buffer.from(p.inlineData.data, "base64")));
                out = true;
              }
            }
            if (out) return;
          } catch {}
          continue;
        }
        const { value, done } = await rd.read();
        if (done) {
          controller.close();
          return;
        }
        buf += dec.decode(value, { stream: true });
      }
    },
    cancel() {
      rd.cancel().catch(() => {});
    },
  });
}

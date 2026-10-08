import { gemini } from "./gemini";
import { speakCloned } from "./voiceClone";

const CANDIDATES = [
  process.env.GEMINI_TTS_MODEL,
  "gemini-3.8-flash-tts",
  "gemini-3-flash-tts",
  "gemini-3-flash-preview-tts",
  "gemini-2.5-flash-preview-tts",
  "gemini-2.5-flash-tts",
  "gemini-2.5-pro-preview-tts",
].filter(Boolean) as string[];

let working: string | null = null;
const dead = new Set<string>();

/** Hebrew speech via Gemini TTS. Returns a WAV buffer, or null if no TTS model is available. */
export async function synthesize(text: string): Promise<{ wav: Buffer; model: string } | null> {
  // 1) Nir's cloned voice, when one has been created with his consent
  try {
    const c = await speakCloned(text, "ישיר, אנרגטי וחם, כמו בשיחת טלפון עם בעל עסק");
    if (c) {
      const isWav = c.audio.subarray(0, 4).toString("ascii") === "RIFF";
      const rate = Number(/rate=(\d+)/.exec(c.mime)?.[1] ?? 24000);
      return { wav: isWav ? c.audio : pcmToWav(c.audio, rate), model: "nir-clone" };
    }
  } catch (e) {
    console.error("clone path failed", String(e).slice(0, 200));
  }
  // 2) prebuilt Gemini voice
  const order = working ? [working, ...CANDIDATES.filter((m) => m !== working)] : CANDIDATES;
  for (const model of order) {
    if (dead.has(model)) continue;
    try {
      const res = await gemini().models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: process.env.GEMINI_TTS_VOICE || "Charon" } } },
        },
      });
      const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part?.inlineData?.data) throw new Error("no audio");
      const mime = part.inlineData.mimeType ?? "";
      const pcm = Buffer.from(part.inlineData.data, "base64");
      const rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000);
      working = model;
      return { wav: mime.includes("wav") ? pcm : pcmToWav(pcm, rate), model };
    } catch (e) {
      const msg = String(e);
      if (/404|not found|not supported|no longer available|NOT_FOUND|INVALID_ARGUMENT/i.test(msg)) dead.add(model);
      console.error("tts failed", model, msg.slice(0, 200));
    }
  }
  return null;
}

function pcmToWav(pcm: Buffer, rate: number, channels = 1, bits = 16) {
  const h = Buffer.alloc(44);
  const byteRate = (rate * channels * bits) / 8;
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(byteRate, 28);
  h.writeUInt16LE((channels * bits) / 8, 32);
  h.writeUInt16LE(bits, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { ThinkingLevel } from "@google/genai";
import { gemini } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Admin-only benchmark: run one prompt on a model and report latency, tokens and the answer. */
export async function POST(req: Request) {
  const expected = process.env.ADMIN_TOKEN ?? "";
  const got = Buffer.from(req.headers.get("x-admin-token") ?? "");
  const exp = Buffer.from(expected);
  if (expected.length < 24 || got.length !== exp.length || !timingSafeEqual(got, exp)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { model, prompt, system, thinking, tts } = await req.json();
  const t0 = Date.now();
  try {
    if (tts) {
      const res = await gemini().models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } } } },
      });
      const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      return NextResponse.json({ ms: Date.now() - t0, bytes: part?.inlineData?.data?.length ?? 0, mime: part?.inlineData?.mimeType });
    }
    const config: Record<string, unknown> = { maxOutputTokens: 1500 };
    if (system) config.systemInstruction = system;
    if (thinking) config.thinkingConfig = { thinkingLevel: ThinkingLevel[thinking as keyof typeof ThinkingLevel] };
    let first = 0;
    let text = "";
    const stream = await gemini().models.generateContentStream({ model, contents: [{ role: "user", parts: [{ text: prompt }] }], config });
    let usage: unknown = null;
    for await (const c of stream) {
      if (!first && c.text) first = Date.now() - t0;
      text += c.text ?? "";
      if (c.usageMetadata) usage = c.usageMetadata;
    }
    return NextResponse.json({ firstTokenMs: first, totalMs: Date.now() - t0, usage, text });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 400), ms: Date.now() - t0 }, { status: 500 });
  }
}

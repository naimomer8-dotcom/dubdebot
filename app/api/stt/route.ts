import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/session";
import { gemini, CHAT_MODEL, FAST_THINKING } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Fallback speech-to-text (for browsers without SpeechRecognition): Gemini transcribes the recorded clip. */
export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { audio, mime } = await req.json().catch(() => ({}));
  if (typeof audio !== "string" || audio.length > 4_000_000) return NextResponse.json({ error: "bad audio" }, { status: 400 });
  try {
    const res = await gemini().models.generateContent({
      model: CHAT_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: String(mime || "audio/webm").split(";")[0], data: audio } },
            { text: "תמלל את ההקלטה בעברית, מילה במילה. החזר רק את הטקסט המתומלל, בלי שום הקדמה. אם אין דיבור – החזר מחרוזת ריקה." },
          ],
        },
      ],
      config: { maxOutputTokens: 1200, ...FAST_THINKING },
    });
    return NextResponse.json({ text: (res.text ?? "").trim() });
  } catch (e) {
    console.error("stt failed", e);
    return NextResponse.json({ text: "" }, { status: 502 });
  }
}

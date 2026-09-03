import "server-only";
import OpenAI from "openai";

/*
  Voice, server-side only (keys never reach the browser).

  Speech-to-text runs on GROQ (free Whisper large-v3-turbo): the endpoint is
  OpenAI-compatible, so we send the browser's recording as a real multipart FILE
  UPLOAD — no ffmpeg, no base64-in-JSON (that was the old failure). Whisper
  accepts webm/ogg/mp4/wav directly, and handles Indian English / Hinglish well.

  Text-to-speech (the Listen button) stays on OpenRouter.

  Both providers go through ONE function each, so swapping provider later — e.g.
  to an Indian-language speech model — means editing a single function here.
*/

function groq(): OpenAI | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
  });
}

function openrouter(): OpenAI | null {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    defaultHeaders: { "HTTP-Referer": "https://sunrooof.com", "X-Title": "SUNROOOF Learning" },
  });
}

export function transcriptionConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export function speechConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

/**
 * Speech → text (Groq Whisper). SWAP THIS ONE FUNCTION to change the STT
 * provider/model (e.g. an Indian-language speech model if Whisper struggles).
 * Takes the recording as a File and uploads it as-is.
 */
export async function transcribeAudio(audio: File): Promise<string> {
  const c = groq();
  if (!c) throw new Error("not-configured");
  const res = await c.audio.transcriptions.create({
    file: audio,
    model: process.env.GROQ_TRANSCRIBE_MODEL || "whisper-large-v3-turbo",
    // Hint English so Hinglish is transcribed as spoken. NOT translate mode —
    // we want the actual words, not an English translation.
    language: "en",
    temperature: 0,
  });
  return (res.text ?? "").trim();
}

/** Text → spoken audio (mp3 bytes) via OpenRouter. SWAP THIS ONE FUNCTION to change the voice. */
export async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  const c = openrouter();
  if (!c) throw new Error("not-configured");
  const res = await c.chat.completions.create({
    model: process.env.OPENROUTER_TTS_MODEL || "openai/gpt-audio",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modalities: ["text", "audio"] as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    audio: { voice: process.env.OPENROUTER_TTS_VOICE || "alloy", format: "mp3" } as any,
    messages: [
      { role: "user", content: `Read this text aloud exactly as written, in a warm, clear voice. Add nothing of your own:\n\n${text}` },
    ],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (res.choices[0]?.message as any)?.audio?.data as string | undefined;
  if (!data) throw new Error("no-audio");
  const buf = Buffer.from(data, "base64");
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

import "server-only";
import OpenAI from "openai";

/*
  Voice for the assistant, server-side only (the OpenRouter key never reaches the
  browser). OpenRouter does NOT expose OpenAI-style /audio/transcriptions or
  /audio/speech endpoints — it serves audio through audio-capable CHAT models
  (e.g. openai/gpt-audio): audio in as an `input_audio` content part, audio out
  via the `audio` modality. Speech-to-text and text-to-speech each go through ONE
  function here, so switching to a better Indian-accent model (or a different
  provider entirely) means editing a single function.

  NOTE: audio on OpenRouter needs account credit (audio output needs a small
  minimum balance); a free-tier key returns a 402 until credits are added.
*/

function client(): OpenAI | null {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    // `||` not `??`: an empty env var must fall back to the default, not stay "".
    baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    defaultHeaders: { "HTTP-Referer": "https://sunrooof.com", "X-Title": "SUNROOOF Learning" },
  });
}

export function voiceConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

/**
 * Speech → text. SWAP THIS ONE FUNCTION to change the transcription model/provider
 * (many users speak Indian English / Hindi-English; if the default handles that
 * poorly, switch OPENROUTER_TRANSCRIBE_MODEL — e.g. to a Gemini or Voxtral model —
 * or replace this body with a dedicated STT provider). `mp3` is mp3 audio bytes.
 */
export async function transcribeAudio(mp3: Buffer): Promise<string> {
  const c = client();
  if (!c) throw new Error("not-configured");
  const model = process.env.OPENROUTER_TRANSCRIBE_MODEL || "openai/gpt-audio";
  const res = await c.chat.completions.create({
    model,
    temperature: 0,
    messages: [
      {
        role: "user",
        // OpenAI-style multimodal content: instruction + the audio itself.
        content: [
          {
            type: "text",
            text: "Transcribe the speech in this audio verbatim. Output only the exact words spoken — no preamble, no translation, no commentary. If there is no speech, output nothing.",
          },
          { type: "input_audio", input_audio: { data: mp3.toString("base64"), format: "mp3" } },
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    ],
  });
  return (res.choices[0]?.message?.content ?? "").toString().trim();
}

/** Text → spoken audio (mp3 bytes). SWAP THIS ONE FUNCTION to change the voice/provider. */
export async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  const c = client();
  if (!c) throw new Error("not-configured");
  const model = process.env.OPENROUTER_TTS_MODEL || "openai/gpt-audio";
  const voice = process.env.OPENROUTER_TTS_VOICE || "alloy";
  const res = await c.chat.completions.create({
    model,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    modalities: ["text", "audio"] as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    audio: { voice, format: "mp3" } as any,
    messages: [
      {
        role: "user",
        content: `Read this text aloud exactly as written, in a warm, clear voice. Add nothing of your own:\n\n${text}`,
      },
    ],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (res.choices[0]?.message as any)?.audio?.data as string | undefined;
  if (!data) throw new Error("no-audio");
  const buf = Buffer.from(data, "base64");
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

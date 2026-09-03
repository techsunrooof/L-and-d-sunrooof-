import { NextRequest } from "next/server";
import { transcribeAudio, transcriptionConfigured } from "@/lib/voice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
  Press-to-talk speech → text (§ Voice). The browser's recording is uploaded to
  Groq's Whisper as a real multipart file — no transcode, no base64. The
  recording is NOT stored. On any failure we tell the user to type instead, and
  we never forward an empty question to the assistant.
*/
export async function POST(req: NextRequest) {
  if (!transcriptionConfigured()) {
    return Response.json(
      { error: "not-configured", message: "Voice isn't available right now — please type your question instead." },
      { status: 503 },
    );
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("audio");
    if (f instanceof File) file = f;
  } catch {
    return Response.json({ error: "bad-input", message: "That recording couldn't be read. Please type instead." }, { status: 400 });
  }

  if (!file) {
    return Response.json({ error: "bad-input", message: "No recording was received. Please type instead." }, { status: 400 });
  }

  // Diagnostics: what actually arrived.
  console.log(`[transcribe] received ${file.size} bytes, type="${file.type}", name="${file.name}"`);

  // A near-empty blob means the mic captured nothing (an accidental tap).
  if (file.size < 1500) {
    return Response.json(
      { error: "empty", message: "That recording was too short. Hold the mic, speak, then stop." },
      { status: 400 },
    );
  }

  try {
    const text = await transcribeAudio(file);
    if (!text) {
      return Response.json(
        { error: "no-speech", message: "I couldn't make out any speech there. Please try again." },
        { status: 422 },
      );
    }
    return Response.json({ text });
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    console.error(`[transcribe] Groq error (status ${status ?? "?"}):`, err);
    if (status === 429) {
      return Response.json(
        { error: "rate-limit", message: "Voice is busy right now — please type your question instead." },
        { status: 429 },
      );
    }
    return Response.json(
      { error: "upstream", message: "Voice isn't available right now — please type your question instead." },
      { status: 502 },
    );
  }
}

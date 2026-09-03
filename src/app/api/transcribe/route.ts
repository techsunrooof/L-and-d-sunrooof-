import { NextRequest } from "next/server";
import { spawn } from "node:child_process";
import { writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import ffmpegPath from "ffmpeg-static";
import { transcribeAudio } from "@/lib/voice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
  Press-to-talk speech → text (§ Voice). The browser records webm/ogg (Opus); the
  audio model wants mp3, so we transcode with ffmpeg here, then transcribe. The
  recording is NOT stored — the temp files are deleted straight after.
*/

async function toMp3(input: Buffer): Promise<Buffer> {
  if (!ffmpegPath) throw new Error("ffmpeg-not-available");
  const inFile = path.join(os.tmpdir(), `stt-${randomUUID()}`);
  const outFile = path.join(os.tmpdir(), `stt-${randomUUID()}.mp3`);
  await writeFile(inFile, input);
  try {
    await new Promise<void>((resolve, reject) => {
      const ff = spawn(ffmpegPath as string, ["-y", "-i", inFile, "-ac", "1", "-ar", "16000", "-f", "mp3", outFile]);
      let err = "";
      ff.stderr.on("data", (d) => (err += d.toString()));
      ff.on("error", reject);
      ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}: ${err.slice(-200)}`))));
    });
    return await readFile(outFile);
  } finally {
    void unlink(inFile).catch(() => {});
    void unlink(outFile).catch(() => {});
  }
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY) {
    return Response.json(
      { error: "not-configured", message: "Voice isn't switched on yet — an API key is needed on the server." },
      { status: 503 },
    );
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("audio");
    if (f instanceof File) file = f;
  } catch {
    return Response.json({ error: "bad-input", message: "That recording couldn't be read." }, { status: 400 });
  }

  if (!file || file.size === 0) {
    return Response.json(
      { error: "empty", message: "The recording was empty. Press the mic, speak, then press stop." },
      { status: 400 },
    );
  }

  let mp3: Buffer;
  try {
    mp3 = await toMp3(Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    console.error("[assistant] audio transcode failed", err);
    return Response.json(
      { error: "transcode", message: "Couldn't read that recording. Please try again." },
      { status: 502 },
    );
  }

  try {
    const text = await transcribeAudio(mp3);
    if (!text) {
      return Response.json(
        { error: "no-speech", message: "I couldn't make out any speech there. Please try again." },
        { status: 422 },
      );
    }
    return Response.json({ text });
  } catch (err) {
    console.error("[assistant] transcribe error", err);
    return Response.json(
      { error: "upstream", message: "Couldn't transcribe that just now. Please try again, or type instead." },
      { status: 502 },
    );
  }
}

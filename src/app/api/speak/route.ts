import { NextRequest } from "next/server";
import { z } from "zod";
import { synthesizeSpeech } from "@/lib/voice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
  Text → spoken audio (§ Voice). Only ever called on request (a speaker button),
  never auto-played. Returns mp3 bytes for the browser to play.
*/
const bodySchema = z.object({ text: z.string().min(1).max(4000) });

export async function POST(req: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY) {
    return Response.json(
      { error: "not-configured", message: "Voice isn't switched on yet." },
      { status: 503 },
    );
  }

  let text: string;
  try {
    text = bodySchema.parse(await req.json()).text;
  } catch {
    return Response.json({ error: "bad-input" }, { status: 400 });
  }

  try {
    const audio = await synthesizeSpeech(text);
    return new Response(audio, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    console.error("[assistant] speak error", err);
    return Response.json(
      { error: "upstream", message: "Couldn't read that out just now." },
      { status: 502 },
    );
  }
}

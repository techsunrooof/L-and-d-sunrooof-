import { NextRequest } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
  Basic AI assistant (§8). Powered by OpenRouter with the key held server-side —
  it is never exposed to the browser. General purpose for now; deliberately NOT
  wired to the training content yet (that is a later decision, §8.3).
*/

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .min(1)
    .max(40),
});

const SYSTEM_PROMPT =
  "You are the SUNROOOF assistant, helping a new employee during their onboarding. " +
  "SUNROOOF makes artificial skylights that bring natural-looking sunlight to spaces " +
  "where real daylight isn't possible. Be warm, concise and clear.";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "not-configured" },
      { status: 503 },
    );
  }

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return Response.json({ error: "bad-input" }, { status: 400 });
  }

  const client = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://sunrooof.com",
      "X-Title": "SUNROOOF Learning",
    },
  });

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...parsed.messages],
      temperature: 0.5,
    });
    const content = completion.choices[0]?.message?.content ?? "";
    return Response.json({ content });
  } catch (err) {
    console.error("chat error", err);
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}

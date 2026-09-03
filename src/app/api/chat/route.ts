import { NextRequest } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { knowledgeForQuestion, buildKnowledgeContext } from "@/lib/knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
  The SUNROOOF onboarding assistant (§8). Answers a new joiner's questions from
  the company's own onboarding material (the Supabase knowledge base), with the
  OpenRouter key held server-side only. Plain request/response — no streaming
  (the project has no streaming pattern in use).
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

const RULES = [
  "You are the SUNROOOF onboarding assistant, helping a new employee during their first days (Day 1 to Day 7). SUNROOOF makes engineered skylights that bring natural-looking sunlight indoors.",
  "",
  "Answer ONLY the exact question asked — nothing beyond it. If they ask about footwear, answer about footwear; do not add the rest of the policy.",
  "Be short by default: a few sentences, or up to about five short bullets. Go longer only when the question genuinely needs it, like the steps of a process.",
  "Do NOT restate the question. Do NOT open with a preamble. Do NOT end with a summary of what you just said. Get straight to the answer.",
  "When the question is broad and the material is long, give the gist in about three lines and then OFFER the rest — e.g. 'That's the short version — want the full policy for men or for women?'. Never dump a whole document.",
  "If the question is genuinely ambiguous, ask ONE short clarifying question instead of answering every possible reading.",
  "Answer from the SUNROOOF knowledge base below. If the answer is NOT in the material, say so in one line and point them to their manager or HR — do NOT invent a policy, price, timeline, process or name. You may add clearly-labelled general knowledge ('General, not from SUNROOOF's material: …') only if it helps.",
  "NEVER give answers to assessments, quizzes or assignments. Tell the person to work through it themselves and offer to explain the underlying topic.",
  "",
  "Format: reply in PLAIN TEXT only. No markdown — no asterisks for bold, no '#', no markdown links. If you list things, use short lines each starting with '• ' (a bullet dot). End with ONE short source line, e.g. 'Source: attire and dress code policy' or 'Source: Day 3'. Skip the source line for a clarifying question or general knowledge.",
].join("\n");

function buildSystemPrompt(knowledge: string): string {
  const kb = knowledge.trim()
    ? `SUNROOOF KNOWLEDGE BASE (the only company material you may treat as fact):\n\n${knowledge}`
    : "SUNROOOF KNOWLEDGE BASE: (empty — no onboarding material is loaded yet. Tell the person it isn't loaded yet and point them to their manager or HR, rather than guessing.)";
  return `${RULES}\n\n${kb}`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "not-configured" }, { status: 503 });
  }

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return Response.json({ error: "bad-input" }, { status: 400 });
  }

  // The knowledge relevant to the latest question (today: the whole active base).
  const lastUser = [...parsed.messages].reverse().find((m) => m.role === "user");
  let knowledgeBlock = "";
  try {
    const entries = await knowledgeForQuestion(lastUser?.content ?? "");
    knowledgeBlock = buildKnowledgeContext(entries);
  } catch (err) {
    console.error("[assistant] knowledge load failed", err);
    // Continue with an empty base rather than failing the whole request.
  }

  // Keep the last several turns so follow-up questions make sense.
  const recent = parsed.messages.slice(-12);

  const client = new OpenAI({
    apiKey,
    // `||` not `??`: an empty env var (common on Vercel) must fall back to the default.
    baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://sunrooof.com",
      "X-Title": "SUNROOOF Learning",
    },
  });

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
      messages: [{ role: "system", content: buildSystemPrompt(knowledgeBlock) }, ...recent],
      temperature: 0.3,
    });
    const content = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!content) {
      return Response.json({ error: "empty" }, { status: 502 });
    }
    return Response.json({ content });
  } catch (err) {
    console.error("[assistant] chat error", err);
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}

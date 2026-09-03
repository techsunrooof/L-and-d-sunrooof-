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
  "You are the SUNROOOF onboarding assistant. You help a new employee during their first days (Day 1 to Day 7) while they watch videos and read documents.",
  "SUNROOOF makes engineered skylights that bring natural-looking sunlight into spaces without real daylight.",
  "",
  "How to answer:",
  "- Answer from the SUNROOOF knowledge base below FIRST. When the answer is in the material, give it plainly and say where it came from — the document or policy name, or the day and module.",
  "- If the answer is NOT in the material, say so honestly. Do NOT invent a policy, a price, a timeline, a process, or a name. After saying it isn't in the material, you may add general information ONLY with a clear line such as 'This is general information, not from SUNROOOF's material.' — or point the person to who they should ask.",
  "- NEVER give away answers to assessments, quizzes or assignments. If asked for an assessment answer, tell the person to work through it themselves and offer to explain the underlying topic instead.",
  "- Keep answers short and in simple English. These are new joiners in their first week.",
  "- Prefer short bullet points over paragraphs. Lead with the key point, use a tight bullet list for the details, and stop — no long preamble or wrap-up. Only use a plain sentence when the answer is a single short fact.",
  "- Do not use knowledge-base wording like 'source type' in your reply; just mention the natural name of the document, policy or day.",
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

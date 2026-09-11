import { NextRequest } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { knowledgeForQuestion, buildKnowledgeContext } from "@/lib/knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
  The SUNROOOF onboarding assistant. Answers a new joiner's questions from the
  company's own onboarding material (the Supabase knowledge base), with the
  OpenRouter key held server-side only. Plain request/response — no streaming
  (the project has no streaming pattern in use).

  ONE knowledge base, ONE retrieval path, two delivery styles: `mode: "text"`
  for the chat bot and `mode: "voice"` when the question was asked out loud
  (bullets can't be spoken, so the same points are said as "First… Second…").
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
  mode: z.enum(["text", "voice"]).default("text"),
});

/* The standing instructions both bots share. */
const RULES = [
  "You are the SUNROOOF onboarding assistant, helping a new employee through their first days (Day 1 to Day 7). You are friendly, plain-spoken and brief. No corporate padding.",
  "",
  "WHAT YOU ANSWER FROM",
  "Answer from the SUNROOOF knowledge base below. That is your only source for company facts.",
  "One exception, for orientation only: SUNROOOF makes engineered artificial skylights that bring natural-looking sunlight into indoor spaces with no real daylight — a wellness-lighting product that mimics the sun. Its parent company is Magppie, known for engineered-stone (Silverstone) wellness kitchens and interiors. You may answer 'what is SUNROOOF / what do we do' from this — in two or three points, and with no source line. Never extend it into policy, prices, timelines, warranties, commitments, people or day details.",
  "If the entries below do not answer the question, say so — EVEN IF you know the answer from general knowledge. Explaining an industry or technical term you happen to know is still answering from outside the material, and you must not do it.",
  "Never OFFER to answer from general knowledge either — do not raise it as an option, and if the person asks you to anyway, say you can only go by SUNROOOF's own material. Offer to explain something only when the material below covers it.",
  "Answer only the exact question asked. If they ask about footwear, answer about footwear — do not add the rest of the policy.",
  "",
  "HOW EVERY ANSWER IS SHAPED",
  "Answer in points. Not paragraphs.",
  "At most ONE short lead-in line, and only if it helps. Then the points.",
  "Three to six points is a normal answer. Go to eight only when the question genuinely has that many parts. A one-fact question gets one or two points, not padding.",
  "EIGHT POINTS IS A HARD CEILING for the whole answer, counting every group and sub-list together. Two lists of five is ten points and is not allowed.",
  "When a policy has separate guidance for men and for women (or for two roles) and the person has not said which applies to them, give at most FOUR essentials that apply to everyone, then ask which list they want in full — e.g. 'Want the full list for men or for women?'.",
  "One idea per point. Keep each point to a single line where you can. Never pack several facts into one point separated by semicolons — split them into their own points, or give the short version and offer the rest.",
  "Numbered points (1. 2. 3.) when the order matters — steps, stages, a process. Bullet points ('• ') when it does not.",
  "Never nest more than one level deep.",
  "Close with one short line ONLY when there is a next action or a person to contact. Otherwise stop at the last point.",
  "Simple words. If a technical or industry term is unavoidable, explain it in a few words in the same point.",
  "If the material for the question is long — a whole dress code, a whole leave policy — give at most FOUR points covering the essentials and offer the detail. Do not compress the whole document into two long points.",
  "If the question is broad, give the short version in a few points and OFFER the rest — e.g. 'That's the short version — want the full policy for men or for women?'. Never dump a whole document.",
  "If the question is genuinely ambiguous, ask ONE short clarifying question instead of answering every reading of it.",
  "",
  "FORMAT",
  "Plain text only. No markdown: no asterisks, no '#', no bold, no markdown links.",
  "Bullet lines MUST start with the character '•' followed by a space. Never use a hyphen, a dash or an asterisk to start a point. Numbered lines are '1. ', '2. '.",
  "End with ONE short source line naming where it is in the portal, e.g. 'Source: Company policy video (Day 1)' or 'Source: Day 3'. Skip it for a clarifying question or for the orientation answer above.",
  "",
  "WHAT YOU MUST NOT DO",
  "Never answer from outside the supplied content (beyond the one orientation exception).",
  "Never guess a policy, a price, a timeline, a warranty or a commitment.",
  "HR POLICIES: answer only from the policy text below. Never fill a gap, never guess a rule, never generalise from how other companies do it. When you answer from a policy, name that policy by its title in the source line, e.g. 'Source: Attire and dress code policy (HR Policy, Day 1)'. When the policies do not cover the question, say so plainly and say to ask HR.",
  "Never invent a document name, a video, a duration or a person's name.",
  "Never give the answer to an assessment, quiz or assignment question. Say it has to be worked through, and offer to explain the underlying topic instead.",
  "Never say a task is complete on the learner's behalf, and never claim to have changed their progress.",
  "",
  "WHEN YOU DO NOT KNOW",
  "Say plainly that it is not in the onboarding content yet.",
  "Say which day or module it would belong to ONLY if the material makes that clear. Never guess a day. Never say where it would 'likely' or 'probably' be — if the material does not say, say nothing about where.",
  "If the item exists in the portal but is not loaded yet, say exactly that — do not tell them to go and look for it.",
  "Keep the refusal to a line or two. It does not need points.",
  "Say who to ask — HR for policy, pay and leave; their manager or team lead for work and schedule.",
  "Do not apologise more than once and do not pad the answer to look fuller.",
  "",
  "LANGUAGE",
  "Answer in the language the person used. Hindi gets Hindi, mixed Hindi-English gets the same mix, English gets English. The points rule holds in every language.",
  "Keep the thread of the conversation, so a follow-up like 'and after that?' works.",
  "Each knowledge entry below states where it sits in the portal. When someone asks where to find something, answer with that — the day, the module, and the item number if the material gives one. Do not send them to HR or an app for something that is in the portal.",
  "When you list a day, list every item that day entry actually has content for — videos, documents AND assessments — in the order given.",
  "Never describe a day, module or item from memory. If the day entry for the day being asked about is not in the material below, say you can pull it up if they name the day, rather than describing it.",
  "The day entries mark items that are NOT loaded into the portal yet. Never tell someone to watch or read one of those — list what is actually there, and say plainly which parts are still to come.",
].join("\n");

/* Extra standing instructions when the question was asked out loud (§6). */
const VOICE_RULES = [
  "",
  "=== THIS QUESTION WAS ASKED OUT LOUD. THESE RULES OVERRIDE THE FORMAT RULES ABOVE, IN EVERY LANGUAGE. ===",
  "The answer will be read out by a voice, so it must sound like a person talking.",
  "NO bullet characters at all — no '•', no dashes, no asterisks, no hash symbols, no numbered lines, and never the words 'bullet point'. Write it as sentences.",
  "Keep the points, but say them the way a person would: 'There are four things. First… Second… Third… Fourth…'.",
  "Say the total count up front so the listener knows how long the answer is.",
  "Maximum FOUR points spoken. If the real answer has more, give the first four and offer the rest: 'There are three more — want me to go on?'.",
  "If the guidance differs for men and women and the person has not said which applies, speak only the essentials that apply to everyone, then ask: 'Want it for men or for women?'. Never answer for one without saying so and offering the other.",
  "Each spoken point is one short sentence, under about fifteen words.",
  "Do not read out long lists of names, numbers or file names. If the answer is really a table or a long list, say so and point them to the screen.",
  "Say numbers, dates and times in full words, not shorthand.",
  "Answer in the language the question was asked in — a Hindi or Hinglish question gets a Hindi or Hinglish answer, spoken the same way.",
  "Never read out a file name. But when the answer comes from an HR policy, SAY THE POLICY'S NAME out loud so they know where it came from — e.g. 'That's from the Attire and dress code policy, on Day one.' For anything else, say where it is, e.g. 'It's on Day one in the portal.'",
].join("\n");

function buildSystemPrompt(knowledge: string, baseEmpty: boolean, voice: boolean): string {
  let kb: string;
  if (knowledge.trim()) {
    kb = `SUNROOOF KNOWLEDGE BASE — the pieces relevant to this question (the only company material you may treat as fact):\n\n${knowledge}`;
  } else if (baseEmpty) {
    kb =
      "SUNROOOF KNOWLEDGE BASE: empty — no onboarding material is loaded yet. Tell the person it isn't loaded yet and say who to ask, rather than guessing.";
  } else {
    kb =
      "SUNROOOF KNOWLEDGE BASE: nothing in the onboarding material matches this question. Say so plainly, say which day or module it would belong to if that is clear, and say who to ask. Do not answer it from general knowledge.";
  }
  return `${RULES}\n\n${kb}${voice ? `\n${VOICE_RULES}` : ""}`;
}

/** Points in a plain-text answer: lines starting "• " or "1. ". */
const countPoints = (text: string) => text.split("\n").filter((l) => /^\s*(•|\d+\.)\s/.test(l)).length;

/** The hard rules a chat answer can be checked against mechanically. */
function breakingRules(text: string, policyTitles: string[]): string[] {
  const problems: string[] = [];
  const points = countPoints(text);
  if (points > 8) {
    problems.push(
      `It has ${points} points. Eight is the hard maximum for the whole answer, counting every group. ` +
        "If the guidance differs for men and women and they did not say which applies, give at most four essentials " +
        "that apply to everyone and ask which list they want in full.",
    );
  }
  if (/\b(likely|probably)\b[^.\n]*\b(module|day)\b/i.test(text)) {
    problems.push(
      "It guesses where the missing information would be (\"likely …\"). The material does not say, so say nothing " +
        "about where — only that it is not in the onboarding content yet, and to ask HR.",
    );
  }
  if (policyTitles.length > 0 && points > 0 && !/source:/i.test(text)) {
    problems.push(
      `It is missing the source line. End with: 'Source: ${policyTitles[0]} (HR Policy, Day 1)'.`,
    );
  }
  return problems;
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

  // Retrieve only the few entries relevant to the latest question. The turns
  // just before it are passed as context so bare follow-ups still retrieve.
  const lastUserIndex = parsed.messages.map((m) => m.role).lastIndexOf("user");
  const question = lastUserIndex >= 0 ? parsed.messages[lastUserIndex].content : "";
  const context = parsed.messages.slice(Math.max(0, lastUserIndex - 4), lastUserIndex).map((m) => m.content);

  let knowledgeBlock = "";
  let baseEmpty = true;
  // The HR policies behind this answer, by title — so the answer can be held
  // to naming them.
  let policyTitles: string[] = [];
  try {
    const { entries, baseEmpty: empty } = await knowledgeForQuestion(question, context);
    knowledgeBlock = buildKnowledgeContext(entries);
    baseEmpty = empty;
    policyTitles = [
      ...new Set(
        entries.filter((e) => e.kind === "policy" && e.module === "HR Policy").map((e) => e.title.split(" — ")[0]),
      ),
    ];
    if (process.env.ASSISTANT_DEBUG === "on") {
      console.log(`[assistant] retrieved ${entries.length}: ${entries.map((e) => e.title).join(" | ") || "(no match)"}`);
    }
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
      model: process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini",
      messages: [
        { role: "system", content: buildSystemPrompt(knowledgeBlock, baseEmpty, parsed.mode === "voice") },
        ...recent,
      ],
      temperature: 0.3,
      // A points answer is short by design. The cap also keeps the request
      // inside a small OpenRouter balance — without it the provider reserves
      // the model's full output window and rejects the call with a 402.
      max_tokens: 700,
    });
    let content = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!content) {
      return Response.json({ error: "empty" }, { status: 502 });
    }

    // The prompt alone does not reliably hold the hard rules when retrieval
    // hands over two long lists (a men's and a women's dress code), so a chat
    // answer is CHECKED, and gets exactly one correction if it breaks them.
    // Never a loop: whatever the retry returns is what is sent.
    const problems = parsed.mode === "text" ? breakingRules(content, policyTitles) : [];
    if (problems.length > 0) {
      const retry = await client.chat.completions.create({
        model: process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini",
        messages: [
          { role: "system", content: buildSystemPrompt(knowledgeBlock, baseEmpty, false) },
          ...recent,
          { role: "assistant", content },
          {
            role: "user",
            content:
              `Rewrite your last answer. It broke these rules:\n${problems.map((p) => `- ${p}`).join("\n")}\n` +
              "Use only what the material says. Reply with the corrected answer only.",
          },
        ],
        temperature: 0.2,
        max_tokens: 700,
      });
      const fixed = retry.choices[0]?.message?.content?.trim();
      if (fixed) content = fixed;
      if (process.env.ASSISTANT_DEBUG === "on") {
        console.log(`[assistant] corrected: ${problems.join(" / ")} → ${breakingRules(content, policyTitles).length} left`);
      }
    }

    return Response.json({ content });
  } catch (err) {
    console.error("[assistant] chat error", err);
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}

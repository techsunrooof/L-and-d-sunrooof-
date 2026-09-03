import "server-only";

/*
  The AI-assistant knowledge base lives in Supabase (table
  `public.sunrooof_ld_knowledge`), NOT in the repo — it carries internal policy,
  pricing and sales material. It is read server-side with the service-role key
  (the table has RLS on and no anon policy), so the content never reaches the
  browser and no client-reachable key can read it.

  For now the whole active base is sent to the model as context on every
  question. When the content outgrows one request, replace the body of
  `knowledgeForQuestion()` with a retrieval/search step — that is the single
  function the rest of the code goes through.
*/

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = "sunrooof_ld_knowledge";

export type KnowledgeKind =
  | "document"
  | "video_transcript"
  | "policy"
  | "product_fact"
  | "process"
  | "glossary"
  | "people";

export type KnowledgeEntry = {
  id: string;
  title: string;
  body: string;
  kind: KnowledgeKind;
  day: number | null;
  module: string | null;
};

export function knowledgeConfigured(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_KEY);
}

/** All active entries, ordered by day. Empty when storage isn't configured. */
export async function getActiveKnowledge(): Promise<KnowledgeEntry[]> {
  if (!SUPABASE_URL || !SERVICE_KEY) return [];
  try {
    const url =
      `${SUPABASE_URL}/rest/v1/${TABLE}` +
      `?active=eq.true&select=id,title,body,kind,day,module&order=day.asc.nullslast,title.asc`;
    const res = await fetch(url, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[assistant] knowledge fetch failed: ${res.status} ${await res.text()}`);
      return [];
    }
    return (await res.json()) as KnowledgeEntry[];
  } catch (err) {
    console.error("[assistant] knowledge fetch error", err);
    return [];
  }
}

/**
 * The knowledge relevant to a question. Today: the full active base (question
 * ignored). THIS is the one place to add retrieval/search later — swap the body
 * to rank + slice by `question` and nothing else needs to change.
 */
export async function knowledgeForQuestion(question: string): Promise<KnowledgeEntry[]> {
  void question;
  return getActiveKnowledge();
}

// Comfortable ceiling for one request. We only ever drop WHOLE entries, never
// cut an entry mid-sentence — and we log loudly when we have to.
const CONTEXT_CHAR_BUDGET = 60_000;

/** Format entries as the knowledge block for the system message. */
export function buildKnowledgeContext(entries: KnowledgeEntry[]): string {
  const blocks: string[] = [];
  let used = 0;
  let omitted = 0;
  for (const e of entries) {
    const where = e.day != null ? ` (Day ${e.day}${e.module ? `, ${e.module}` : ""})` : "";
    const block = `### ${e.title} — source type: ${e.kind}${where}\n${e.body}`;
    if (used + block.length > CONTEXT_CHAR_BUDGET && blocks.length > 0) {
      omitted += 1;
      continue;
    }
    blocks.push(block);
    used += block.length;
  }
  if (omitted > 0) {
    console.warn(
      `[assistant] knowledge base too large for one request: sent ${blocks.length} entries ` +
        `(${used} chars), omitted ${omitted}. Add a retrieval step in knowledgeForQuestion().`,
    );
  }
  return blocks.join("\n\n");
}

/** Suggested starter questions — ONLY drawn from content that is actually loaded. */
export function starterQuestions(entries: KnowledgeEntry[]): string[] {
  const out: string[] = [];
  const has = (k: KnowledgeKind) => entries.some((e) => e.kind === k);

  if (entries.some((e) => e.kind === "policy" && /dress|attire/i.test(e.title))) {
    out.push("What is the dress code for client meetings?");
  }
  const days = entries
    .filter((e) => e.kind === "process" && e.day != null)
    .map((e) => e.day as number)
    .sort((a, b) => a - b);
  if (days.length) out.push(`What am I doing on Day ${days.includes(3) ? 3 : days[0]}?`);
  if (has("glossary")) out.push("What does RCC mean?");
  if (has("people")) out.push("Who should I ask about HR questions?");
  if (days.length > 1 && out.length < 4) out.push("How is the onboarding structured across the days?");

  return out.slice(0, 4);
}

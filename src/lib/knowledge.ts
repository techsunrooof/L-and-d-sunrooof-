import "server-only";

/*
  The AI-assistant knowledge base lives in Supabase (table
  `public.sunrooof_ld_knowledge`), NOT in the repo — it carries internal policy,
  pricing and sales material. It is read server-side with the service-role key
  (the table has RLS on and no anon policy), so the content never reaches the
  browser and no client-reachable key can read it.

  One entry = one topic, short enough to sit next to a few others in a request.
  Both bots (chat and voice) go through `knowledgeForQuestion()` — the ONLY
  retrieval path — so they can never answer from different material.

  Rebuild in one step:  npm run knowledge:rebuild   (see scripts/rebuild-knowledge.ts)
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

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

/*
  Which track an entry belongs to. Mirrors `Day.department` in content.ts:
  Days 1–3 are the common induction everyone does; Days 4+ are a department
  track (only Sales exists so far). Derived rather than stored so it can never
  drift from the portal's own day structure.
*/
const DEPARTMENT_BY_DAY: Record<number, string | null> = {
  1: null, 2: null, 3: null, 4: "Sales", 5: "Sales", 6: "Sales", 7: "Sales",
};

export function scopeLabel(day: number | null): string {
  if (day == null) return "applies throughout";
  const dept = DEPARTMENT_BY_DAY[day];
  return dept ? `${dept} track` : "common induction";
}

/* ------------------------------------------------------------------ */
/* Retrieval                                                           */
/* ------------------------------------------------------------------ */

/*
  A small lexical matcher: score every entry against the question, take the few
  best. The base is a few dozen short entries, so this is both fast and easy to
  reason about — and it is the one place to swap in embeddings later without
  touching the routes.
*/

const STOPWORDS = new Set(
  ("a an and are as at be but by can could do does for from get give go has have how i if in is it its" +
    " me my need not of on or our should so tell that the their them then there these they this to too" +
    " us want was we what when where which who whom why will with would you your about please kya hai" +
    " kaise mujhe mera ka ki ke ko me main hoon karna kar")
    .split(/\s+/),
);

/** Words a new joiner is likely to use vs. the words the material uses. */
const SYNONYMS: Record<string, string[]> = {
  attire: ["dress", "clothes", "clothing", "wear", "outfit", "uniform"],
  dress: ["attire", "clothes", "clothing", "wear"],
  leave: ["holiday", "vacation", "off", "leaves"],
  holiday: ["leave", "festival", "floating", "fixed"],
  timing: ["hours", "punch", "attendance", "shift", "time"],
  attendance: ["punch", "hours", "keka", "timing"],
  punch: ["attendance", "hours", "timing", "keka"],
  salary: ["pay", "payroll", "deduction", "encashment"],
  resign: ["notice", "exit", "resignation", "offboarding"],
  notice: ["resign", "exit", "resignation"],
  sick: ["medical", "illness", "unwell"],
  maternity: ["pregnancy", "gratuity"],
  referral: ["refer", "recruitment", "hiring"],
  laptop: ["asset", "assets", "equipment"],
  asset: ["laptop", "equipment", "property"],
  harassment: ["discrimination", "bullying", "posh"],
  bribe: ["bribery", "corruption", "gift"],
  skylight: ["sunrooof", "sunroof", "daylight", "sunlight", "lighting"],
  kitchen: ["magppie", "silverstone", "stone"],
  assessment: ["test", "quiz", "assignment", "exam"],
  video: ["watch", "session"],
  today: ["day"],
};

function normalise(word: string): string {
  const w = word.toLowerCase();
  // crude singularisation — "leaves"→"leave", "policies"→"policie"→ good enough for matching
  if (w.length > 4 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9ऀ-ॿ]+/) // keep Devanagari so Hindi questions still match
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(normalise);
}

function expand(tokens: string[]): Set<string> {
  const out = new Set(tokens);
  for (const t of tokens) for (const s of SYNONYMS[t] ?? []) out.add(normalise(s));
  return out;
}

/** "And then? / what next?" — the answer is the following day. */
function asksNext(text: string): boolean {
  return /\bnext\b|\bthen\b|after (that|this)|\bbaad\b|\baage\b|uske baad/i.test(text);
}

/** "Where do I find it / which day is it on" — the day structure answers these. */
function asksWhere(text: string): boolean {
  return /\bwhere\b|\bfind\b|which day|what day|\bkaha|kis din|kab\b|locat/i.test(text);
}

/** The day a question is explicitly about ("what's on day 3"), or null. */
function dayHint(text: string): number | null {
  const m = /\bday\s*([1-7])\b/i.exec(text);
  return m ? Number(m[1]) : null;
}

/*
  Scoring. A word that shows up in most entries (like "day", or the "1" from the
  "Day 1, item 1.6" footer every policy entry carries) tells us nothing, so its
  weight in the body is cut right down — otherwise a question about Day 1 drags
  in every Day 1 policy alphabetically.
*/
function documentFrequency(entries: KnowledgeEntry[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const e of entries) {
    for (const t of new Set([...tokenise(e.title), ...tokenise(e.module ?? ""), ...tokenise(e.body)])) {
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }
  return df;
}

function scoreEntry(
  entry: KnowledgeEntry,
  queryTokens: Set<string>,
  day: number | null,
  wants: { where: boolean },
  df: Map<string, number>,
  total: number,
): number {
  const title = new Set(tokenise(entry.title));
  const moduleTokens = new Set(tokenise(entry.module ?? ""));
  const body = new Set(tokenise(entry.body));
  let score = 0;
  for (const t of queryTokens) {
    // Common across the base = not a signal.
    const common = (df.get(t) ?? 0) > total * 0.3;
    if (title.has(t)) score += common ? 1 : 4;
    else if (moduleTokens.has(t)) score += common ? 0.5 : 2;
    else if (body.has(t)) score += common ? 0.1 : 1;
  }
  if (day != null && entry.day === day) score += 5;
  // "Where is the company policy video?" is answered by the day's structure
  // entry, not by the policy text itself.
  if (wants.where && entry.kind === "process" && score > 0) score += 4;
  return score;
}

const MAX_ENTRIES = 5;
const MIN_SCORE = 2; // one weak body hit is not a match
const RELATIVE_FLOOR = 0.4; // and nothing far behind the best match rides along
const CONTEXT_CHAR_BUDGET = 24_000; // a few entries, never the whole base

export type Retrieval = {
  entries: KnowledgeEntry[];
  /** True when the base itself is empty (nothing loaded) — different from "no match". */
  baseEmpty: boolean;
};

/**
 * The few pieces of knowledge relevant to this question.
 *
 * `context` is the recent conversation (older user turns and the last answer),
 * used only to keep follow-ups like "and then?" on topic — it is weighted below
 * the question itself.
 */
export async function knowledgeForQuestion(question: string, context: string[] = []): Promise<Retrieval> {
  const all = await getActiveKnowledge();
  if (all.length === 0) return { entries: [], baseEmpty: true };

  const q = tokenise(question);
  const queryTokens = expand(q);
  const bare = q.length < 3; // "and then?", "aur uske baad?" — no subject of its own
  if (bare) for (const t of expand(tokenise(context.join(" ")))) queryTokens.add(t);

  // "and then / what next" after talking about Day N means Day N+1.
  const contextDay = dayHint(context.join(" "));
  let day = dayHint(question);
  if (day == null && contextDay != null && asksNext(question)) day = Math.min(contextDay + 1, 7);
  else if (day == null && bare) day = contextDay;

  const df = documentFrequency(all);
  const wants = { where: asksWhere(question) };
  const ranked = all
    .map((e) => ({ e, score: scoreEntry(e, queryTokens, day, wants, df, all.length) }))
    .filter((r) => r.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || (a.e.day ?? 99) - (b.e.day ?? 99));

  const floor = ranked.length ? ranked[0].score * RELATIVE_FLOOR : 0;
  const picked: KnowledgeEntry[] = [];
  let chars = 0;
  for (const { e, score } of ranked) {
    if (picked.length >= MAX_ENTRIES || score < floor) break;
    if (chars + e.body.length > CONTEXT_CHAR_BUDGET && picked.length > 0) continue;
    picked.push(e);
    chars += e.body.length;
  }
  return { entries: picked, baseEmpty: false };
}

/** Format entries as the knowledge block for the system message. */
export function buildKnowledgeContext(entries: KnowledgeEntry[]): string {
  return entries
    .map((e) => {
      const where = e.day != null ? `Day ${e.day}${e.module ? `, ${e.module}` : ""} — ${scopeLabel(e.day)}` : "applies throughout";
      return `### ${e.title}\n[where in the portal: ${where} · source type: ${e.kind}]\n${e.body}`;
    })
    .join("\n\n");
}

/** Suggested starter questions — ONLY drawn from content that is actually loaded. */
export function starterQuestions(entries: KnowledgeEntry[]): string[] {
  const out: string[] = [];
  const has = (k: KnowledgeKind) => entries.some((e) => e.kind === k);

  if (entries.some((e) => /dress|attire/i.test(e.title))) {
    out.push("What is the dress code for client meetings?");
  }
  if (entries.some((e) => /working hours|attendance|punch/i.test(e.title))) {
    out.push("What are my working hours?");
  }
  const days = entries
    .filter((e) => e.kind === "process" && e.day != null)
    .map((e) => e.day as number)
    .sort((a, b) => a - b);
  if (days.length) out.push(`What do I have to finish on Day ${days[0]}?`);
  if (has("glossary")) out.push("What does RCC mean?");
  if (has("people")) out.push("Who should I ask about HR questions?");
  if (days.length > 1 && out.length < 4) out.push("How is the onboarding structured across the days?");

  return out.slice(0, 4);
}

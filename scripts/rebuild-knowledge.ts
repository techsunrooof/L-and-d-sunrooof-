/*
  Rebuild the AI-assistant knowledge base in one step.

      npm run knowledge:rebuild          # rebuild the Supabase table
      npm run knowledge:rebuild -- --dry  # show what would change, write nothing
      npm run knowledge:export           # dump the current table back to source files

  Where the content lives
  -----------------------
  The knowledge base is NOT in this repository — it carries internal policy and
  sales material. It has two halves:

    1. Portal structure (kind: "process") — one entry per day, GENERATED here
       from src/lib/content.ts, so it can never drift from the real day/module
       list. Nothing is invented: an item with no content loaded is described as
       not loaded yet.

    2. Supplied content (policy, documents, transcripts) — one small file per
       topic in KNOWLEDGE_SOURCE_DIR, a folder OUTSIDE the repo
       (default: ../sunrooof-ld-knowledge). Each file is Markdown with a short
       front matter block:

           ---
           title: Working hours, punching in and attendance
           kind: policy
           day: 1
           module: Company policy video
           ---
           <the text of the entry>

  Rules kept by this script: one topic per entry, never merge topics, never
  invent content. A topic that has not been supplied simply has no file.
*/

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DAYS, MODULES, POLICY_CATEGORIES } from "../src/lib/content.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const TABLE = "sunrooof_ld_knowledge";

/* ---------------- env ---------------- */

function loadEnv(): void {
  const file = join(ROOT, ".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    const value = m[2].replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SOURCE_DIR = process.env.KNOWLEDGE_SOURCE_DIR || resolve(ROOT, "..", "sunrooof-ld-knowledge");

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (.env or the environment).");
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

/* ---------------- the generated half: portal structure ---------------- */

type Entry = { title: string; body: string; kind: string; day: number | null; module: string | null };

const minutes = (s: number) => `${Math.round(s / 60)} min`;

function describeItem(item: (typeof MODULES)[number]["items"][number]): string {
  const number = item.number ? `${item.number} ` : "";
  if (item.kind === "video") {
    if (!item.src && !item.youtubeId) return `${number}${item.title} (video — not loaded yet)`;
    return `${number}${item.title} (video, ${minutes(item.durationSeconds)})`;
  }
  if (item.kind === "document") {
    if (item.pointsTo === "policy-library") return `${item.title} (opens the HR Policy module)`;
    if (!item.file && !item.sections) return `${item.title} (document — not loaded yet)`;
    return `${item.title} (document)`;
  }
  const total = item.assessment.totalMarks;
  return total ? `${item.title} (assessment, ${total} marks)` : `${item.title} (assessment — not loaded yet)`;
}

function structureEntries(): Entry[] {
  return DAYS.map((day) => {
    const mods = MODULES.filter((m) => m.day === day.number).sort((a, b) => a.order - b.order);
    const lines: string[] = [];
    lines.push(
      `Day ${day.number} is "${day.title}" — ${day.subtitle}. It is part of the ` +
        (day.department ? `${day.department} department track (Days 4 to 7).` : "common induction that everyone does (Days 1 to 3)."),
    );
    if (mods.length) {
      lines.push("");
      lines.push("Modules and what is in each:");
      for (const m of mods) {
        lines.push(`${m.title}: ${m.items.map(describeItem).join("; ")}.`);
      }
    } else {
      lines.push("");
      lines.push("No modules have been loaded into the portal for this day yet.");
    }
    if (day.activities?.length) {
      lines.push("");
      lines.push(`In person (not in the portal): ${day.activities.map((a) => a.title).join("; ")}.`);
    }
    lines.push("");
    lines.push("Source: the portal's own day and module list.");
    return {
      title: `Day ${day.number} — ${day.title}`,
      body: lines.join("\n"),
      kind: "process",
      day: day.number,
      module: null,
    };
  });
}

/* ---------------- HR Policy: generated from the documents themselves ---------------- */

/*
  Policy entries are built from the SAME verbatim text the HR Policy reader
  shows, so the assistant can never drift from the document. One entry per
  section of each document (small pieces retrieve better than whole files),
  each naming the policy and its version. Withdrawn policies are left out —
  a stale answer on an HR rule is worse than no answer.

  To update a policy: change it in src/lib/content.ts, bump its version, then
  run `npm run knowledge:rebuild`.
*/
function policyEntries(): Entry[] {
  const out: Entry[] = [];
  for (const mod of MODULES) {
    if (mod.library !== "policy") continue;
    for (const item of mod.items) {
      if (item.kind !== "document" || !item.policy || item.policy.status !== "current") continue;
      const category = POLICY_CATEGORIES.find((c) => c.id === item.policy!.category)?.name ?? "Uncategorised";
      const sourceLine =
        `Source: ${item.title} (version ${item.policy.version}), HR Policy module, Day ${mod.day} — category: ${category}. ` +
        "Owner: HR at SUNROOOF. For anything this policy does not cover, ask HR.";
      for (const section of item.sections ?? []) {
        out.push({
          title: `${item.title} — ${section.heading}`,
          kind: "policy",
          day: mod.day,
          module: mod.title,
          body: `${section.body.trim()}\n\n${sourceLine}`,
        });
      }
    }
  }
  return out;
}

/* ---------------- the supplied half: one file per topic ---------------- */

function parseFile(text: string, file: string): Entry {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text.trim());
  if (!m) throw new Error(`${file}: missing the front matter block (--- … ---)`);
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = /^([a-z_]+)\s*:\s*(.*)$/.exec(line.trim());
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  if (!meta.title) throw new Error(`${file}: front matter needs a title`);
  if (!meta.kind) throw new Error(`${file}: front matter needs a kind`);
  const body = m[2].trim();
  if (!body) throw new Error(`${file}: the entry has no body`);
  return {
    title: meta.title,
    kind: meta.kind,
    day: meta.day && meta.day !== "null" ? Number(meta.day) : null,
    module: meta.module && meta.module !== "null" ? meta.module : null,
    body,
  };
}

function suppliedEntries(): Entry[] {
  if (!existsSync(SOURCE_DIR)) {
    console.error(
      `Knowledge source folder not found: ${SOURCE_DIR}\n` +
        `Create it (outside the repo) or set KNOWLEDGE_SOURCE_DIR. Run --export first to seed it from the current table.`,
    );
    process.exit(1);
  }
  const files = readdirSync(SOURCE_DIR).filter((f) => f.endsWith(".md")).sort();
  return files.map((f) => parseFile(readFileSync(join(SOURCE_DIR, f), "utf8"), f));
}

/* ---------------- the table ---------------- */

async function fetchActive(): Promise<(Entry & { id: string })[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE}?active=eq.true&select=id,title,body,kind,day,module&order=day.asc.nullslast,title.asc`,
    { headers },
  );
  if (!res.ok) throw new Error(`read failed: ${res.status} ${await res.text()}`);
  return res.json();
}

const slug = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);

async function exportToSource(): Promise<void> {
  const rows = await fetchActive();
  const supplied = rows.filter((r) => r.kind !== "process"); // structure is generated, never hand-edited
  mkdirSync(SOURCE_DIR, { recursive: true });
  for (const r of supplied) {
    const front = [
      "---",
      `title: ${r.title}`,
      `kind: ${r.kind}`,
      `day: ${r.day ?? "null"}`,
      `module: ${r.module ?? "null"}`,
      "---",
      "",
    ].join("\n");
    writeFileSync(join(SOURCE_DIR, `${slug(r.title)}.md`), `${front}${r.body}\n`);
  }
  console.log(`Exported ${supplied.length} supplied entries to ${SOURCE_DIR}`);
  console.log(`(${rows.length - supplied.length} generated day-structure entries were skipped — they come from src/lib/content.ts.)`);
}

async function rebuild(dry: boolean, force: boolean): Promise<void> {
  const next = [...structureEntries(), ...policyEntries(), ...suppliedEntries()];
  const current = await fetchActive();

  console.log(`Current table: ${current.length} entries. Rebuild would write: ${next.length}.`);
  const byKind = next.reduce<Record<string, number>>((a, e) => ((a[e.kind] = (a[e.kind] ?? 0) + 1), a), {});
  console.log("By kind:", byKind);

  const gone = current.filter((c) => !next.some((n) => n.title === c.title)).map((c) => c.title);
  const added = next.filter((n) => !current.some((c) => c.title === n.title)).map((n) => n.title);
  if (gone.length) console.log(`Would remove (${gone.length}):`, gone);
  if (added.length) console.log(`Would add (${added.length}):`, added);

  if (dry) return console.log("--dry: nothing written.");
  if (next.length < current.length * 0.5 && !force) {
    console.error("Refusing to rebuild: that would drop more than half the entries. Re-run with --force if it is intended.");
    process.exit(1);
  }

  const del = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=not.is.null`, { method: "DELETE", headers });
  if (!del.ok) throw new Error(`delete failed: ${del.status} ${await del.text()}`);

  for (let i = 0; i < next.length; i += 20) {
    const chunk = next.slice(i, i + 20).map((e) => ({ ...e, active: true }));
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) throw new Error(`insert failed: ${res.status} ${await res.text()}`);
  }
  console.log(`Rebuilt: ${next.length} entries live.`);
}

const args = process.argv.slice(2);
const run = args.includes("--export")
  ? exportToSource()
  : rebuild(args.includes("--dry"), args.includes("--force"));
run.catch((err) => {
  console.error(err);
  process.exit(1);
});

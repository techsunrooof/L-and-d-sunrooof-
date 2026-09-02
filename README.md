# SUNROOOF Learning & Development portal

Onboarding portal for new SUNROOOF employees: a fixed sequence of videos, a
document or two per day, and a short assessment after each — matching the
sunrooof.com look. Built with Next.js (App Router), TypeScript, Tailwind,
Drizzle over SQLite (local-first), React Three Fiber for the background, and
Framer Motion.

## Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000. No environment variables are required — the
portal runs local-first and stores learner progress in `./data/portal.db`
(SQLite, created automatically and git-ignored).

To run the production build:

```bash
npm run build && npm start
```

## Environment variables

None are required to run. The optional ones are documented — names only — in
[`.env.example`](.env.example); copy it to `.env` and fill in what you need:

| Variable | What it's for |
|---|---|
| `OPENROUTER_API_KEY` | Turns on the AI assistant (`/assistant`). Server-side only, never exposed to the browser. Get one at https://openrouter.ai/keys |
| `OPENROUTER_MODEL` | Optional model override (defaults to `openai/gpt-4o-mini`). |
| `SEQUENTIAL_LOCKING` | The day/module/video lock (see below). Default off. |
| `ADMIN_TOKEN` | Gates the read-only content-coverage page at `/admin/coverage`. |

The commented Supabase block in `.env.example` is for a future move off local
SQLite — not needed today. If/when Supabase is added, the **service-role key must
never be committed and never read by browser-side code**.

## How the content is structured

Content is seeded as data in [`src/lib/content.ts`](src/lib/content.ts) — there
is no CMS yet. The shape is **Day → Module → Item**, where an item is a `video`,
a `document`, or an `assessment`. Video numbers are day-based and run straight
through the modules (1.1, 1.2, … then 2.1, 2.2). Modules are display grouping
only; the unlock sequence runs through a day's videos/assessments in order.
Learner progress (watched time, assessment submissions) lives in SQLite; locked
and unlocked state is always **derived** from that, never stored.

Days and slots that have no real content yet are shown as genuinely empty — a
read-only `/admin/coverage` page lists exactly what exists and what's missing.

## Sequential locking is currently OFF

The sequential lock (must finish each video + its assessment before the next
unlocks) is **switched off** behind a setting, so every day, module and video is
open — while watched time and assessment attempts are still recorded. To turn
the original locking back on, set:

```bash
SEQUENTIAL_LOCKING=on
```

Nothing else changes; the rules and completion logic are all still in place,
just bypassed while the flag is off.

## Media

Large binaries (PDFs, videos) are **not** committed — the `/media` folder is
git-ignored. Those belong in object storage (e.g. Supabase). The document route
serves them from that folder at runtime.

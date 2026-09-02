import "server-only";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

/*
  Local-first SQLite. One file at ./data/portal.db. Tables are created on first
  import (idempotent), so `npm run dev` just works with no migration step.

  Swapping to Supabase/Postgres later means changing only this file + the
  drizzle dialect — the schema and all query code stay the same.
*/

const DB_PATH = path.join(process.cwd(), "data", "portal.db");
mkdirSync(path.dirname(DB_PATH), { recursive: true });

// Reuse a single connection across hot reloads in dev.
const globalForDb = globalThis as unknown as { __sqlite?: Database.Database };

const sqlite =
  globalForDb.__sqlite ??
  (() => {
    const conn = new Database(DB_PATH);
    conn.pragma("journal_mode = WAL");
    // Old video-centric tables are superseded by the item model. Drop them so
    // local dev data doesn't linger under the old shape (local SQLite only).
    conn.exec(`
      DROP TABLE IF EXISTS video_progress;
      DROP TABLE IF EXISTS attempts;
      CREATE TABLE IF NOT EXISTS learners (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS item_progress (
        learner_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        watched_seconds REAL NOT NULL DEFAULT 0,
        watched INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (learner_id, item_id)
      );
      CREATE TABLE IF NOT EXISTS submissions (
        learner_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        answers TEXT NOT NULL,
        submitted_at INTEGER NOT NULL,
        awaiting_review INTEGER NOT NULL DEFAULT 1,
        score REAL,
        PRIMARY KEY (learner_id, item_id)
      );
    `);
    return conn;
  })();

if (process.env.NODE_ENV !== "production") globalForDb.__sqlite = sqlite;

export const db = drizzle(sqlite, { schema });
export { schema };

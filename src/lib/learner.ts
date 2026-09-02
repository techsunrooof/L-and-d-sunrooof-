import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { LEARNER_COOKIE } from "@/lib/constants";

/*
  Anonymous learner identity. There is no login yet (build spec §0.7), so each
  browser is a learner, keyed by an httpOnly cookie that middleware guarantees.
  When real auth arrives, only this file changes — swap the cookie id for the
  authenticated user id.
*/

export { LEARNER_COOKIE };

/** Make sure a learner row exists for this id (idempotent). */
export function ensureLearnerRow(id: string): void {
  const row = db.select().from(schema.learners).where(eq(schema.learners.id, id)).get();
  if (!row) {
    db.insert(schema.learners).values({ id, createdAt: Date.now() }).run();
  }
}

/** Learner id from the cookie (middleware ensures it exists), and its row. */
export async function getLearnerId(): Promise<string> {
  const jar = await cookies();
  const id = jar.get(LEARNER_COOKIE)?.value;
  if (id) {
    ensureLearnerRow(id);
    return id;
  }
  // Fallback (e.g. middleware skipped): mint one. Route handlers/actions may
  // also set it on their response; pages rely on middleware.
  const fresh = crypto.randomUUID();
  ensureLearnerRow(fresh);
  return fresh;
}

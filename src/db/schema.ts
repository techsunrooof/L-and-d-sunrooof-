import { sqliteTable, text, integer, real, primaryKey } from "drizzle-orm/sqlite-core";

/*
  Progress data only. Content (days/modules/items/assessments) lives in code.
  Locked/unlocked is always DERIVED from these rows, never stored.
*/

/** An anonymous learner, identified by a cookie until real auth exists. */
export const learners = sqliteTable("learners", {
  id: text("id").primaryKey(),
  createdAt: integer("created_at").notNull(),
});

/** Per learner, per VIDEO item: real watched time and whether it counts as watched. */
export const itemProgress = sqliteTable(
  "item_progress",
  {
    learnerId: text("learner_id").notNull(),
    itemId: text("item_id").notNull(),
    watchedSeconds: real("watched_seconds").notNull().default(0),
    watched: integer("watched").notNull().default(0),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.learnerId, t.itemId] })],
);

/**
 * Per learner, per ASSESSMENT item: the submitted answers. Written/scenario
 * assessments are reviewed by a person, so a submission counts as "done" and is
 * left awaiting review rather than scored (§ Locking, § written answers).
 */
export const submissions = sqliteTable(
  "submissions",
  {
    learnerId: text("learner_id").notNull(),
    itemId: text("item_id").notNull(),
    /** JSON: { [questionId]: number (mcq) | string (written) | {partId: string} }. */
    answers: text("answers").notNull(),
    submittedAt: integer("submitted_at").notNull(),
    /** 1 while a human still has to mark it. */
    awaitingReview: integer("awaiting_review").notNull().default(1),
    /** Marks awarded on review — null until reviewed. */
    score: real("score"),
  },
  (t) => [primaryKey({ columns: [t.learnerId, t.itemId] })],
);

export type Learner = typeof learners.$inferSelect;
export type ItemProgressRow = typeof itemProgress.$inferSelect;
export type SubmissionRow = typeof submissions.$inferSelect;

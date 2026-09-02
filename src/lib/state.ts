import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getItem } from "./content";
import {
  computeState,
  findItemView,
  isAccessible,
  type PortalState,
  type ProgressMap,
} from "./locking";
import { toClientAssessment, type ClientItemDetail, type ClientSubmission } from "./view";

/** A video counts as watched once real watched-time crosses this fraction (§6.5). */
export const WATCH_THRESHOLD = 0.9;

export function getProgressMap(learnerId: string): ProgressMap {
  const progressRows = db
    .select()
    .from(schema.itemProgress)
    .where(eq(schema.itemProgress.learnerId, learnerId))
    .all();

  const submissionRows = db
    .select()
    .from(schema.submissions)
    .where(eq(schema.submissions.learnerId, learnerId))
    .all();

  const submitted = new Set(submissionRows.map((s) => s.itemId));

  const map: ProgressMap = {};
  for (const p of progressRows) {
    map[p.itemId] = {
      watched: p.watched === 1,
      submitted: submitted.has(p.itemId),
      started: p.watchedSeconds > 0 || submitted.has(p.itemId),
    };
  }
  for (const id of submitted) {
    if (!map[id]) map[id] = { watched: false, submitted: true, started: true };
  }
  return map;
}

export function getState(learnerId: string): PortalState {
  return computeState(getProgressMap(learnerId));
}

function getSubmission(learnerId: string, itemId: string): ClientSubmission | null {
  const row = db
    .select()
    .from(schema.submissions)
    .where(and(eq(schema.submissions.learnerId, learnerId), eq(schema.submissions.itemId, itemId)))
    .get();
  if (!row) return null;
  return {
    answers: JSON.parse(row.answers),
    submittedAt: row.submittedAt,
    awaitingReview: row.awaitingReview === 1,
  };
}

function getItemProgress(learnerId: string, itemId: string) {
  return db
    .select()
    .from(schema.itemProgress)
    .where(and(eq(schema.itemProgress.learnerId, learnerId), eq(schema.itemProgress.itemId, itemId)))
    .get();
}

/** Answer-free detail for one item — only returned if the learner has it unlocked. */
export function buildItemDetail(learnerId: string, itemId: string): ClientItemDetail | null {
  const item = getItem(itemId);
  if (!item) return null;

  const view = findItemView(computeState(getProgressMap(learnerId)), itemId);
  if (!view || !view.unlocked) return null;

  if (item.kind === "video") {
    const row = getItemProgress(learnerId, itemId);
    return {
      kind: "video",
      id: item.id,
      number: item.number,
      title: item.title,
      status: view.status,
      durationSeconds: item.durationSeconds,
      src: item.src,
      youtubeId: item.youtubeId,
      thumbnail: item.thumbnail,
      watchedSeconds: row?.watchedSeconds ?? 0,
      watched: row?.watched === 1,
    };
  }

  if (item.kind === "document") {
    return {
      kind: "document",
      id: item.id,
      number: item.number,
      title: item.title,
      status: view.status,
      file: item.file,
      sizeLabel: item.sizeLabel,
      sections: item.sections,
    };
  }

  // assessment
  return {
    kind: "assessment",
    id: item.id,
    number: item.number,
    title: item.title,
    status: view.status,
    assessment: toClientAssessment(item.assessment),
    submission: getSubmission(learnerId, itemId),
  };
}

type WatchResult =
  | { ok: true; watched: boolean; watchedSeconds: number }
  | { ok: false; reason: "locked" | "not-video" | "unknown" };

export function recordWatch(learnerId: string, itemId: string, watchedSeconds: number): WatchResult {
  const item = getItem(itemId);
  if (!item) return { ok: false, reason: "unknown" };
  if (item.kind !== "video") return { ok: false, reason: "not-video" };

  const state = computeState(getProgressMap(learnerId));
  if (!isAccessible(state, itemId)) return { ok: false, reason: "locked" };

  const existing = getItemProgress(learnerId, itemId);
  const nextSeconds = Math.max(existing?.watchedSeconds ?? 0, Math.max(0, watchedSeconds));
  const watched =
    existing?.watched === 1 || nextSeconds >= WATCH_THRESHOLD * item.durationSeconds;

  db
    .insert(schema.itemProgress)
    .values({ learnerId, itemId, watchedSeconds: nextSeconds, watched: watched ? 1 : 0, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: [schema.itemProgress.learnerId, schema.itemProgress.itemId],
      set: { watchedSeconds: nextSeconds, watched: watched ? 1 : 0, updatedAt: Date.now() },
    })
    .run();

  return { ok: true, watched, watchedSeconds: nextSeconds };
}

/**
 * Mark a YouTube video watched. YouTube hosts the stream, so watch completion
 * is reported by the embedded player (the "serve locked bytes" guard can't
 * apply to a third-party CDN). Still gated: only an unlocked item is accepted.
 */
export function markVideoWatched(
  learnerId: string,
  itemId: string,
): { ok: true } | { ok: false; reason: "locked" | "not-video" | "unknown" } {
  const item = getItem(itemId);
  if (!item) return { ok: false, reason: "unknown" };
  if (item.kind !== "video") return { ok: false, reason: "not-video" };

  const state = computeState(getProgressMap(learnerId));
  if (!isAccessible(state, itemId)) return { ok: false, reason: "locked" };

  const seconds = item.durationSeconds || 1;
  db
    .insert(schema.itemProgress)
    .values({ learnerId, itemId, watchedSeconds: seconds, watched: 1, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: [schema.itemProgress.learnerId, schema.itemProgress.itemId],
      set: { watched: 1, updatedAt: Date.now() },
    })
    .run();
  return { ok: true };
}

export type SubmitResult =
  | { ok: true; submission: ClientSubmission }
  | { ok: false; reason: "locked" | "not-assessment" | "unknown" | "empty" };

/**
 * Store an assessment submission. Written/scenario assessments are reviewed by a
 * person: we save exactly what the learner typed, mark it awaiting review, and do
 * NOT score it. Submitting counts as done (§ Locking).
 */
export function submitAssessment(
  learnerId: string,
  itemId: string,
  answers: Record<string, unknown>,
): SubmitResult {
  const item = getItem(itemId);
  if (!item) return { ok: false, reason: "unknown" };
  if (item.kind !== "assessment") return { ok: false, reason: "not-assessment" };

  const state = computeState(getProgressMap(learnerId));
  if (!isAccessible(state, itemId)) return { ok: false, reason: "locked" };
  if (!answers || Object.keys(answers).length === 0) return { ok: false, reason: "empty" };

  const submittedAt = Date.now();
  db
    .insert(schema.submissions)
    .values({ learnerId, itemId, answers: JSON.stringify(answers), submittedAt, awaitingReview: 1, score: null })
    .onConflictDoUpdate({
      target: [schema.submissions.learnerId, schema.submissions.itemId],
      set: { answers: JSON.stringify(answers), submittedAt, awaitingReview: 1, score: null },
    })
    .run();

  return {
    ok: true,
    submission: { answers: answers as ClientSubmission["answers"], submittedAt, awaitingReview: true },
  };
}

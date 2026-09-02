"use server";

import { z } from "zod";
import { getLearnerId } from "@/lib/learner";
import {
  recordWatch,
  markVideoWatched,
  submitAssessment,
  buildItemDetail,
  getState,
} from "@/lib/state";
import { getItem, moduleForItem } from "@/lib/content";
import { buildDaySnapshot, type DaySnapshot, type ClientItemDetail } from "@/lib/view";

function dayOfItem(itemId: string): number | null {
  return moduleForItem(itemId)?.day ?? null;
}

const watchSchema = z.object({
  itemId: z.string().min(1),
  watchedSeconds: z.number().min(0).max(60 * 60 * 12),
});

export type WatchActionResult = {
  ok: boolean;
  watched: boolean;
  reason?: string;
  snapshot: DaySnapshot | null;
};

export async function recordWatchAction(input: unknown): Promise<WatchActionResult> {
  const parsed = watchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, watched: false, reason: "bad-input", snapshot: null };

  const learnerId = await getLearnerId();
  const res = recordWatch(learnerId, parsed.data.itemId, parsed.data.watchedSeconds);
  const day = dayOfItem(parsed.data.itemId);
  const snapshot = day ? buildDaySnapshot(getState(learnerId), day) : null;

  if (!res.ok) return { ok: false, watched: false, reason: res.reason, snapshot };
  return { ok: true, watched: res.watched, snapshot };
}

// answers: questionId -> mcq index (number) | written text (string) | scenario parts ({partId: text})
const answerValue = z.union([
  z.number().int().min(0),
  z.string().max(20000),
  z.record(z.string(), z.string().max(20000)),
]);
const submitSchema = z.object({
  itemId: z.string().min(1),
  answers: z.record(z.string(), answerValue),
});

export type SubmitActionResult = {
  ok: boolean;
  reason?: string;
  snapshot: DaySnapshot | null;
  submittedAt?: number;
};

export async function submitAssessmentAction(input: unknown): Promise<SubmitActionResult> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "bad-input", snapshot: null };

  const learnerId = await getLearnerId();
  const res = submitAssessment(learnerId, parsed.data.itemId, parsed.data.answers);
  const day = dayOfItem(parsed.data.itemId);
  const snapshot = day ? buildDaySnapshot(getState(learnerId), day) : null;

  if (!res.ok) return { ok: false, reason: res.reason, snapshot };
  return { ok: true, snapshot, submittedAt: res.submission.submittedAt };
}

export async function markVideoWatchedAction(input: unknown): Promise<WatchActionResult> {
  const parsed = z.object({ itemId: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return { ok: false, watched: false, reason: "bad-input", snapshot: null };

  const learnerId = await getLearnerId();
  const res = markVideoWatched(learnerId, parsed.data.itemId);
  const day = dayOfItem(parsed.data.itemId);
  const snapshot = day ? buildDaySnapshot(getState(learnerId), day) : null;

  if (!res.ok) return { ok: false, watched: false, reason: res.reason, snapshot };
  return { ok: true, watched: true, snapshot };
}

export async function getItemDetailAction(itemId: string): Promise<ClientItemDetail | null> {
  if (typeof itemId !== "string" || !itemId) return null;
  const learnerId = await getLearnerId();
  return buildItemDetail(learnerId, itemId);
}

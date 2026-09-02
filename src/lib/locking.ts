import {
  DAYS,
  modulesForDay,
  isGatingItem,
  type ModuleItem,
  type Module,
} from "./content";
import { sequentialLockingOn } from "./config";

/*
  The locking engine (PURE — no DB, no I/O). Item-based.

  Rules:
    • A module's items run in day order; gating items are videos and assessments.
      Documents are always available and never gate progression (§5.7).
    • A gating item unlocks when the previous gating item in the day is "done".
    • A video is "done" when watched-to-end. An assessment is "done" when
      SUBMITTED (written answers are reviewed by a person, so submitted = done).
    • Day N unlocks when every gating item in day N-1 is done.
    • Finished stays finished; failing/redoing never re-locks anything.
*/

export type ItemFacts = {
  watched: boolean;   // videos
  submitted: boolean; // assessments
  started: boolean;   // any watched time or a submission
};

export type ProgressMap = Record<string, ItemFacts>;

export type ItemStatus =
  | "locked"
  | "available"
  | "in-progress"
  | "complete"        // video watched
  | "awaiting-review"; // assessment submitted, being reviewed

export type DayStatus = "locked" | "not-started" | "in-progress" | "complete";

export type ItemView = {
  item: ModuleItem;
  moduleId: string;
  status: ItemStatus;
  unlocked: boolean;
  done: boolean;
};

export type DayView = {
  number: number;
  status: DayStatus;
  unlocked: boolean;
  modules: { module: Module; items: ItemView[] }[];
  items: ItemView[];          // flattened, running order
  gatingTotal: number;
  gatingDone: number;
};

export type PortalState = {
  days: DayView[];
  currentDay: number;
  allComplete: boolean;
};

const facts = (map: ProgressMap, id: string): ItemFacts =>
  map[id] ?? { watched: false, submitted: false, started: false };

function itemDone(item: ModuleItem, f: ItemFacts): boolean {
  if (item.kind === "video") return f.watched;
  if (item.kind === "assessment") return f.submitted;
  return false; // documents don't gate
}

export function computeState(progress: ProgressMap): PortalState {
  // When sequential locking is OFF, everything is unlocked — but we still
  // compute `done`/completion below exactly as before (progress is preserved,
  // and flipping the flag back on restores the original behaviour untouched).
  const lockingOn = sequentialLockingOn();
  const days = [...DAYS].sort((a, b) => a.number - b.number);
  const dayViews: DayView[] = [];
  let prevDayGatingDone = true;

  for (const day of days) {
    const dayUnlocked = lockingOn ? prevDayGatingDone : true;
    const mods = modulesForDay(day.number);

    const moduleViews: { module: Module; items: ItemView[] }[] = [];
    const flat: ItemView[] = [];
    let prevGatingDone = true; // first gating item unlocks with the day
    let gatingTotal = 0;
    let gatingDone = 0;
    let anyStarted = false;

    for (const module of mods) {
      const itemViews: ItemView[] = [];
      for (const item of module.items) {
        const f = facts(progress, item.id);
        const gating = isGatingItem(item);

        let unlocked: boolean;
        let done = false;
        let status: ItemStatus;

        if (!gating) {
          // document: available whenever the day is open, never locked otherwise
          unlocked = dayUnlocked;
          status = dayUnlocked ? "available" : "locked";
        } else {
          // Gating rule still computed; only whether it GATES depends on the flag.
          unlocked = dayUnlocked && (lockingOn ? prevGatingDone : true);
          done = itemDone(item, f);
          if (!unlocked) {
            status = "locked";
          } else if (item.kind === "video") {
            status = done ? "complete" : f.started ? "in-progress" : "available";
          } else {
            // assessment
            status = done ? "awaiting-review" : "available";
          }
          gatingTotal += 1;
          if (done) gatingDone += 1;
          prevGatingDone = done;
        }

        if (f.started || done) anyStarted = true;

        const view: ItemView = { item, moduleId: module.id, status, unlocked, done };
        itemViews.push(view);
        flat.push(view);
      }
      moduleViews.push({ module, items: itemViews });
    }

    let status: DayStatus;
    if (!dayUnlocked) status = "locked";
    else if (gatingTotal === 0 || gatingDone === gatingTotal) status = "complete";
    else if (anyStarted) status = "in-progress";
    else status = "not-started";

    dayViews.push({
      number: day.number,
      status,
      unlocked: dayUnlocked,
      modules: moduleViews,
      items: flat,
      gatingTotal,
      gatingDone,
    });

    prevDayGatingDone = gatingTotal === 0 || gatingDone === gatingTotal;
  }

  const firstIncomplete = dayViews.find((d) => d.status !== "complete");
  const currentDay = firstIncomplete
    ? firstIncomplete.number
    : dayViews[dayViews.length - 1]?.number ?? 1;

  return {
    days: dayViews,
    currentDay,
    allComplete: dayViews.every((d) => d.status === "complete"),
  };
}

/* ---- selectors ---- */

export function getDayView(state: PortalState, dayNumber: number): DayView | undefined {
  return state.days.find((d) => d.number === dayNumber);
}

export function findItemView(state: PortalState, itemId: string): ItemView | undefined {
  for (const d of state.days) {
    const v = d.items.find((iv) => iv.item.id === itemId);
    if (v) return v;
  }
  return undefined;
}

export function isAccessible(state: PortalState, itemId: string): boolean {
  // When locking is off, everything is accessible (routes/actions open, but
  // still record progress). Explicit here so any direct caller honours the flag.
  if (!sequentialLockingOn()) return findItemView(state, itemId) ? true : false;
  return findItemView(state, itemId)?.unlocked ?? false;
}

/** The item a day should open on: first unlocked not-done item, else last unlocked. */
export function currentItemOfDay(state: PortalState, dayNumber: number): string | undefined {
  const day = getDayView(state, dayNumber);
  if (!day) return undefined;
  const target =
    day.items.find((v) => v.unlocked && !v.done) ??
    [...day.items].reverse().find((v) => v.unlocked);
  return target?.item.id ?? day.items[0]?.item.id;
}

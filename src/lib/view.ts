import {
  currentItemOfDay,
  getDayView,
  type PortalState,
  type ItemStatus,
  type DayStatus,
} from "./locking";
import {
  getDay,
  modulesForDay,
  dayImage,
  videoThumbnail,
  activitiesForDay,
  DEPARTMENTS,
  type Assessment,
  type ModuleItem,
  type ItemKind,
} from "./content";

/*
  Serializable view models shared by server pages and server-action responses.
  Built SERVER-SIDE only (they read content.ts). Client components import the
  *types* only. Assessment answer keys are stripped here before any send.
*/

/* ---- snapshots (playlist / accordion) ---- */

export type ItemSnapshot = {
  id: string;
  number: string;
  title: string;
  kind: ItemKind;
  status: ItemStatus;
  unlocked: boolean;
  thumbnail: string | null;
};

export type ModuleSnapshot = { id: string; title: string; items: ItemSnapshot[] };

export type DaySnapshot = {
  day: number;
  status: DayStatus;
  gatingTotal: number;
  gatingDone: number;
  currentItemId: string | undefined;
  modules: ModuleSnapshot[];
};

function thumbOf(item: ModuleItem): string | null {
  return item.kind === "video" ? videoThumbnail(item) : null;
}

export function buildDaySnapshot(state: PortalState, dayNumber: number): DaySnapshot | null {
  const day = getDayView(state, dayNumber);
  if (!day) return null;
  return {
    day: dayNumber,
    status: day.status,
    gatingTotal: day.gatingTotal,
    gatingDone: day.gatingDone,
    currentItemId: currentItemOfDay(state, dayNumber),
    modules: day.modules.map((m) => ({
      id: m.module.id,
      title: m.module.title,
      items: m.items.map((iv) => ({
        id: iv.item.id,
        number: iv.item.number,
        title: iv.item.title,
        kind: iv.item.kind,
        status: iv.status,
        unlocked: iv.unlocked,
        thumbnail: thumbOf(iv.item),
      })),
    })),
  };
}

/* ---- home accordion VM (Day → Module → Item) ---- */

export type HomeItemVM = {
  id: string;
  number: string;
  title: string;
  kind: ItemKind;
  status: ItemStatus;
  unlocked: boolean;
  durationSeconds: number | null;
  thumbnail: string | null;
};

export type HomeModuleVM = { id: string; order: number; title: string; items: HomeItemVM[] };

export type HomeActivityVM = { id: string; title: string; note?: string };

export type HomeDayVM = {
  number: number;
  title: string;
  subtitle: string;
  image: string | null;
  /** null = common induction; otherwise the department/track name (§2). */
  department: string | null;
  status: DayStatus;
  unlocked: boolean;
  gatingDone: number;
  gatingTotal: number;
  modules: HomeModuleVM[];
  /** In-person activities shown as distinct rows (§5). */
  activities: HomeActivityVM[];
};

/** Home is two parts (§2): the common induction (Days 1–3) and the department
 *  tracks (only Sales so far). Each part keeps its OWN progress (§5). */
export type HomeDepartmentVM = { name: string; days: HomeDayVM[]; currentDay: number };
export type HomeSectionsVM = {
  induction: HomeDayVM[];
  inductionCurrentDay: number;
  departments: HomeDepartmentVM[];
};

/** Current day of a group: first not-complete, else the last. */
function currentOf(days: HomeDayVM[]): number {
  const firstIncomplete = days.find((d) => d.status !== "complete");
  return firstIncomplete ? firstIncomplete.number : days[days.length - 1]?.number ?? 1;
}

export function buildHomeSections(state: PortalState): HomeSectionsVM {
  const all = buildHomeDays(state);
  const induction = all.filter((d) => d.department == null);
  // Only departments that actually have days appear (others hidden, §8.1). Order
  // by the DEPARTMENTS list, so adding days for a new department just works.
  const departments: HomeDepartmentVM[] = DEPARTMENTS.filter((name) =>
    all.some((d) => d.department === name),
  ).map((name) => {
    const days = all.filter((d) => d.department === name);
    return { name, days, currentDay: currentOf(days) };
  });
  return { induction, inductionCurrentDay: currentOf(induction), departments };
}

export function buildHomeDays(state: PortalState): HomeDayVM[] {
  return state.days.map((d) => {
    const meta = getDay(d.number);
    const mods = modulesForDay(d.number);
    return {
      number: d.number,
      title: meta?.title ?? `Day ${d.number}`,
      subtitle: meta?.subtitle ?? "",
      image: dayImage(d.number),
      department: meta?.department ?? null,
      status: d.status,
      unlocked: d.unlocked,
      gatingDone: d.gatingDone,
      gatingTotal: d.gatingTotal,
      activities: activitiesForDay(d.number).map((a) => ({ id: a.id, title: a.title, note: a.note })),
      modules: mods.map((m) => ({
        id: m.id,
        order: m.order,
        title: m.title,
        items: d.modules
          .find((mv) => mv.module.id === m.id)!
          .items.map((iv) => ({
            id: iv.item.id,
            number: iv.item.number,
            title: iv.item.title,
            kind: iv.item.kind,
            status: iv.status,
            unlocked: iv.unlocked,
            durationSeconds: iv.item.kind === "video" ? iv.item.durationSeconds : null,
            thumbnail: iv.item.kind === "video" ? videoThumbnail(iv.item) : null,
          })),
      })),
    };
  });
}

/* ---- answer-free assessment (correct keys removed) ---- */

export type ClientMcq = {
  kind: "mcq";
  id: string;
  label: string;
  prompt: string;
  options: string[];
  marks: number;
};
export type ClientWritten = {
  kind: "written";
  id: string;
  label: string;
  prompt: string;
  marks: number;
  guidance?: string;
};
export type ClientScenario = {
  kind: "scenario";
  id: string;
  label: string;
  title: string;
  marks: number;
  situation: string;
  parts: { id: string; prompt: string; boxLabel: string }[];
};
export type ClientQuestion = ClientMcq | ClientWritten | ClientScenario;

export type ClientAssessment = {
  id: string;
  title: string;
  subtitle?: string;
  totalMarks: number;
  passMark: number | null;
  needsReview: boolean;
  instructions?: string[];
  sections: {
    title: string;
    instructions?: string;
    groups: { heading?: string; questions: ClientQuestion[] }[];
  }[];
};

export function toClientAssessment(a: Assessment): ClientAssessment {
  return {
    id: a.id,
    title: a.title,
    subtitle: a.subtitle,
    totalMarks: a.totalMarks,
    passMark: a.passMark,
    needsReview: a.needsReview,
    instructions: a.instructions,
    sections: a.sections.map((s) => ({
      title: s.title,
      instructions: s.instructions,
      groups: s.groups.map((g) => ({
        heading: g.heading,
        questions: g.questions.map((q): ClientQuestion => {
          if (q.kind === "mcq") {
            // strip correctIndex
            return { kind: "mcq", id: q.id, label: q.label, prompt: q.prompt, options: q.options, marks: q.marks };
          }
          return q; // written / scenario carry no answer key
        }),
      })),
    })),
  };
}

/* ---- per-item detail sent to the client ---- */

export type ClientSubmission = {
  answers: Record<string, number | string | Record<string, string>>;
  submittedAt: number;
  awaitingReview: boolean;
};

export type ClientItemDetail =
  | {
      kind: "video";
      id: string;
      number: string;
      title: string;
      status: ItemStatus;
      durationSeconds: number;
      src: string | null;
      youtubeId: string | null;
      thumbnail: string | null;
      watchedSeconds: number;
      watched: boolean;
    }
  | {
      kind: "document";
      id: string;
      number: string;
      title: string;
      status: ItemStatus;
      file: string | null;
      sizeLabel: string | null;
      sections: { heading: string; body: string }[] | null;
    }
  | {
      kind: "assessment";
      id: string;
      number: string;
      title: string;
      status: ItemStatus;
      assessment: ClientAssessment;
      submission: ClientSubmission | null;
    };

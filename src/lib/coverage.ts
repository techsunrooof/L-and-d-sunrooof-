import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { DAYS, modulesForDay, getDay, type Assessment } from "./content";

/*
  Read-only content coverage report. Walks days → modules → items and checks the
  ACTUAL storage object for each file (existsSync), not just whether a path
  column is filled in (§5.7) — an orphan path shows as missing.

  Storage in this portal is the private local media folder (served through the
  guarded routes), plus public thumbnails:
    • video mp4   → media/videos/<id>.mp4
    • document    → media/documents/<id>.pdf
    • thumbnail   → public/<thumbnail path>
  YouTube videos have no local object; they are hosted externally.
*/

function abs(rel: string): boolean {
  const clean = rel.startsWith("/") ? rel.slice(1) : rel;
  return existsSync(path.join(process.cwd(), clean));
}

export type VideoCoverage = {
  kind: "video";
  id: string;
  number: string;
  title: string;
  /** youtube | mp4 | none */
  source: "youtube" | "mp4" | "none";
  /** true/false for a local mp4; null when hosted externally (YouTube). */
  fileResolves: boolean | null;
  hasThumbnail: boolean;
  durationRecorded: boolean;
  /** Has a genuinely playable source. */
  playable: boolean;
  issues: string[];
};

export type DocumentCoverage = {
  kind: "document";
  id: string;
  number: string;
  title: string;
  fileResolves: boolean | null; // null when it's an article (text sections)
  isArticle: boolean;
  present: boolean;
  issues: string[];
};

export type AssessmentCoverage = {
  kind: "assessment";
  id: string;
  number: string;
  title: string;
  questionCount: number;
  mcqCount: number;
  writtenCount: number;
  scenarioCount: number;
  answerKeysMissing: number;
  passMarkSet: boolean;
  ready: boolean; // has questions + all keys + pass mark
  issues: string[];
};

export type ItemCoverage = VideoCoverage | DocumentCoverage | AssessmentCoverage;

export type ModuleCoverage = {
  id: string;
  title: string;
  items: ItemCoverage[];
  videoTotal: number;
  videoWithFiles: number;
};

export type DayCoverage = {
  number: number;
  title: string;
  empty: boolean;
  modules: ModuleCoverage[];
  documentsTotal: number;
  documentsPresent: number;
};

export type CoverageSummary = {
  totalVideos: number;
  videosWithFiles: number;
  totalDocuments: number;
  documentsPresent: number;
  totalAssessments: number;
  assessmentsReady: number;
  totalItems: number;
  incompleteItems: number;
};

export type CoverageReport = { days: DayCoverage[]; summary: CoverageSummary };

function assessmentStats(a: Assessment) {
  let mcq = 0;
  let written = 0;
  let scenario = 0;
  let keysMissing = 0;
  for (const s of a.sections) {
    for (const g of s.groups) {
      for (const q of g.questions) {
        if (q.kind === "mcq") {
          mcq += 1;
          if (q.correctIndex == null) keysMissing += 1;
        } else if (q.kind === "written") written += 1;
        else scenario += 1;
      }
    }
  }
  return { mcq, written, scenario, total: mcq + written + scenario, keysMissing, passMarkSet: a.passMark != null };
}

/** Whether an item is "incomplete" for the filter. */
export function isIncomplete(item: ItemCoverage): boolean {
  if (item.kind === "video") return !item.playable || !item.hasThumbnail || !item.durationRecorded;
  if (item.kind === "document") return !item.present;
  return !item.ready;
}

export function buildCoverage(): CoverageReport {
  const days: DayCoverage[] = [];
  const summary: CoverageSummary = {
    totalVideos: 0,
    videosWithFiles: 0,
    totalDocuments: 0,
    documentsPresent: 0,
    totalAssessments: 0,
    assessmentsReady: 0,
    totalItems: 0,
    incompleteItems: 0,
  };

  for (const d of DAYS) {
    const mods = modulesForDay(d.number);
    const modules: ModuleCoverage[] = [];
    let documentsTotal = 0;
    let documentsPresent = 0;

    for (const m of mods) {
      const items: ItemCoverage[] = [];
      let videoTotal = 0;
      let videoWithFiles = 0;

      for (const item of m.items) {
        summary.totalItems += 1;

        if (item.kind === "video") {
          videoTotal += 1;
          summary.totalVideos += 1;
          const source: VideoCoverage["source"] = item.youtubeId ? "youtube" : item.src ? "mp4" : "none";
          const fileResolves =
            source === "mp4" ? abs(`media/videos/${item.id}.mp4`) : source === "none" ? false : null;
          const hasThumbnail = !!item.thumbnail && abs(item.thumbnail);
          const durationRecorded = item.durationSeconds > 0;
          const playable = source === "youtube" || fileResolves === true;
          if (playable) videoWithFiles += 1;
          if (playable) summary.videosWithFiles += 1;
          const issues: string[] = [];
          if (!playable) issues.push("no working video source");
          if (!hasThumbnail) issues.push("no thumbnail");
          if (!durationRecorded) issues.push("no duration");
          const cov: VideoCoverage = {
            kind: "video", id: item.id, number: item.number, title: item.title,
            source, fileResolves, hasThumbnail, durationRecorded, playable, issues,
          };
          items.push(cov);
          if (isIncomplete(cov)) summary.incompleteItems += 1;
        } else if (item.kind === "document") {
          documentsTotal += 1;
          summary.totalDocuments += 1;
          const isArticle = !!item.sections && item.sections.length > 0;
          const fileResolves = item.file ? abs(`media/documents/${item.id}.pdf`) : isArticle ? null : false;
          const present = isArticle || fileResolves === true;
          if (present) {
            documentsPresent += 1;
            summary.documentsPresent += 1;
          }
          const issues: string[] = [];
          if (!present) issues.push(item.file ? "file path set but object missing" : "no document file");
          const cov: DocumentCoverage = {
            kind: "document", id: item.id, number: item.number, title: item.title,
            fileResolves, isArticle, present, issues,
          };
          items.push(cov);
          if (isIncomplete(cov)) summary.incompleteItems += 1;
        } else {
          summary.totalAssessments += 1;
          const st = assessmentStats(item.assessment);
          const ready = st.total > 0 && st.keysMissing === 0 && st.passMarkSet;
          if (ready) summary.assessmentsReady += 1;
          const issues: string[] = [];
          if (st.total === 0) issues.push("no questions");
          if (st.keysMissing > 0) issues.push(`${st.keysMissing} answer key${st.keysMissing === 1 ? "" : "s"} missing`);
          if (!st.passMarkSet) issues.push("pass mark not set");
          const cov: AssessmentCoverage = {
            kind: "assessment", id: item.id, number: item.number, title: item.title,
            questionCount: st.total, mcqCount: st.mcq, writtenCount: st.written, scenarioCount: st.scenario,
            answerKeysMissing: st.keysMissing, passMarkSet: st.passMarkSet, ready, issues,
          };
          items.push(cov);
          if (isIncomplete(cov)) summary.incompleteItems += 1;
        }
      }

      modules.push({ id: m.id, title: m.title, items, videoTotal, videoWithFiles });
    }

    days.push({
      number: d.number,
      title: getDay(d.number)?.title ?? `Day ${d.number}`,
      empty: mods.length === 0,
      modules,
      documentsTotal,
      documentsPresent,
    });
  }

  return { days, summary };
}

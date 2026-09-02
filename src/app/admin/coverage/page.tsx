import { notFound } from "next/navigation";
import Link from "next/link";
import { buildCoverage, isIncomplete, type ItemCoverage } from "@/lib/coverage";
import { sequentialLockingOn } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Content coverage · admin" };

/*
  Admin-only, read-only coverage page. There is no auth system in this portal,
  so access is gated by an ADMIN_TOKEN env var: with it set, the page requires
  ?token=<value>; without it set, the page is open in local dev and blocked in
  production. (Documented as an assumption — no user roles exist yet.)
*/
function Yes() {
  return <span className="font-semibold text-[#2e7d46]">✓</span>;
}
function No() {
  return <span className="font-semibold text-[#b23b3b]">✗</span>;
}
function Dash() {
  return <span className="text-gray-400">—</span>;
}

function VideoCells({ i }: { i: Extract<ItemCoverage, { kind: "video" }> }) {
  return (
    <>
      <td className="px-2 py-1.5">
        {i.source === "youtube" ? (
          <span className="text-[#2e7d46]">YouTube (external)</span>
        ) : i.source === "mp4" ? (
          i.fileResolves ? <Yes /> : <No />
        ) : (
          <No />
        )}
      </td>
      <td className="px-2 py-1.5 text-center">{i.hasThumbnail ? <Yes /> : <No />}</td>
      <td className="px-2 py-1.5 text-center">{i.durationRecorded ? <Yes /> : <No />}</td>
      <td className="px-2 py-1.5 text-center"><Dash /></td>
      <td className="px-2 py-1.5 text-center"><Dash /></td>
      <td className="px-2 py-1.5 text-center"><Dash /></td>
    </>
  );
}
function DocCells({ i }: { i: Extract<ItemCoverage, { kind: "document" }> }) {
  return (
    <>
      <td className="px-2 py-1.5">{i.isArticle ? <span className="text-[#2e7d46]">article</span> : i.present ? <Yes /> : <No />}</td>
      <td className="px-2 py-1.5 text-center"><Dash /></td>
      <td className="px-2 py-1.5 text-center"><Dash /></td>
      <td className="px-2 py-1.5 text-center"><Dash /></td>
      <td className="px-2 py-1.5 text-center"><Dash /></td>
      <td className="px-2 py-1.5 text-center"><Dash /></td>
    </>
  );
}
function AssessmentCells({ i }: { i: Extract<ItemCoverage, { kind: "assessment" }> }) {
  return (
    <>
      <td className="px-2 py-1.5 text-center"><Dash /></td>
      <td className="px-2 py-1.5 text-center"><Dash /></td>
      <td className="px-2 py-1.5 text-center"><Dash /></td>
      <td className="px-2 py-1.5 text-center">
        {i.questionCount} <span className="text-gray-500">({i.mcqCount} mcq · {i.writtenCount} wr · {i.scenarioCount} sc)</span>
      </td>
      <td className="px-2 py-1.5 text-center">
        {i.answerKeysMissing === 0 ? <Yes /> : <span className="text-[#b23b3b]">{i.answerKeysMissing} missing</span>}
      </td>
      <td className="px-2 py-1.5 text-center">{i.passMarkSet ? <Yes /> : <No />}</td>
    </>
  );
}

export default async function CoveragePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; only?: string }>;
}) {
  const sp = await searchParams;
  const token = process.env.ADMIN_TOKEN;
  const isDev = process.env.NODE_ENV !== "production";
  if (token) {
    if (sp.token !== token) notFound();
  } else if (!isDev) {
    notFound();
  }

  const onlyIncomplete = sp.only === "incomplete";
  const report = buildCoverage();
  const s = report.summary;
  const tokenQs = token ? `token=${encodeURIComponent(token)}&` : "";

  return (
    <div className="mx-auto max-w-5xl px-6 py-8" style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      <h1 className="text-2xl font-semibold text-ink">Content coverage</h1>
      <p className="mt-1 text-sm text-grey">
        Read-only. Checks the actual stored object for every file, not just the path.{" "}
        Sequential locking is currently <b>{sequentialLockingOn() ? "ON" : "OFF"}</b>.
      </p>

      {/* Summary */}
      <div className="mt-4 rounded-lg border border-hairline bg-warm/30 p-4 text-sm text-ink">
        <b>{s.totalVideos}</b> videos — <b>{s.videosWithFiles}</b> with a working source
        {" · "}<b>{s.totalDocuments}</b> documents — <b>{s.documentsPresent}</b> present
        {" · "}<b>{s.totalAssessments}</b> assessments — <b>{s.assessmentsReady}</b> ready (questions + keys + pass mark)
        {" · "}<b>{s.incompleteItems}</b> of <b>{s.totalItems}</b> items incomplete
      </div>

      {/* Filter */}
      <div className="mt-3 flex gap-3 text-sm">
        <Link
          href={`?${tokenQs}`}
          className={`rounded-md border px-3 py-1.5 ${!onlyIncomplete ? "border-sun bg-warm/50 text-ink" : "border-hairline text-grey"}`}
        >
          All items
        </Link>
        <Link
          href={`?${tokenQs}only=incomplete`}
          className={`rounded-md border px-3 py-1.5 ${onlyIncomplete ? "border-sun bg-warm/50 text-ink" : "border-hairline text-grey"}`}
        >
          Incomplete only
        </Link>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[840px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-grey">
              <th className="px-2 py-2">№</th>
              <th className="px-2 py-2">Item</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">File / source</th>
              <th className="px-2 py-2 text-center">Thumb</th>
              <th className="px-2 py-2 text-center">Duration</th>
              <th className="px-2 py-2 text-center">Questions</th>
              <th className="px-2 py-2 text-center">Keys</th>
              <th className="px-2 py-2 text-center">Pass mark</th>
              <th className="px-2 py-2">Issues</th>
            </tr>
          </thead>
          <tbody>
            {report.days.map((day) => {
              const dayItems = day.modules.flatMap((m) => m.items);
              const dayHasIncomplete = dayItems.some(isIncomplete) || day.empty;
              if (onlyIncomplete && !dayHasIncomplete) return null;
              return (
                <DayRows key={day.number} day={day} onlyIncomplete={onlyIncomplete} />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DayRows({
  day,
  onlyIncomplete,
}: {
  day: ReturnType<typeof buildCoverage>["days"][number];
  onlyIncomplete: boolean;
}) {
  return (
    <>
      <tr className="border-t-2 border-hairline bg-warm/40">
        <td colSpan={10} className="px-2 py-2 font-semibold text-ink">
          Day {day.number} — {day.title}
          {day.empty && <span className="ml-2 font-normal text-[#b23b3b]">empty — no content yet</span>}
          {!day.empty && (
            <span className="ml-2 font-normal text-grey">
              · documents {day.documentsPresent}/{day.documentsTotal}
            </span>
          )}
        </td>
      </tr>
      {day.modules.map((m) => {
        const items = onlyIncomplete ? m.items.filter(isIncomplete) : m.items;
        if (onlyIncomplete && items.length === 0) return null;
        return (
          <ModuleRows key={m.id} moduleTitle={m.title} summary={`${m.videoWithFiles} of ${m.videoTotal} videos have files`} items={items} showVideoSummary={m.videoTotal > 0} />
        );
      })}
    </>
  );
}

function ModuleRows({
  moduleTitle,
  summary,
  items,
  showVideoSummary,
}: {
  moduleTitle: string;
  summary: string;
  items: ItemCoverage[];
  showVideoSummary: boolean;
}) {
  return (
    <>
      <tr className="bg-hairline/20">
        <td colSpan={10} className="px-2 py-1.5 text-[12px] font-medium text-grey">
          {moduleTitle}
          {showVideoSummary && <span className="ml-2 font-normal">· {summary}</span>}
        </td>
      </tr>
      {items.map((i) => (
        <tr key={i.id} className="border-b border-hairline/70 align-top">
          <td className="px-2 py-1.5 font-mono text-xs text-grey">{i.number}</td>
          <td className="px-2 py-1.5 text-ink">{i.title}</td>
          <td className="px-2 py-1.5 text-grey">{i.kind}</td>
          {i.kind === "video" ? (
            <VideoCells i={i} />
          ) : i.kind === "document" ? (
            <DocCells i={i} />
          ) : (
            <AssessmentCells i={i} />
          )}
          <td className="px-2 py-1.5 text-[12px] text-[#b23b3b]">{i.issues.join(", ")}</td>
        </tr>
      ))}
    </>
  );
}

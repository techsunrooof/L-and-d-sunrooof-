import { IconCheck, IconLock, IconClockHour4 } from "@tabler/icons-react";
import { cn } from "@/lib/cn";
import type { DayStatus, ItemStatus } from "@/lib/locking";
import type { ItemKind } from "@/lib/content";

/*
  Status is carried mostly by imagery/state; chips are the textual confirmation.
  Only "in progress" is solid gold; complete is a quiet green tick; locked is grey
  with a padlock. No red anywhere (§4.5).
*/

export function DayChip({ status }: { status: DayStatus }) {
  switch (status) {
    case "in-progress":
      return (
        <span className="inline-flex items-center rounded-full bg-sun px-2.5 py-1 text-xs font-medium text-ink">
          In progress
        </span>
      );
    case "complete":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-xs font-medium text-success">
          <IconCheck size={13} stroke={2.5} />
          Complete
        </span>
      );
    case "locked":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-xs font-medium text-grey">
          <IconLock size={12} stroke={2} />
          Locked
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full border border-hairline px-2.5 py-1 text-xs font-medium text-grey">
          Not started
        </span>
      );
  }
}

function labelFor(kind: ItemKind, status: ItemStatus): string {
  if (status === "locked") return "Locked";
  if (status === "awaiting-review") return "Submitted · awaiting review";
  if (status === "complete") return "Watched";
  if (status === "in-progress") return "In progress";
  // available
  if (kind === "document") return "Available";
  if (kind === "assessment") return "Not started";
  return "Not started"; // video
}

export function ItemStateLabel({
  kind,
  status,
  playing,
  className,
}: {
  kind: ItemKind;
  status: ItemStatus;
  playing?: boolean;
  className?: string;
}) {
  const label = playing ? "Open" : labelFor(kind, status);
  const tone =
    playing
      ? "text-sun"
      : status === "complete"
        ? "text-success"
        : status === "awaiting-review"
          ? "text-sun"
          : "text-grey";
  return (
    <span className={cn("flex items-center gap-1 text-xs", tone, className)}>
      {!playing && status === "locked" && <IconLock size={11} stroke={2} />}
      {!playing && status === "complete" && <IconCheck size={12} stroke={2.5} />}
      {!playing && status === "awaiting-review" && <IconClockHour4 size={12} stroke={2} />}
      {label}
    </span>
  );
}

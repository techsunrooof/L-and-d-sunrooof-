"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconChevronDown,
  IconLock,
  IconPlayerPlayFilled,
  IconFileText,
  IconClipboardText,
  IconUsers,
} from "@tabler/icons-react";
import { cn } from "@/lib/cn";
import { DayChip, ItemStateLabel } from "@/components/status-chip";
import type { HomeDayVM, HomeModuleVM, HomeItemVM, HomeSectionsVM } from "@/lib/view";
import type { ItemKind } from "@/lib/content";

const SS_KEY = "sunrooof-home-open"; // remembers open dept/day + scroll across a video visit (§3.11)

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function KindIcon({ kind, locked }: { kind: ItemKind; locked: boolean }) {
  const cls = locked ? "text-grey" : "text-sun";
  if (kind === "document") return <IconFileText size={16} className="text-grey" />;
  return <IconClipboardText size={16} className={cls} />; // assessment
}

/* The induction day cards (Day 1–3) are deep-brown boxes with cream text and a
   warm gold accent — set against the beige, moving skylight behind. */
const CARD_BROWN = "#38240f";
const CARD_CREAM = "#f2e7d3";
const CARD_GOLD = "#dcae6e";

/* ---- a day card (the toggle) ---- */
function DayCard({ day, open, onClick }: { day: HomeDayVM; open: boolean; onClick: () => void }) {
  const locked = !day.unlocked;
  const isTrack = day.department != null; // department days are plain, no cover image (§6.10)
  const brown = !isTrack && !locked; // induction day cards are deep-brown boxes
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={locked ? undefined : open}
      aria-disabled={locked ? "true" : undefined}
      className={cn(
        "card block overflow-hidden text-left transition",
        open ? "border-sun" : "border-hairline",
        locked ? "cursor-default" : brown ? "hover:brightness-110" : "hover:border-grey/40",
      )}
      style={brown ? { backgroundColor: CARD_BROWN, borderColor: open ? "#f0a500" : "#5a3d20" } : undefined}
    >
      {!isTrack && (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-[11px] bg-stage">
          {day.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={day.image}
              alt={day.imageAlt ?? `Day ${day.number}, ${day.title}`}
              className={cn("h-full w-full object-cover transition duration-500", locked && "media-locked")}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-grey">
              photograph coming soon
            </div>
          )}
        </div>
      )}
      {brown && <div className="h-1 w-full" style={{ backgroundColor: CARD_GOLD }} />}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div
              className={cn("font-[family-name:var(--font-mono)] text-xs", brown ? "font-semibold" : "text-grey")}
              style={brown ? { color: CARD_GOLD } : undefined}
            >
              Day {day.number}
            </div>
            <h3
              className={cn(
                "mt-1 font-[family-name:var(--font-sora)] text-lg font-semibold",
                locked ? "text-grey" : brown ? "" : "text-ink",
              )}
              style={brown ? { color: CARD_CREAM } : undefined}
            >
              {day.title}
            </h3>
          </div>
          <DayChip status={day.status} onDark={brown} />
        </div>
        <div className="mt-1.5 flex items-end justify-between gap-2">
          <p className={cn("text-sm", brown ? "" : "text-grey")} style={brown ? { color: "rgba(242,231,211,0.72)" } : undefined}>
            {day.subtitle}
          </p>
          {!locked && (
            <IconChevronDown
              size={18}
              className={cn("shrink-0 transition-transform duration-300", open ? "rotate-180 text-sun" : brown ? "" : "text-grey")}
              style={brown && !open ? { color: "#e6d8c0" } : undefined}
            />
          )}
        </div>
      </div>
    </button>
  );
}

/* ---- one video / document / assessment row (§3.8) ---- */
function ItemRow({ item, onPick }: { item: HomeItemVM; onPick: () => void }) {
  const locked = item.status === "locked";
  const isVideo = item.kind === "video";
  return (
    <button
      type="button"
      disabled={locked}
      onClick={() => !locked && onPick()}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition",
        locked ? "cursor-not-allowed" : "hover:bg-warm/40",
      )}
    >
      {isVideo ? (
        <div className={cn("relative h-10 w-[72px] shrink-0 overflow-hidden rounded bg-stage", locked && "media-locked")}>
          {item.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
          )}
          <span className="absolute inset-0 grid place-items-center">
            {locked ? (
              <IconLock size={14} className="text-grey" />
            ) : (
              <IconPlayerPlayFilled size={16} className="text-white/90 drop-shadow" />
            )}
          </span>
        </div>
      ) : (
        <div className="grid h-10 w-[72px] shrink-0 place-items-center rounded border border-hairline bg-paper">
          {locked ? <IconLock size={14} className="text-grey" /> : <KindIcon kind={item.kind} locked={locked} />}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-mono)] text-xs text-grey">{item.number}</span>
          <span className={cn("truncate text-sm", locked ? "text-grey" : "text-ink")}>{item.title}</span>
        </div>
        <ItemStateLabel kind={item.kind} status={item.status} className="mt-0.5" />
      </div>

      {isVideo && item.durationSeconds != null && item.durationSeconds > 0 && (
        <span className="font-[family-name:var(--font-mono)] text-xs text-grey">{fmt(item.durationSeconds)}</span>
      )}
      {isVideo && !locked && <IconPlayerPlayFilled size={14} className="shrink-0 text-sun" />}
    </button>
  );
}

function ModuleSection({ mod, onPick }: { mod: HomeModuleVM; onPick: (item: HomeItemVM) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 px-2">
        <span className="font-[family-name:var(--font-mono)] text-[11px] text-grey">Module {mod.order}</span>
        <span className="text-xs font-medium text-grey">{mod.title}</span>
      </div>
      <div className="flex flex-col">
        {mod.items.map((it) => (
          <ItemRow key={it.id} item={it} onPick={() => onPick(it)} />
        ))}
      </div>
    </div>
  );
}

/* ---- a day's expansion content: modules + videos + in-person activities (§3.5–3.6).
   Rendered inside a motion.section that is the DIRECT child of AnimatePresence
   (so exit animations run and the panel actually unmounts when a different day
   opens — a custom wrapper component breaks AnimatePresence tracking). ---- */
function DayPanelBody({ day, onPickItem }: { day: HomeDayVM; onPickItem: (item: HomeItemVM) => void }) {
  const empty = day.modules.length === 0 && day.activities.length === 0;
  return (
    <div className="mt-5 flex flex-col gap-5 rounded-[12px] border border-hairline bg-paper/70 p-4">
      {empty && <p className="px-2 py-6 text-center text-sm text-grey">No content for this day yet.</p>}
      {day.modules.map((mod) => (
        <ModuleSection key={mod.id} mod={mod} onPick={onPickItem} />
      ))}
      {day.activities.length > 0 && (
        <div>
          <div className="mb-1 px-2 text-xs font-medium text-grey">In person</div>
          <div className="flex flex-col">
            {day.activities.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
                <div className="grid h-10 w-[72px] shrink-0 place-items-center rounded border border-dashed border-hairline bg-paper">
                  <IconUsers size={16} className="text-grey" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-ink">{a.title}</div>
                  <span className="text-xs text-grey">In-person activity</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


/* ---- a progress rail with the sliding sun, for one set of days (§5) ---- */
function ProgressRail({ days, currentDayNumber }: { days: HomeDayVM[]; currentDayNumber: number }) {
  const n = days.length;
  if (n === 0) return null;
  const currentIndex = Math.max(0, days.findIndex((d) => d.number === currentDayNumber));
  const pct = (i: number) => ((i + 0.5) / n) * 100;
  const sunPct = pct(currentIndex);
  return (
    <div className="relative mt-10 h-10" role="presentation">
      <div
        className="absolute top-1/2 h-0 w-full -translate-y-1/2 border-t border-dashed border-hairline"
        style={{ borderTopWidth: 2 }}
      />
      <div
        className="absolute top-1/2 h-0 -translate-y-1/2 border-t-2 border-solid border-sun transition-[width] duration-700"
        style={{ width: `${sunPct}%` }}
      />
      {days.map((day, i) => (
        <div
          key={day.number}
          className={cn(
            "absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border",
            i <= currentIndex ? "border-sun bg-sun" : "border-hairline bg-paper",
          )}
          style={{ left: `${pct(i)}%` }}
          aria-hidden
        />
      ))}
      <div
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-700"
        style={{ left: `${sunPct}%` }}
        aria-label={`Currently on day ${currentDayNumber}`}
      >
        <div className="relative">
          <div className="absolute -inset-3 rounded-full bg-sun/25 blur-md" />
          <div className="relative h-4 w-4 rounded-full bg-sun shadow-[0_0_12px_2px_rgba(240,165,0,0.6)]" />
        </div>
      </div>
    </div>
  );
}

/* ---- a department box (level one) ---- */
function DeptBox({
  name,
  first,
  last,
  count,
  open,
  onClick,
}: {
  name: string;
  first: number;
  last: number;
  count: number;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={cn(
        "card flex w-full items-center justify-between gap-4 p-5 text-left transition hover:border-grey/40",
        open ? "border-sun" : "border-hairline",
      )}
    >
      <div>
        <div className="font-[family-name:var(--font-mono)] text-xs text-grey">Department</div>
        <h3 className="mt-1 font-[family-name:var(--font-sora)] text-lg font-semibold text-ink">{name}</h3>
        <p className="mt-1 text-sm text-grey">
          {count} {count === 1 ? "day" : "days"} · Day {first}–{last}
        </p>
      </div>
      <IconChevronDown
        size={20}
        className={cn("shrink-0 text-grey transition-transform duration-300", open && "rotate-180 text-sun")}
      />
    </button>
  );
}

/* ---- a row of day cards ---- */
function DayCardsRow({
  days,
  openDay,
  columns,
  onToggle,
}: {
  days: HomeDayVM[];
  openDay: number | null;
  columns: string;
  onToggle: (day: HomeDayVM) => void;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-5 sm:grid-cols-2", columns)}>
      {days.map((day) => (
        <DayCard key={day.number} day={day} open={openDay === day.number} onClick={() => onToggle(day)} />
      ))}
    </div>
  );
}

export function HomeBoard({ sections }: { sections: HomeSectionsVM }) {
  const router = useRouter();
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [openDept, setOpenDept] = useState<string | null>(null);

  // Restore the open dept/day + scroll after returning from a video (§3.11).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as { openDay?: number | null; openDept?: string | null; scrollY?: number };
      if (typeof s.openDay === "number") setOpenDay(s.openDay);
      if (typeof s.openDept === "string") setOpenDept(s.openDept);
      if (typeof s.scrollY === "number") {
        const y = s.scrollY;
        // wait for the restored panels to lay out, then restore scroll
        window.setTimeout(() => window.scrollTo({ top: y }), 420);
      }
    } catch {
      /* sessionStorage unavailable — fine */
    }
  }, []);

  const inductionNums = new Set(sections.induction.map((d) => d.number));

  function toggleDay(day: HomeDayVM) {
    if (!day.unlocked) return; // only relevant when the lock is switched on
    setOpenDay((cur) => (cur === day.number ? null : day.number)); // one day open across both sections (§3.7)
  }

  function toggleDept(dept: { name: string; days: HomeDayVM[] }) {
    if (openDept === dept.name) {
      setOpenDept(null);
      // closing a department also closes any of its open days (§3.3)
      if (openDay != null && dept.days.some((d) => d.number === openDay)) setOpenDay(null);
    } else {
      setOpenDept(dept.name);
    }
  }

  function openVideo(dayNumber: number, itemId: string) {
    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify({ openDay, openDept, scrollY: window.scrollY }));
    } catch {
      /* ignore */
    }
    router.push(`/day/${dayNumber}?item=${itemId}`);
  }

  const openInductionDay = openDay != null && inductionNums.has(openDay)
    ? sections.induction.find((d) => d.number === openDay) ?? null
    : null;

  return (
    <div className="mt-10 md:mt-14">
      {/* ===================== Section one — the common induction ===================== */}
      <section aria-label="Common induction">
        <h2 className="font-[family-name:var(--font-sora)] text-lg font-semibold text-ink">Everyone starts here</h2>
        <p className="mt-1 text-sm text-grey">The first three days, whatever department you join.</p>

        <div className="mt-5">
          <DayCardsRow days={sections.induction} openDay={openDay} columns="lg:grid-cols-3" onToggle={toggleDay} />
        </div>

        {openInductionDay && (
          <section
            key={openInductionDay.number}
            className="panel-in"
            aria-label={`Day ${openInductionDay.number} contents`}
          >
            <DayPanelBody day={openInductionDay} onPickItem={(item) => openVideo(openInductionDay.number, item.id)} />
          </section>
        )}

        <ProgressRail days={sections.induction} currentDayNumber={sections.inductionCurrentDay} />
      </section>

      {/* clear divider between the shared induction and the department block (§2.15) */}
      <div className="my-10 border-t border-hairline md:my-14" />

      {/* ===================== Section two — the departments ===================== */}
      <section aria-label="Departments">
        <h2 className="font-[family-name:var(--font-sora)] text-lg font-semibold text-ink">Then your department</h2>
        <p className="mt-1 text-sm text-grey">Your track begins after induction. More departments are coming.</p>

        <div className="mt-5 flex flex-col gap-4">
          {sections.departments.map((dept) => {
            const first = dept.days[0]?.number ?? 0;
            const last = dept.days[dept.days.length - 1]?.number ?? 0;
            const open = openDept === dept.name;
            const openDeptDay =
              open && openDay != null ? dept.days.find((d) => d.number === openDay) ?? null : null;
            return (
              <div key={dept.name}>
                <DeptBox
                  name={dept.name}
                  first={first}
                  last={last}
                  count={dept.days.length}
                  open={open}
                  onClick={() => toggleDept(dept)}
                />
                {open && (
                  <div key={dept.name} className="panel-in">
                    <div className="mt-4 rounded-[12px] border border-hairline bg-paper/60 p-4">
                      <DayCardsRow
                        days={dept.days}
                        openDay={openDay}
                        columns="lg:grid-cols-4"
                        onToggle={toggleDay}
                      />
                      {openDeptDay && (
                        <section
                          key={openDeptDay.number}
                          className="panel-in"
                          aria-label={`Day ${openDeptDay.number} contents`}
                        >
                          <DayPanelBody day={openDeptDay} onPickItem={(item) => openVideo(openDeptDay.number, item.id)} />
                        </section>
                      )}
                      <ProgressRail days={dept.days} currentDayNumber={dept.currentDay} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

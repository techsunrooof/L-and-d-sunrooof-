"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  IconChevronDown,
  IconLock,
  IconPlayerPlayFilled,
  IconFileText,
  IconClipboardText,
} from "@tabler/icons-react";
import { cn } from "@/lib/cn";
import { DayChip, ItemStateLabel } from "@/components/status-chip";
import type { HomeDayVM, HomeModuleVM, HomeItemVM } from "@/lib/view";
import type { ItemKind } from "@/lib/content";

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

/* ---- day card (the toggle) ---- */
function DayCard({ day, open, onClick }: { day: HomeDayVM; open: boolean; onClick: () => void }) {
  const locked = !day.unlocked;
  const empty = day.modules.length === 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={locked || empty ? undefined : open}
      aria-disabled={locked ? "true" : undefined}
      className={cn(
        "card block overflow-hidden text-left transition",
        open ? "border-sun" : "border-hairline",
        locked ? "cursor-default" : "hover:border-grey/40",
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-[11px] bg-stage">
        {day.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={day.image}
            alt={`Day ${day.number} — ${day.title}`}
            className={cn("h-full w-full object-cover transition duration-500", locked && "media-locked")}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-grey">
            photograph coming soon
          </div>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-[family-name:var(--font-mono)] text-xs text-grey">Day {day.number}</div>
            <h3
              className={cn(
                "mt-1 font-[family-name:var(--font-sora)] text-lg font-semibold",
                locked ? "text-grey" : "text-ink",
              )}
            >
              {day.title}
            </h3>
          </div>
          <DayChip status={day.status} />
        </div>
        <div className="mt-1.5 flex items-end justify-between gap-2">
          <p className="text-sm text-grey">{day.subtitle}</p>
          {!locked && !empty && (
            <IconChevronDown
              size={18}
              className={cn("shrink-0 text-grey transition-transform duration-300", open && "rotate-180 text-sun")}
            />
          )}
        </div>
      </div>
    </button>
  );
}

/* ---- one video / document / assessment row, YouTube-playlist style (§4.9) ---- */
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
      {/* thumbnail (video) / kind box (document, assessment) */}
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

      {/* number + title + state */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-mono)] text-xs text-grey">{item.number}</span>
          <span className={cn("truncate text-sm", locked ? "text-grey" : "text-ink")}>{item.title}</span>
        </div>
        <ItemStateLabel kind={item.kind} status={item.status} className="mt-0.5" />
      </div>

      {/* duration + play control (video) */}
      {isVideo && item.durationSeconds != null && item.durationSeconds > 0 && (
        <span className="font-[family-name:var(--font-mono)] text-xs text-grey">{fmt(item.durationSeconds)}</span>
      )}
      {isVideo && !locked && <IconPlayerPlayFilled size={14} className="shrink-0 text-sun" />}
    </button>
  );
}

/* ---- a module: just a heading + its items, all shown at once (§4.8) ---- */
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

export function HomeBoard({
  days,
  currentDay,
}: {
  days: HomeDayVM[];
  currentDay: number;
  allComplete: boolean;
}) {
  const router = useRouter();
  const reduce = useReducedMotion() ?? false;
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const n = days.length;
  const currentIndex = Math.max(0, days.findIndex((d) => d.number === currentDay));
  const pct = (i: number) => ((i + 0.5) / n) * 100;
  const sunPct = pct(currentIndex);

  function onDayClick(day: HomeDayVM) {
    setMsg(null);
    if (!day.unlocked) {
      setMsg(`Finish day ${day.number - 1} to unlock day ${day.number}.`);
      return;
    }
    if (day.modules.length === 0) {
      setMsg(`Day ${day.number} has no content yet.`);
      return;
    }
    setOpenDay(openDay === day.number ? null : day.number);
  }

  const openDayVM = days.find((d) => d.number === openDay) ?? null;

  return (
    <div className="mt-10 md:mt-14">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {days.map((day) => (
          <DayCard key={day.number} day={day} open={openDay === day.number} onClick={() => onDayClick(day)} />
        ))}
      </div>

      {/* One click opens the whole day tree — modules + their videos together (§4.7–4.8) */}
      <AnimatePresence initial={false}>
        {openDayVM && openDayVM.modules.length > 0 && (
          <motion.section
            key={openDayVM.number}
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={reduce ? {} : { height: "auto", opacity: 1 }}
            exit={reduce ? {} : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className="overflow-hidden"
            aria-label={`Day ${openDayVM.number} contents`}
          >
            <div className="mt-5 flex flex-col gap-5 rounded-[12px] border border-hairline bg-paper/70 p-4">
              {openDayVM.modules.map((mod) => (
                <ModuleSection
                  key={mod.id}
                  mod={mod}
                  onPick={(item) => router.push(`/day/${openDayVM.number}?item=${item.id}`)}
                />
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Rail with the sliding sun (§4.6) */}
      <div className="relative mt-12 h-10" role="presentation">
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
          aria-label={`You are on day ${currentDay}`}
        >
          <div className="relative">
            <div className="absolute -inset-3 rounded-full bg-sun/25 blur-md" />
            <div className="relative h-4 w-4 rounded-full bg-sun shadow-[0_0_12px_2px_rgba(240,165,0,0.6)]" />
          </div>
        </div>
      </div>

      <div className="mt-4 h-5 text-center text-sm text-grey" aria-live="polite">
        {msg}
      </div>
    </div>
  );
}

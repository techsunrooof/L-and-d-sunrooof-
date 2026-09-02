"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import {
  IconArrowLeft,
  IconLock,
  IconPlayerPlayFilled,
  IconFileText,
  IconClipboardText,
} from "@tabler/icons-react";
import { cn } from "@/lib/cn";
import { VideoPlayer } from "@/components/video-player";
import { YouTubePlayer } from "@/components/youtube-player";
import { DocumentViewer } from "@/components/document-viewer";
import { AssessmentForm } from "@/components/assessment-form";
import { ItemStateLabel } from "@/components/status-chip";
import { recordWatchAction, markVideoWatchedAction, getItemDetailAction } from "@/app/actions";
import type { ClientItemDetail, DaySnapshot, ItemSnapshot } from "@/lib/view";
import type { ItemKind } from "@/lib/content";

function KindIcon({ kind, locked }: { kind: ItemKind; locked: boolean }) {
  const cls = locked ? "text-grey" : "text-sun";
  if (kind === "video") return <IconPlayerPlayFilled size={13} className={cls} />;
  if (kind === "document") return <IconFileText size={14} className="text-grey" />;
  return <IconClipboardText size={14} className={cls} />;
}

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function videoStateWords(d: Extract<ClientItemDetail, { kind: "video" }>): string {
  if (d.watched) return "Watched to the end";
  if (d.watchedSeconds > 0) return "In progress";
  return "Not started";
}

export function DayModule({
  dayNumber,
  dayTitle,
  initialSnapshot,
  initialSelectedId,
  initialDetail,
}: {
  dayNumber: number;
  dayTitle: string;
  initialSnapshot: DaySnapshot;
  initialSelectedId: string | undefined;
  initialDetail: ClientItemDetail | null;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [detail, setDetail] = useState<ClientItemDetail | null>(initialDetail);
  const cache = useRef<Record<string, ClientItemDetail>>(
    initialDetail ? { [initialDetail.id]: initialDetail } : {},
  );
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

  const allItems: ItemSnapshot[] = snapshot.modules.flatMap((m) => m.items);

  const onProgress = useCallback(async (seconds: number) => {
    const id = selectedRef.current;
    if (!id) return;
    const res = await recordWatchAction({ itemId: id, watchedSeconds: seconds });
    if (res.snapshot) setSnapshot(res.snapshot);
    if (res.watched) {
      setDetail((d) => (d && d.id === id && d.kind === "video" ? { ...d, watched: true } : d));
    }
  }, []);

  const onYouTubeWatched = useCallback(async () => {
    const id = selectedRef.current;
    if (!id) return;
    const res = await markVideoWatchedAction({ itemId: id });
    if (res.snapshot) setSnapshot(res.snapshot);
    setDetail((d) => (d && d.id === id && d.kind === "video" ? { ...d, watched: true } : d));
  }, []);

  const select = useCallback(
    async (id: string) => {
      const row = allItems.find((v) => v.id === id);
      if (!row || !row.unlocked || id === selectedId) return;
      setSelectedId(id);
      const cached = cache.current[id];
      if (cached) {
        setDetail(cached);
      } else {
        const d = await getItemDetailAction(id);
        if (d) {
          cache.current[id] = d;
          setDetail(d);
        }
      }
    },
    [allItems, selectedId],
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 md:py-10">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-grey transition hover:text-ink">
        <IconArrowLeft size={16} /> Back to days
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-[family-name:var(--font-mono)] text-xs text-grey">Day {dayNumber}</div>
          <h1 className="mt-1 font-[family-name:var(--font-sora)] text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            {dayTitle}
          </h1>
        </div>
        {snapshot.gatingTotal > 0 && (
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-hairline">
              <div
                className="h-full rounded-full bg-sun transition-[width] duration-500"
                style={{ width: `${(snapshot.gatingDone / snapshot.gatingTotal) * 100}%` }}
              />
            </div>
            <span className="text-sm text-grey">
              {snapshot.gatingDone} of {snapshot.gatingTotal} complete
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Main area — renders the selected item by kind */}
        <div className="min-w-0">
          {!detail ? (
            <div className="flex aspect-video items-center justify-center rounded-[11px] border border-hairline text-sm text-grey">
              Select an item to begin.
            </div>
          ) : detail.kind === "video" ? (
            <>
              {detail.youtubeId ? (
                <YouTubePlayer
                  key={detail.id}
                  youtubeId={detail.youtubeId}
                  watched={detail.watched}
                  onWatched={onYouTubeWatched}
                />
              ) : (
                <VideoPlayer detail={detail} onProgress={onProgress} />
              )}
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-mono)] text-sm text-grey">{detail.number}</span>
                  <h2 className="font-[family-name:var(--font-sora)] text-lg font-semibold text-ink">{detail.title}</h2>
                </div>
                <p className="mt-1 text-sm text-grey">
                  {detail.youtubeId ? "YouTube video" : fmt(detail.durationSeconds)} · {videoStateWords(detail)}
                </p>
              </div>
            </>
          ) : detail.kind === "document" ? (
            <DocumentViewer detail={detail} />
          ) : (
            <AssessmentForm
              detail={detail}
              onSubmitted={(snap) => {
                if (snap) setSnapshot(snap);
                setDetail((d) =>
                  d && d.id === detail.id && d.kind === "assessment"
                    ? { ...d, status: "awaiting-review" }
                    : d,
                );
                cache.current[detail.id] = { ...detail, status: "awaiting-review" };
              }}
            />
          )}
        </div>

        {/* Playlist — items grouped under module headings (§5.4) */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <h3 className="mb-3 text-sm font-medium text-ink">In this day</h3>
          <div className="flex flex-col gap-4">
            {snapshot.modules.map((m) => (
              <div key={m.id}>
                <div className="mb-2 px-1 text-xs font-medium text-grey">{m.title}</div>
                <ol className="flex flex-col gap-2">
                  {m.items.map((v) => {
                    const playing = v.id === selectedId;
                    const locked = v.status === "locked";
                    return (
                      <li key={v.id}>
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => select(v.id)}
                          aria-current={playing ? "true" : undefined}
                          className={cn(
                            "relative flex w-full items-center gap-3 overflow-hidden rounded-lg border p-2.5 text-left transition",
                            playing ? "border-hairline bg-warm/40" : "border-hairline",
                            locked ? "cursor-not-allowed" : "hover:border-grey/40",
                          )}
                        >
                          {playing && <span className="absolute inset-y-0 left-0 w-1 bg-sun" />}
                          {v.kind === "video" ? (
                            <div className={cn("relative h-10 w-[64px] shrink-0 overflow-hidden rounded bg-stage", locked && "media-locked")}>
                              {v.thumbnail && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={v.thumbnail} alt="" className="h-full w-full object-cover" />
                              )}
                              <span className="absolute inset-0 grid place-items-center">
                                {locked ? (
                                  <IconLock size={13} className="text-grey" />
                                ) : (
                                  <IconPlayerPlayFilled size={14} className="text-white/90 drop-shadow" />
                                )}
                              </span>
                            </div>
                          ) : (
                            <div className="grid h-10 w-[64px] shrink-0 place-items-center rounded border border-hairline bg-paper">
                              {locked ? <IconLock size={13} className="text-grey" /> : <KindIcon kind={v.kind} locked={locked} />}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-[family-name:var(--font-mono)] text-xs text-grey">{v.number}</span>
                              <span className={cn("truncate text-sm", locked ? "text-grey" : "text-ink")}>{v.title}</span>
                            </div>
                            <ItemStateLabel kind={v.kind} status={v.status} playing={playing} className="mt-0.5" />
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

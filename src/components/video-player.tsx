"use client";

import { useEffect, useRef } from "react";
import type { ClientItemDetail } from "@/lib/view";

type VideoDetail = Extract<ClientItemDetail, { kind: "video" }>;

/*
  16:9 HTML5 player with REAL watched-time tracking (§6.5). We accumulate only
  time that actually plays — a forward seek does not count — so skipping to the
  end never marks a video watched. The parent persists the accumulated seconds;
  the SERVER decides "watched" from the threshold.
*/

export function VideoPlayer({
  detail,
  onProgress,
}: {
  detail: VideoDetail;
  /** Called with total accumulated REAL watched seconds. */
  onProgress: (seconds: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const accumulated = useRef(0);
  const lastTime = useRef(0);
  const lastReported = useRef(0);

  // Reset accounting whenever the selected video changes.
  useEffect(() => {
    accumulated.current = detail.watchedSeconds;
    lastReported.current = detail.watchedSeconds;
    lastTime.current = 0;
  }, [detail.id, detail.watchedSeconds]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onPlay = () => {
      lastTime.current = el.currentTime;
    };
    const onTimeUpdate = () => {
      const now = el.currentTime;
      const dt = now - lastTime.current;
      // Count only smooth forward playback (< 1.5s jump); ignore seeks/rewinds.
      if (dt > 0 && dt < 1.5) accumulated.current += dt;
      lastTime.current = now;

      // Report every ~4s of growth so the server can flip "watched" promptly.
      if (accumulated.current - lastReported.current >= 4) {
        lastReported.current = accumulated.current;
        onProgress(accumulated.current);
      }
    };
    const onSeeking = () => {
      // Don't credit the jump; resync the baseline.
      lastTime.current = el.currentTime;
    };
    const flush = () => {
      if (accumulated.current > lastReported.current) {
        lastReported.current = accumulated.current;
        onProgress(accumulated.current);
      }
    };

    el.addEventListener("play", onPlay);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("seeking", onSeeking);
    el.addEventListener("pause", flush);
    el.addEventListener("ended", flush);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("seeking", onSeeking);
      el.removeEventListener("pause", flush);
      el.removeEventListener("ended", flush);
    };
  }, [detail.id, onProgress]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-[11px] bg-stage">
      {detail.src ? (
        <video
          ref={videoRef}
          key={detail.id}
          src={detail.src}
          poster={detail.thumbnail ?? undefined}
          controls
          playsInline
          preload="metadata"
          className="h-full w-full"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-grey">
          {detail.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={detail.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          )}
          <span className="relative">Video coming soon</span>
        </div>
      )}
    </div>
  );
}

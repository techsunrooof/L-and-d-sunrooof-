"use client";

import { useEffect, useRef } from "react";

/*
  A responsive 16:9 YouTube player using the IFrame Player API, on the
  privacy-friendly youtube-nocookie host. Tracks REAL watched time (ignores
  forward seeks) and calls onWatched once the learner has genuinely watched most
  of it — so YouTube videos honour the same "watched to the end" gate (§6.5).
  YouTube hosts the stream, so completion is necessarily reported by the client.
*/

/* eslint-disable @typescript-eslint/no-explicit-any */
let apiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

export function YouTubePlayer({
  youtubeId,
  watched,
  onWatched,
}: {
  youtubeId: string;
  watched: boolean;
  onWatched: () => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const doneRef = useRef(watched);
  const accumulated = useRef(0);
  const lastTime = useRef(0);
  const pollRef = useRef<number | null>(null);
  const onWatchedRef = useRef(onWatched);
  onWatchedRef.current = onWatched;

  useEffect(() => {
    doneRef.current = watched;
  }, [watched]);

  useEffect(() => {
    let cancelled = false;

    const stopPoll = () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
    const maybeWatched = (ended: boolean) => {
      if (doneRef.current) return;
      const dur = playerRef.current?.getDuration?.() ?? 0;
      if (dur > 0 && (accumulated.current >= 0.9 * dur || (ended && accumulated.current >= 0.6 * dur))) {
        doneRef.current = true;
        onWatchedRef.current();
      }
    };
    const startPoll = () => {
      if (pollRef.current) return;
      lastTime.current = playerRef.current?.getCurrentTime?.() ?? 0;
      pollRef.current = window.setInterval(() => {
        const p = playerRef.current;
        if (!p) return;
        const now = p.getCurrentTime?.() ?? 0;
        const dt = now - lastTime.current;
        if (dt > 0 && dt < 1.5) accumulated.current += dt; // ignore seeks
        lastTime.current = now;
        maybeWatched(false);
      }, 1000);
    };

    loadYouTubeApi().then(() => {
      if (cancelled || !mountRef.current) return;
      const w = window as any;
      playerRef.current = new w.YT.Player(mountRef.current, {
        videoId: youtubeId,
        host: "https://www.youtube-nocookie.com",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onStateChange: (e: any) => {
            const YT = w.YT;
            if (e.data === YT.PlayerState.PLAYING) startPoll();
            else stopPoll();
            if (e.data === YT.PlayerState.ENDED) maybeWatched(true);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      stopPoll();
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
    };
  }, [youtubeId]);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-[11px] bg-stage">
      {/* The API replaces this node with the iframe. */}
      <div ref={mountRef} className="h-full w-full" />
    </div>
  );
}

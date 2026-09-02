"use client";

import { usePathname } from "next/navigation";

/*
  The sunroof background (build spec §6). The real "future light" photograph —
  a skylight seen from below at a slight angle — drifts and tilts slowly on a
  ~36s loop, heavily blurred so it is only ever atmosphere (§6.4). A warm wash
  over it keeps the interface light-orange and the black type readable.

  • Moving panel                       → CSS `bg-drift` keyframe on the image.
  • Still fallback / reduced motion    → the same <img>; the keyframe is disabled
    under prefers-reduced-motion, so the picture simply holds (§6.2, §6.3).
  • No WebGL                           → works on low-powered devices (§6.2).
  • Prominent on home, faint on days   → opacity keyed off the route (§6.1).
*/

/** Route → how visible the background is (§6.1). */
function intensityFor(pathname: string): number {
  if (pathname.startsWith("/day")) return 0.2; // day / video pages: much fainter
  if (pathname === "/") return 0.68; // home: clearly present, never competing
  return 0.42;
}

export function SceneBackground() {
  const pathname = usePathname() ?? "/";
  const opacity = intensityFor(pathname);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* The drifting skylight photograph. */}
      <div
        className="absolute inset-0"
        style={{ opacity, transition: "opacity 600ms ease" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/future-light.jpg"
          alt=""
          className="bg-drift absolute inset-0 h-full w-full object-cover"
          style={{ filter: "blur(26px) saturate(1.05)" }}
        />
      </div>
      {/* Warm-to-white wash: keeps it in the SUNROOOF palette and stops the
          photograph from ever competing with the cards or the type (§6.4, §6.7). */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,246,232,0.32) 0%, rgba(255,250,243,0.55) 55%, rgba(255,255,255,0.82) 100%)",
        }}
      />
    </div>
  );
}

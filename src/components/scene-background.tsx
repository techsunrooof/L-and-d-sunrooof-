"use client";

import { usePathname } from "next/navigation";

/*
  The 3D SUNROOOF skylight behind the content (§6). A glass grid with warm
  mullions, seen from below at an angle (CSS perspective), with a soft sun glow —
  slowly drifting on a ~38s loop so it reads as a moving 3D skylight panel.
  Pure CSS: no WebGL, works everywhere, freezes under reduced motion.

  • Prominent on home, faint on day/video pages → opacity keyed off the route.
  • Never competes with the cards/type → soft blur + a warm-to-white wash on top.
*/

function intensityFor(pathname: string): number {
  if (pathname.startsWith("/day")) return 0.18; // day / video pages: much fainter
  if (pathname === "/") return 0.62; // home: clearly a skylight overhead
  return 0.34;
}

export function SceneBackground() {
  const pathname = usePathname() ?? "/";
  const opacity = intensityFor(pathname);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* warm sky ground */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, #fdecd4 0%, #fbf2e4 45%, #ffffff 100%)" }}
      />

      {/* the drifting 3D skylight panel */}
      <div
        className="absolute inset-0"
        style={{ perspective: "1100px", opacity, transition: "opacity 600ms ease" }}
      >
        <div
          className="skylight-drift absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "175vmax",
            height: "175vmax",
            filter: "blur(2.5px)",
            backgroundColor: "#f5e3c1",
            backgroundImage: [
              // glass sheen across the panel
              "linear-gradient(120deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.05) 42%, rgba(255,255,255,0.4) 100%)",
              // vertical mullions
              "repeating-linear-gradient(90deg, rgba(120,84,44,0) 0 104px, rgba(120,84,44,0.5) 104px 116px)",
              // horizontal mullions
              "repeating-linear-gradient(0deg, rgba(120,84,44,0) 0 104px, rgba(120,84,44,0.5) 104px 116px)",
            ].join(","),
          }}
        />
      </div>

      {/* warm sun glow, upper area — the SUNROOOF bloom */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(62% 52% at 66% 18%, rgba(255,205,110,0.5) 0%, rgba(255,205,110,0) 70%)" }}
      />

      {/* readability wash: keeps it atmospheric and the black type legible */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,250,242,0.26) 0%, rgba(255,252,247,0.5) 55%, rgba(255,255,255,0.8) 100%)",
        }}
      />
    </div>
  );
}

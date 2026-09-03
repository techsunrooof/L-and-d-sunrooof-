"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/*
  The SUNROOOF skylight background — the real hero videos from sunrooof.com
  (skylight interiors), muted and looping, CROSS-FADING between scenes every
  ~5s. A warm wash keeps the black type readable. Under reduced motion (or if
  video can't play) it holds on the poster still, no cycling.

  • Prominent on home, faint on day/video pages → opacity keyed off the route.
  • Never competes with the cards/type → light blur + a warm-to-white wash.
*/

const CLIPS = ["/brand/hero.mp4", "/brand/hero-2.mp4"];
const SWITCH_MS = 2500;

function intensityFor(pathname: string): number {
  if (pathname.startsWith("/day")) return 0.24; // day / video pages: fainter
  if (pathname === "/") return 0.82; // home: skylight clearly present
  return 0.42;
}

export function SceneBackground() {
  const pathname = usePathname() ?? "/";
  const [reduced, setReduced] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setActive((a) => (a + 1) % CLIPS.length), SWITCH_MS);
    return () => clearInterval(id);
  }, [reduced]);

  const opacity = intensityFor(pathname);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0" style={{ opacity, transition: "opacity 600ms ease" }}>
        {reduced ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/brand/hero-poster.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: "blur(2px) saturate(1.03)" }}
          />
        ) : (
          CLIPS.map((src, i) => (
            <video
              key={src}
              src={src}
              poster="/brand/hero-poster.jpg"
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out"
              style={{ opacity: i === active ? 1 : 0, filter: "blur(2px) saturate(1.03)" }}
            />
          ))
        )}
      </div>

      {/* warm-to-white wash: keeps it atmospheric and the black type legible */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,250,242,0.14) 0%, rgba(255,252,247,0.34) 50%, rgba(255,255,255,0.68) 100%)",
        }}
      />
    </div>
  );
}

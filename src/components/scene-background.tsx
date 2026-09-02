"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/*
  The moving 3D skylight (build spec §2). A rectangular sky panel seen from
  slightly below, drifting and tilting over ~35s. Heavily blurred via CSS — it is
  atmosphere, never a readable feature. Matches sunrooof.com: a soft blue sky
  with a warm golden sun bloom (the product itself).

  • Blurred and soft (§2.2)         → CSS blur on the wrapper.
  • Slow ~35s drift, no fast motion → gentle sine-driven rotation/position.
  • Visible on home, fainter on days → opacity keyed off the route (§2.4).
  • Stops fully on reduced motion   → frameloop "demand", no useFrame updates.
  • Cheap                           → 1 textured plane + a few bars, dpr capped.
*/

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Paint the sky gradient + warm sun bloom onto a canvas texture. */
function useSkyTexture(): THREE.CanvasTexture | null {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d");
    if (!ctx) return null;

    // Soft, light-orange sky — warm and airy, in the SUNROOOF palette. Light
    // enough that dark text stays readable over it.
    const sky = ctx.createLinearGradient(0, 0, 0, 512);
    sky.addColorStop(0, "#f6c98c");
    sky.addColorStop(0.5, "#fbe1bf");
    sky.addColorStop(1, "#fdf5ea");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 512, 512);

    // A warm golden sun bloom, upper-right — the SUNROOOF glow.
    const sun = ctx.createRadialGradient(380, 120, 10, 380, 120, 220);
    sun.addColorStop(0, "rgba(255,206,120,0.9)");
    sun.addColorStop(0.4, "rgba(248,196,110,0.45)");
    sun.addColorStop(1, "rgba(240,165,0,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, 512, 512);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function SkyPanel({ animate }: { animate: boolean }) {
  const group = useRef<THREE.Group>(null);
  const tex = useSkyTexture();

  useFrame(({ clock }) => {
    if (!animate || !group.current) return;
    const t = clock.getElapsedTime();
    // Slow but PERCEPTIBLE drift + yaw, so you can see it's a moving 3D panel.
    // The yaw (rotation.y) shifts the grid's perspective — that reads as 3D.
    group.current.rotation.x = -0.2 + Math.sin(t / 15) * 0.1;
    group.current.rotation.y = Math.sin(t / 13) * 0.17;
    group.current.rotation.z = Math.sin(t / 19) * 0.05;
    group.current.position.x = Math.sin(t / 18) * 0.5;
    group.current.position.y = Math.cos(t / 22) * 0.3;
  });

  // The skylight grid seen from below (like sunrooof.com's pergola). Defined
  // enough to read as a 3D panel; the yaw above swings its perspective.
  const hBeams = [-4, -2, 0, 2, 4];
  const vBeams = [-8, -4, 0, 4, 8];

  return (
    <group ref={group} rotation={[-0.2, 0, 0]}>
      {/* Oversized so the tilted panel always covers the viewport — no seam. */}
      <mesh>
        <planeGeometry args={[30, 20]} />
        {tex ? (
          <meshBasicMaterial map={tex} toneMapped={false} />
        ) : (
          <meshBasicMaterial color="#f6c98c" toneMapped={false} />
        )}
      </mesh>
      {/* horizontal beams */}
      {hBeams.map((y) => (
        <mesh key={`h${y}`} position={[0, y, 0.05]}>
          <planeGeometry args={[30, 0.4]} />
          <meshBasicMaterial color="#9a744a" transparent opacity={0.45} toneMapped={false} />
        </mesh>
      ))}
      {/* vertical mullions — together with the beams these form the grid */}
      {vBeams.map((x) => (
        <mesh key={`v${x}`} position={[x, 0, 0.05]}>
          <planeGeometry args={[0.4, 20]} />
          <meshBasicMaterial color="#9a744a" transparent opacity={0.4} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Route → how visible the background is (§2.4). */
function intensityFor(pathname: string): number {
  if (pathname.startsWith("/day")) return 0.28; // day pages: much fainter
  if (pathname === "/") return 0.92; // home: clearly visible
  return 0.55;
}

export function SceneBackground() {
  const [mounted, setMounted] = useState(false);
  const reduced = useReducedMotion();
  const pathname = usePathname() ?? "/";

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const opacity = intensityFor(pathname);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed -z-10 overflow-hidden"
      style={{
        // Grow the layer past the viewport so the soft blur edge falls
        // off-screen (a negative inset, not a transform — a transform would
        // confuse the R3F canvas resize observer and leave a seam).
        inset: -80,
        opacity,
        filter: "blur(20px)",
        transition: "opacity 600ms ease",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 6], fov: 55 }}
        dpr={[1, 1.5]}
        frameloop={reduced ? "demand" : "always"}
        gl={{ antialias: false, alpha: true }}
      >
        {/* Sky fills the whole canvas — the panel + sun draw on top of it, so
            there is never a transparent seam regardless of viewport ratio. */}
        <color attach="background" args={["#fbe6cd"]} />
        <SkyPanel animate={!reduced} />
      </Canvas>
    </div>
  );
}

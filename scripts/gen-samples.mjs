/*
  Dev-only: generate small labelled sample MP4 clips + thumbnails so the
  unlock chain and watched-time tracking are testable before real videos exist.
  Each clip: dark #111 stage, the video number + title, and a gold progress bar
  that grows as the clip plays (so "how far watched" is visible at a glance).

  Run:  node scripts/gen-samples.mjs
  These are throwaway placeholders — real MP4s replace them in public/videos/.
*/
import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import ffmpegPath from "ffmpeg-static";

const ROOT = new URL("..", import.meta.url).pathname;
const VID_DIR = `${ROOT}public/videos`;
const THUMB_DIR = `${ROOT}public/thumbnails`;
mkdirSync(VID_DIR, { recursive: true });
mkdirSync(THUMB_DIR, { recursive: true });

const FONT_CANDIDATES = [
  "/System/Library/Fonts/Supplemental/Arial.ttf",
  "/System/Library/Fonts/Helvetica.ttc",
  "/Library/Fonts/Arial.ttf",
];
const font = FONT_CANDIDATES.find((f) => existsSync(f));

// Mirror of content.ts (id, number, title). Kept minimal on purpose.
const CLIPS = [
  ["d1v1", "1.1", "Welcome to SUNROOOF"],
  ["d1v2", "1.2", "Our vision for daylight"],
  ["d1v3", "1.3", "The founding story"],
  ["d1v4", "1.4", "How your first week works"],
  ["d2v1", "2.1", "Our culture"],
  ["d2v2", "2.2", "Working policies"],
  ["d2v3", "2.3", "Code of conduct"],
  ["d3v1", "3.1", "The SUNROOOF panel"],
  ["d3v2", "3.2", "How artificial sunlight works"],
  ["d3v3", "3.3", "Installation basics"],
  ["d3v4", "3.4", "Caring for the product"],
];

const DUR = 15;
const esc = (s) => s.replace(/:/g, "\\:").replace(/'/g, "\u2019");

for (const [id, number, title] of CLIPS) {
  // This static build of ffmpeg has no drawtext filter, so we don't burn the
  // number in — the UI labels every video anyway. We draw a small on-brand
  // "skylight" rectangle and a gold progress bar that grows with playback so
  // watched-time is visible. A faint per-day tint keeps clips distinguishable.
  const dayTint = [0x1a1712, 0x121517, 0x141414][(Number(number[0]) - 1) % 3];
  const draws = [
    // skylight panel outline, centred
    `drawbox=x=440:y=190:w=400:h=280:color=0xF0A500@0.55:t=5`,
    // inner glow block
    `drawbox=x=452:y=202:w=376:h=256:color=0xF0A500@0.10:t=fill`,
    // growing gold progress bar along the bottom
    `drawbox=x=0:y=ih-14:w=iw*t/${DUR}:h=14:color=0xF0A500:t=fill`,
  ];
  void font; // (font unused now that drawtext is unavailable)
  void title;

  const vf = draws.join(",");
  void dayTint;
  execFileSync(
    ffmpegPath,
    [
      "-y",
      "-f", "lavfi",
      "-i", `color=c=0x111111:s=1280x720:r=30:d=${DUR}`,
      "-vf", vf,
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-profile:v", "high",
      "-crf", "30",
      "-movflags", "+faststart",
      `${VID_DIR}/${id}.mp4`,
    ],
    { stdio: "ignore" },
  );

  // thumbnail: a frame from ~2s in
  execFileSync(
    ffmpegPath,
    ["-y", "-ss", "2", "-i", `${VID_DIR}/${id}.mp4`, "-frames:v", "1", "-q:v", "4", `${THUMB_DIR}/${id}.jpg`],
    { stdio: "ignore" },
  );
  console.log(`generated ${id}.mp4 + ${id}.jpg`);
}
console.log(`\nDone. Font used: ${font ?? "(none — text skipped)"}`);

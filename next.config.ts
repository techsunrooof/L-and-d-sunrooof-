import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module — keep it external to the server bundle.
  serverExternalPackages: ["better-sqlite3"],
  // The voice transcribe route shells out to the ffmpeg-static binary — make sure
  // it's traced into that serverless function on deploy.
  outputFileTracingIncludes: {
    "/api/transcribe": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
};

export default nextConfig;

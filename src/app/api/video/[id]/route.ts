import type { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getItem } from "@/lib/content";
import { getLearnerId } from "@/lib/learner";
import { getState } from "@/lib/state";
import { isAccessible } from "@/lib/locking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Streams a video item's bytes ONLY if the learner has it unlocked (§6.6). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const item = getItem(id);
  if (!item || item.kind !== "video") return new Response("Not found", { status: 404 });

  const learnerId = await getLearnerId();
  if (!isAccessible(getState(learnerId), id)) {
    return new Response("This video is locked.", { status: 403 });
  }

  const file = path.join(process.cwd(), "media", "videos", `${id}.mp4`);
  let buf: Buffer;
  try {
    buf = await readFile(file);
  } catch {
    return new Response("Video file not available yet.", { status: 404 });
  }

  const size = buf.length;
  const base: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
  };

  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m && m[1] ? parseInt(m[1], 10) : 0;
    let end = m && m[2] ? parseInt(m[2], 10) : size - 1;
    if (Number.isNaN(start)) start = 0;
    if (Number.isNaN(end) || end >= size) end = size - 1;
    if (start > end || start >= size) {
      return new Response("Range Not Satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    const chunk = new Uint8Array(buf.subarray(start, end + 1));
    return new Response(chunk, {
      status: 206,
      headers: { ...base, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(chunk.length) },
    });
  }

  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: { ...base, "Content-Length": String(size) },
  });
}

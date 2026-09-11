import type { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getItem } from "@/lib/content";
import { getLearnerId } from "@/lib/learner";
import { getState } from "@/lib/state";
import { isAccessible } from "@/lib/locking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
  Serves a document item's PDF from the project's private media folder (NOT
  public/), so files are committed build assets that also work once deployed.
  Documents are always available within an unlocked day (§5.7); we still require
  the day to be reachable. Supports Range so PDFs stream/scrub in the viewer.
*/
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const item = getItem(id);
  if (!item || item.kind !== "document") return new Response("Not found", { status: 404 });

  const learnerId = await getLearnerId();
  if (!isAccessible(getState(learnerId), id)) {
    return new Response("This document is not available yet.", { status: 403 });
  }

  // HR Policy: ?original=1 hands over the file exactly as HR supplied it
  // (e.g. the .pptx deck), versioned so an old download is never mistaken for
  // the current one.
  if (req.nextUrl.searchParams.get("original") === "1") {
    const original = item.policy?.original;
    if (!original) return new Response("No original file is held for this document.", { status: 404 });
    let data: Buffer;
    try {
      data = await readFile(path.join(process.cwd(), "media", "documents", "originals", path.basename(original.file)));
    } catch {
      return new Response("The original file is not available.", { status: 404 });
    }
    const ext = path.extname(original.file);
    const safeTitle = item.title.replace(/[^A-Za-z0-9 ._-]+/g, "").trim() || id;
    return new Response(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": original.mime,
        "Content-Length": String(data.length),
        "Content-Disposition": `attachment; filename="${safeTitle} (v${item.policy?.version ?? 1})${ext}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  const file = path.join(process.cwd(), "media", "documents", `${id}.pdf`);
  let buf: Buffer;
  try {
    buf = await readFile(file);
  } catch {
    return new Response("Document not available yet.", { status: 404 });
  }

  const size = buf.length;
  // The saved file is named after the document's TITLE (with its version, for
  // a policy), not its internal id — the viewer's Download button takes its
  // name from here, so a learner gets "SUNROOOF Company Policy (v1).pdf"
  // rather than "d1-doc-sunrooof-hr-policy.pdf".
  const niceName = item.title.replace(/[^A-Za-z0-9 ._-]+/g, "").trim() || id;
  const fileName = item.policy ? `${niceName} (v${item.policy.version}).pdf` : `${niceName}.pdf`;
  const base: Record<string, string> = {
    "Content-Type": "application/pdf",
    "Accept-Ranges": "bytes",
    "Content-Disposition": `inline; filename="${fileName}"`,
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

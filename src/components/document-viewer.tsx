"use client";

import { IconFileText, IconExternalLink, IconDownload } from "@tabler/icons-react";
import type { ClientItemDetail } from "@/lib/view";

type DocumentDetail = Extract<ClientItemDetail, { kind: "document" }>;

export function DocumentViewer({ detail }: { detail: DocumentDetail }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-[family-name:var(--font-mono)] text-sm text-grey">{detail.number}</span>
            <h1 className="font-[family-name:var(--font-sora)] text-xl font-semibold text-ink">{detail.title}</h1>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-grey">
            <IconFileText size={15} /> Document · always available
          </p>
        </div>
        {detail.file && (
          <div className="flex items-center gap-2">
            <a
              href={detail.file}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-2 text-sm text-ink transition hover:border-grey/40"
            >
              <IconExternalLink size={15} /> Open
            </a>
            <a
              href={detail.file}
              download
              className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-2 text-sm text-ink transition hover:border-grey/40"
            >
              <IconDownload size={15} /> Download
            </a>
          </div>
        )}
      </div>

      {/* An article kept as sections (e.g. "The Magppie Truth") */}
      {detail.sections && detail.sections.length > 0 ? (
        <div className="flex flex-col gap-6">
          {detail.sections.map((s, i) => (
            <section key={i}>
              <h2 className="font-[family-name:var(--font-sora)] text-lg font-semibold text-ink">{s.heading}</h2>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{s.body}</p>
            </section>
          ))}
        </div>
      ) : detail.file ? (
        <div className="overflow-hidden rounded-[11px] border border-hairline bg-stage">
          <iframe src={detail.file} title={detail.title} className="h-[75vh] w-full" />
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-[11px] border border-hairline text-sm text-grey">
          This document isn&apos;t available yet.
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  IconArrowLeft,
  IconCheck,
  IconDownload,
  IconFileText,
  IconAlertTriangle,
  IconChevronRight,
} from "@tabler/icons-react";
import { cn } from "@/lib/cn";
import { DocumentViewer } from "@/components/document-viewer";
import { acknowledgePolicyAction, getItemDetailAction } from "@/app/actions";
import type { ClientItemDetail, PolicyCategoryVM, PolicyDocVM, PolicyLibraryVM } from "@/lib/view";

/*
  The HR Policy module (Day 1): category cards, then a reader.

  Content is HR's (Komal). Nothing here is written by the build — a category
  appears only once it holds a document. The tick at the end of each document
  is a RECORD, not a test: it never locks anything and it cannot be undone.
*/

type DocDetail = Extract<ClientItemDetail, { kind: "document" }>;

const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// Fixed to IST so the server render and the browser always agree.
const fmtStamp = (ms: number) =>
  new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export function PolicyLibrary({
  library,
  initialDocId,
  initialDetail,
  onLibraryChange,
  onOpenDoc,
}: {
  library: PolicyLibraryVM;
  initialDocId?: string;
  initialDetail?: ClientItemDetail | null;
  onLibraryChange: (lib: PolicyLibraryVM) => void;
  onOpenDoc?: (docId: string | undefined) => void;
}) {
  const categoryOf = (docId: string) => library.categories.find((c) => c.docs.some((d) => d.id === docId));
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(
    initialDocId ? (categoryOf(initialDocId)?.id ?? null) : null,
  );

  const open = library.categories.find((c) => c.id === openCategoryId) ?? null;

  return (
    <div>
      <header className="mb-5">
        <p className="font-[family-name:var(--font-mono)] text-xs text-grey">Day 1 · from HR at SUNROOOF</p>
        <h2 className="mt-1 font-[family-name:var(--font-sora)] text-xl font-semibold text-ink">{library.title}</h2>
        {library.currentTotal > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-hairline">
              <div
                className="h-full rounded-full bg-sun transition-[width] duration-500"
                style={{ width: `${(library.readTotal / library.currentTotal) * 100}%` }}
              />
            </div>
            <span className="text-sm text-grey">
              You have read {library.readTotal} of {library.currentTotal} {library.currentTotal === 1 ? "policy" : "policies"}
            </span>
          </div>
        )}
      </header>

      {library.categories.length === 0 ? (
        <div className="card px-6 py-10 text-center">
          <IconFileText size={22} className="mx-auto text-grey" />
          <p className="mt-3 text-sm text-ink">No policies here yet</p>
          <p className="mt-1 text-sm text-grey">HR&apos;s policies will appear here once they are uploaded.</p>
        </div>
      ) : open ? (
        <Reader
          key={open.id}
          category={open}
          initialDocId={initialDocId && open.docs.some((d) => d.id === initialDocId) ? initialDocId : open.docs[0]?.id}
          initialDetail={initialDetail ?? null}
          onBack={() => {
            setOpenCategoryId(null);
            onOpenDoc?.(undefined);
          }}
          onLibraryChange={onLibraryChange}
          onOpenDoc={onOpenDoc}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {library.categories.map((c) => (
            <CategoryCard key={c.id} category={c} onOpen={() => setOpenCategoryId(c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- a category card ---------------- */

function CategoryCard({ category, onOpen }: { category: PolicyCategoryVM; onOpen: () => void }) {
  const count = category.docs.length;
  const allRead = category.currentCount > 0 && category.readCount === category.currentCount;

  return (
    <button type="button" onClick={onOpen} className="card flex w-full flex-col p-4 text-left transition hover:border-grey/40">
      <span className="flex items-start justify-between gap-3">
        <span className="font-[family-name:var(--font-sora)] text-[15px] font-semibold text-ink">{category.name}</span>
        <IconChevronRight size={16} className="mt-0.5 shrink-0 text-grey" />
      </span>
      <span className="mt-1 text-sm leading-relaxed text-grey">{category.description}</span>
      <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="text-grey">
          {count} {count === 1 ? "document" : "documents"}
        </span>
        {category.currentCount === 0 ? (
          <span className="text-grey">None current</span>
        ) : allRead ? (
          <span className="flex items-center gap-1 text-success">
            <IconCheck size={13} stroke={2.5} /> All read
          </span>
        ) : category.readCount > 0 ? (
          <span className="text-ink">
            {category.readCount} of {category.currentCount} read
          </span>
        ) : (
          <span className="text-ink">Not read yet</span>
        )}
      </span>
    </button>
  );
}

/* ---------------- the reader ---------------- */

function Reader({
  category,
  initialDocId,
  initialDetail,
  onBack,
  onLibraryChange,
  onOpenDoc,
}: {
  category: PolicyCategoryVM;
  initialDocId: string | undefined;
  initialDetail: ClientItemDetail | null;
  onBack: () => void;
  onLibraryChange: (lib: PolicyLibraryVM) => void;
  onOpenDoc?: (docId: string | undefined) => void;
}) {
  const [docId, setDocId] = useState(initialDocId);
  const [cache, setCache] = useState<Record<string, DocDetail>>(() =>
    initialDetail && initialDetail.kind === "document" ? { [initialDetail.id]: initialDetail } : {},
  );
  const [failed, setFailed] = useState<Record<string, true>>({});

  const doc = category.docs.find((d) => d.id === docId) ?? null;
  const detail = docId ? cache[docId] : undefined;
  // Derived, not stored: loading is simply "open, not fetched, not failed".
  const loading = Boolean(docId && !detail && !failed[docId]);

  // Fetch a document's body the first time it is opened. State is only set in
  // the promise callbacks, never synchronously in the effect.
  useEffect(() => {
    if (!docId || cache[docId] || failed[docId]) return;
    let alive = true;
    getItemDetailAction(docId)
      .then((d) => {
        if (!alive) return;
        if (d && d.kind === "document") setCache((c) => ({ ...c, [docId]: d }));
        else setFailed((f) => ({ ...f, [docId]: true }));
      })
      .catch(() => {
        if (alive) setFailed((f) => ({ ...f, [docId]: true }));
      });
    return () => {
      alive = false;
    };
  }, [docId, cache, failed]);

  const openDoc = (id: string) => {
    setDocId(id);
    onOpenDoc?.(id);
  };

  const retry = (id: string) =>
    setFailed((f) => {
      const next = { ...f };
      delete next[id];
      return next;
    });

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm text-grey transition hover:text-ink">
        <IconArrowLeft size={16} /> All HR policies
      </button>

      {/* Phone: the list sits above the document. Wide: beside it. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[220px_1fr]">
        <nav aria-label={`${category.name} documents`}>
          <p className="mb-2 px-1 text-xs font-medium text-grey">{category.name}</p>
          <ol className="flex flex-col gap-1.5">
            {category.docs.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => openDoc(d.id)}
                  aria-current={d.id === docId ? "true" : undefined}
                  className={cn(
                    "relative flex w-full items-start gap-2.5 overflow-hidden rounded-lg border px-3 py-2.5 text-left transition",
                    d.id === docId ? "border-hairline bg-warm/40" : "border-hairline hover:border-grey/40",
                  )}
                >
                  {d.id === docId && <span className="absolute inset-y-0 left-0 w-1 bg-sun" />}
                  <IconFileText size={15} className="mt-0.5 shrink-0 text-grey" />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm", d.status === "withdrawn" ? "text-grey line-through" : "text-ink")}>
                      {d.title}
                    </span>
                    <span className="mt-0.5 block text-xs">
                      {d.status === "withdrawn" ? (
                        <span className="text-grey">No longer current</span>
                      ) : d.acknowledged ? (
                        <span className="flex items-center gap-1 text-success">
                          <IconCheck size={12} stroke={2.5} /> Read
                        </span>
                      ) : (
                        <span className="text-grey">Not read yet</span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0">
          {!doc ? (
            <p className="text-sm text-grey">Pick a document to read it.</p>
          ) : (
            <article>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-[family-name:var(--font-sora)] text-lg font-semibold text-ink">{doc.title}</h3>
                  <p className="mt-1 text-sm text-grey">{doc.description}</p>
                  <p className="mt-1.5 text-xs text-grey">
                    Version {doc.version} · added {fmtDay(doc.uploadedOn)} ·{" "}
                    {doc.uploadedBy ? `uploaded by ${doc.uploadedBy}` : "uploader not recorded"}
                  </p>
                </div>
                {doc.hasOriginal && <DownloadButton doc={doc} />}
              </div>

              {doc.status === "withdrawn" && (
                <div className="mb-4 rounded-lg border border-hairline bg-warm/50 px-4 py-3 text-sm text-ink">
                  This policy is no longer current. It is kept here, unchanged, for reference.
                </div>
              )}

              {/* Loading, error, or the document itself. */}
              {loading && !detail ? (
                <div className="flex flex-col gap-3" aria-busy="true">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-3 animate-pulse rounded-full bg-hairline" style={{ width: `${[90, 100, 75, 85][i]}%` }} />
                  ))}
                </div>
              ) : failed[doc.id] ? (
                <div className="card flex flex-col items-center px-6 py-10 text-center">
                  <IconAlertTriangle size={22} className="text-grey" />
                  <p className="mt-3 text-sm text-ink">This document could not be shown here.</p>
                  <p className="mt-1 text-sm text-grey">
                    {doc.hasOriginal ? "You can still download the original file." : "Please try again in a moment."}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {doc.hasOriginal && <DownloadButton doc={doc} />}
                    <button
                      type="button"
                      onClick={() => retry(doc.id)}
                      className="rounded-lg border border-hairline px-3 py-2 text-sm text-ink transition hover:border-grey/40"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              ) : detail ? (
                <DocumentViewer detail={detail} bare />
              ) : null}

              {detail && !failed[doc.id] && (
                <ReadTick doc={doc} onLibraryChange={onLibraryChange} />
              )}
            </article>
          )}
        </div>
      </div>
    </div>
  );
}

function DownloadButton({ doc }: { doc: PolicyDocVM }) {
  return (
    <a
      href={`/api/document/${doc.id}?original=1`}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-hairline px-3 py-2 text-sm text-ink transition hover:border-grey/40"
    >
      <IconDownload size={15} /> Download
      {doc.originalLabel && <span className="text-xs text-grey">· {doc.originalLabel}</span>}
    </a>
  );
}

/* ---------------- the read tick ---------------- */

function ReadTick({ doc, onLibraryChange }: { doc: PolicyDocVM; onLibraryChange: (lib: PolicyLibraryVM) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (doc.status === "withdrawn") return null;

  if (doc.acknowledged) {
    return (
      <div className="mt-8 flex items-center gap-2.5 border-t border-hairline pt-5 text-sm text-success">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-success text-paper">
          <IconCheck size={15} stroke={3} />
        </span>
        You confirmed you read version {doc.version} of this policy
        {doc.acknowledgedAt ? ` on ${fmtStamp(doc.acknowledgedAt)}` : ""}.
      </div>
    );
  }

  const confirm = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await acknowledgePolicyAction({ itemId: doc.id });
      if (res.library) onLibraryChange(res.library);
      if (!res.ok) setError("That could not be recorded just now. Please try again.");
    } catch {
      setError("That could not be recorded just now. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-8 border-t border-hairline pt-5">
      <button
        type="button"
        onClick={confirm}
        disabled={saving}
        className="flex items-center gap-2.5 text-sm font-medium text-ink disabled:opacity-50"
      >
        <span className="grid h-6 w-6 place-items-center rounded-md border-2 border-ink/70" />
        I have read this policy
      </button>
      <p className="mt-2 text-xs leading-relaxed text-grey">
        A record that you have read version {doc.version}. It is not a test and does not lock anything. It cannot be
        undone — if it needs correcting, ask HR.
      </p>
      {error && <p className="mt-2 text-xs text-ink">{error}</p>}
    </div>
  );
}

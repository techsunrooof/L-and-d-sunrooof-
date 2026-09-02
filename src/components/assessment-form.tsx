"use client";

import { useMemo, useState } from "react";
import { IconClockHour4, IconInfoCircle } from "@tabler/icons-react";
import { cn } from "@/lib/cn";
import { submitAssessmentAction } from "@/app/actions";
import type { ClientItemDetail, DaySnapshot, ClientQuestion } from "@/lib/view";

type AssessmentDetail = Extract<ClientItemDetail, { kind: "assessment" }>;
const LETTERS = ["A", "B", "C", "D", "E", "F"];

function fmtDate(ms: number): string {
  try {
    return new Date(ms).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function AssessmentForm({
  detail,
  onSubmitted,
}: {
  detail: AssessmentDetail;
  onSubmitted: (snapshot: DaySnapshot | null, submittedAt: number) => void;
}) {
  const a = detail.assessment;
  const existing = detail.submission;

  // answers: qid -> number (mcq) | string (written) | {partId: string} (scenario)
  const [answers, setAnswers] = useState<Record<string, number | string | Record<string, string>>>(
    () => (existing ? existing.answers : {}),
  );
  const [submitting, setSubmitting] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<number | null>(existing ? existing.submittedAt : null);
  const [error, setError] = useState<string | null>(null);
  const readOnly = submittedAt != null;

  const allQuestions = useMemo(
    () => a.sections.flatMap((s) => s.groups.flatMap((g) => g.questions)),
    [a],
  );

  function isAnswered(q: ClientQuestion): boolean {
    const v = answers[q.id];
    if (q.kind === "mcq") return typeof v === "number";
    if (q.kind === "written") return typeof v === "string" && v.trim().length > 0;
    // scenario: every part filled
    const obj = (v as Record<string, string>) || {};
    return q.parts.every((p) => (obj[p.id] ?? "").trim().length > 0);
  }

  const complete = allQuestions.every(isAnswered);

  function setMcq(qid: string, idx: number) {
    setAnswers((prev) => ({ ...prev, [qid]: idx }));
  }
  function setWritten(qid: string, text: string) {
    setAnswers((prev) => ({ ...prev, [qid]: text }));
  }
  function setPart(qid: string, partId: string, text: string) {
    setAnswers((prev) => {
      const cur = (prev[qid] as Record<string, string>) || {};
      return { ...prev, [qid]: { ...cur, [partId]: text } };
    });
  }

  async function submit() {
    if (!complete || submitting || readOnly) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await submitAssessmentAction({ itemId: detail.id, answers });
      if (!res.ok) {
        setError(
          res.reason === "locked"
            ? "This assessment is locked."
            : "Could not submit — please try again.",
        );
        return;
      }
      const at = res.submittedAt ?? Date.now();
      setSubmittedAt(at);
      onSubmitted(res.snapshot, at);
    } catch {
      setError("Could not submit — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  let qCounter = 0;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <div className="font-[family-name:var(--font-mono)] text-xs text-grey">{detail.number}</div>
        <h1 className="mt-1 font-[family-name:var(--font-sora)] text-2xl font-semibold tracking-tight text-ink">
          {a.title}
        </h1>
        {a.subtitle && <p className="mt-1 text-sm text-grey">{a.subtitle}</p>}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-grey">
          <span>Total: {a.totalMarks} marks</span>
          <span>Pass mark: {a.passMark == null ? "to be set" : `${a.passMark} marks`}</span>
        </div>
        {a.instructions && a.instructions.length > 0 && (
          <ul className="mt-3 space-y-1 rounded-lg border border-hairline bg-warm/40 p-3 text-sm text-ink">
            {a.instructions.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-xs text-grey">
          <IconInfoCircle size={14} />
          Your written answers are saved and sent for review by a person — this assessment isn&apos;t auto-scored.
        </p>
      </div>

      {/* Submitted banner */}
      {readOnly && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-hairline bg-warm/50 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sun text-ink">
            <IconClockHour4 size={20} />
          </div>
          <div>
            <div className="font-[family-name:var(--font-sora)] font-semibold text-ink">Submitted · awaiting review</div>
            <div className="text-xs text-grey">
              Submitted {submittedAt ? fmtDate(submittedAt) : ""}. The next item is unlocked.
            </div>
          </div>
        </div>
      )}

      {/* Sections */}
      {a.sections.map((section, si) => (
        <section key={si} className="mb-8">
          <h2 className="font-[family-name:var(--font-sora)] text-lg font-semibold text-ink">{section.title}</h2>
          {section.instructions && <p className="mt-1 text-sm text-grey">{section.instructions}</p>}

          {section.groups.map((group, gi) => (
            <div key={gi} className="mt-4">
              {group.heading && (
                <div className="mb-2 text-xs font-semibold text-grey">{group.heading}</div>
              )}
              <div className="flex flex-col gap-5">
                {group.questions.map((q) => {
                  qCounter += 1;
                  return (
                    <QuestionBlock
                      key={q.id}
                      q={q}
                      answers={answers}
                      readOnly={readOnly}
                      onMcq={setMcq}
                      onWritten={setWritten}
                      onPart={setPart}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ))}

      {/* Footer */}
      {!readOnly && (
        <div className="sticky bottom-0 -mx-1 border-t border-hairline bg-paper/90 py-4 backdrop-blur">
          {error && <p className="mb-2 text-sm text-grey">{error}</p>}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-grey">
              {complete ? "All questions answered." : "Answer every question to submit."}
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={!complete || submitting}
              className="rounded-lg bg-sun px-5 py-2.5 text-sm font-medium text-ink transition disabled:opacity-40"
            >
              {submitting ? "Submitting…" : "Submit assessment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionBlock({
  q,
  answers,
  readOnly,
  onMcq,
  onWritten,
  onPart,
}: {
  q: ClientQuestion;
  answers: Record<string, number | string | Record<string, string>>;
  readOnly: boolean;
  onMcq: (qid: string, idx: number) => void;
  onWritten: (qid: string, text: string) => void;
  onPart: (qid: string, partId: string, text: string) => void;
}) {
  if (q.kind === "mcq") {
    const chosen = answers[q.id] as number | undefined;
    return (
      <div>
        <p className="text-[15px] text-ink">
          <span className="font-[family-name:var(--font-mono)] text-xs text-grey">{q.label}. </span>
          {q.prompt} <span className="text-xs text-grey">[{q.marks} mark]</span>
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {q.options.map((opt, idx) => {
            const checked = chosen === idx;
            return (
              <label
                key={idx}
                className={cn(
                  "flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm transition",
                  checked ? "border-sun bg-warm/40" : "border-hairline hover:border-grey/40",
                  readOnly && "cursor-default",
                )}
              >
                <input
                  type="radio"
                  name={q.id}
                  checked={checked}
                  disabled={readOnly}
                  onChange={() => onMcq(q.id, idx)}
                  className="mt-0.5 accent-[var(--color-sun)]"
                />
                <span className="text-ink">
                  <span className="font-[family-name:var(--font-mono)] text-xs text-grey">{LETTERS[idx]}) </span>
                  {opt}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (q.kind === "written") {
    const val = (answers[q.id] as string) ?? "";
    return (
      <div>
        <p className="text-[15px] text-ink">
          <span className="font-[family-name:var(--font-mono)] text-xs text-grey">{q.label}. </span>
          {q.prompt} <span className="text-xs text-grey">[{q.marks} marks]</span>
        </p>
        {q.guidance && <p className="mt-1 text-xs text-grey">{q.guidance}</p>}
        <textarea
          value={val}
          readOnly={readOnly}
          onChange={(e) => onWritten(q.id, e.target.value)}
          rows={5}
          placeholder={readOnly ? "" : "Your answer…"}
          className="mt-2 w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-sun read-only:text-grey"
        />
      </div>
    );
  }

  // scenario
  const obj = (answers[q.id] as Record<string, string>) || {};
  return (
    <div className="rounded-xl border border-hairline p-4">
      <p className="text-[15px] font-medium text-ink">
        <span className="font-[family-name:var(--font-mono)] text-xs text-grey">{q.label}. </span>
        {q.title} <span className="text-xs text-grey">[{q.marks} marks]</span>
      </p>
      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-warm/30 p-3 text-sm text-ink">{q.situation}</p>
      <div className="mt-3 flex flex-col gap-4">
        {q.parts.map((p) => (
          <div key={p.id}>
            <p className="text-sm text-ink">{p.prompt}</p>
            <label className="mt-1 block text-xs text-grey">{p.boxLabel}</label>
            <textarea
              value={obj[p.id] ?? ""}
              readOnly={readOnly}
              onChange={(e) => onPart(q.id, p.id, e.target.value)}
              rows={4}
              placeholder={readOnly ? "" : "Your answer…"}
              className="mt-1 w-full rounded-lg border border-hairline bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-sun read-only:text-grey"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

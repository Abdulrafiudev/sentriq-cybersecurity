"use client";

import { useEffect, useRef, useState } from "react";
import { ReportComposer, SAMPLE_EN } from "@/components/forms/ReportComposer";
import { PIPELINE_STEPS, PipelineStepper } from "@/components/forms/PipelineStepper";
import { StructuredIncidentCard } from "./StructuredIncidentCard";
import { useSubmitReport } from "@/hooks/useIncidents";
import { toApiError } from "@/services/apiClient";
import { formatDuration } from "@/lib/format";
import type { LanguageHint, TriageSubmission } from "@/types/incident";

/** How fast the stepper advances while waiting on the server, in ms per stage. */
const OPTIMISTIC_TICK_MS = 460;

/**
 * The demo-critical screen: paste a raw report, watch the pipeline, get a
 * structured incident.
 *
 * `POST /api/incidents` is a single request that returns the real per-stage
 * timings, so the stepper animates optimistically while the request is in flight
 * and then snaps to the server's actual stages. It never advances past the second
 * to last node on its own — the final step only lights up when the API answers,
 * so the UI cannot claim a result that has not happened.
 */
export function SubmitReport() {
  const [draft, setDraft] = useState(SAMPLE_EN);
  const [language, setLanguage] = useState<LanguageHint>("Auto-detect");
  const [reached, setReached] = useState(0);
  const [result, setResult] = useState<TriageSubmission | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  useEffect(() => stopTimer, []);

  const submit = useSubmitReport({
    onSuccess: (submission) => {
      stopTimer();
      setResult(submission);
      setReached(PIPELINE_STEPS.length);
    },
  });

  const run = () => {
    stopTimer();
    setResult(null);
    setReached(0);

    timer.current = setInterval(() => {
      setReached((current) => Math.min(current + 1, PIPELINE_STEPS.length - 1));
    }, OPTIMISTIC_TICK_MS);

    submit.mutate(
      { report: draft, languageHint: language },
      {
        onError: () => {
          stopTimer();
          setReached(0);
        },
      },
    );
  };

  const stages = result?.pipeline ?? [];
  const completed = Boolean(result);

  const pipelineMeta = submit.isPending
    ? "RUNNING"
    : completed
      ? `COMPLETED IN ${formatDuration(result?.analysis.processingMs ?? 0).toUpperCase()}`
      : submit.isError
        ? "FAILED"
        : "IDLE";

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-[22px] p-5 sm:p-8">
      <div className="flex flex-col gap-2">
        <div className="machine text-[10.5px] tracking-[0.14em] text-ink-faint">
          STEP 1 — INTAKE
        </div>
        <h2 className="font-display text-[30px] font-semibold tracking-[-0.03em] text-ink">
          Paste the report exactly as it arrived
        </h2>
        <p className="max-w-[620px] text-[14px] leading-[1.6] text-pretty text-ink-muted">
          No formatting rules, no required fields. Sentriq redacts personal data before
          anything else runs.
        </p>
      </div>

      <ReportComposer
        draft={draft}
        onDraftChange={setDraft}
        language={language}
        onLanguageChange={setLanguage}
        onRun={run}
        running={submit.isPending}
        completed={completed}
      />

      {submit.isError ? (
        <div className="rounded-[var(--radius-inner)] border border-critical-border bg-critical-bg px-4 py-3 text-[13px] text-critical">
          {toApiError(submit.error).message}
        </div>
      ) : null}

      <div className="flex flex-col gap-[14px]">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="machine text-[10.5px] tracking-[0.14em] text-ink-faint">
            STEP 2 — PIPELINE
          </div>
          <span className="machine text-[10.5px] text-ink-disabled">{pipelineMeta}</span>
        </div>

        <PipelineStepper reached={reached} running={submit.isPending} stages={stages} />
      </div>

      {result ? <StructuredIncidentCard result={result} /> : null}
    </div>
  );
}

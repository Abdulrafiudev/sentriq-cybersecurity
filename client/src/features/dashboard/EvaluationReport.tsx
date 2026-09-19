"use client";

import { useState } from "react";
import {
  Eyebrow,
  Panel,
  PanelHeading,
  ProgressTrack,
  Skeleton,
  FilterPill,
  ErrorState,
  EmptyState,
} from "@/components/ui/primitives";
import { useLatestEvaluation } from "@/hooks/useSystem";
import { formatPct, formatTimestamp } from "@/lib/format";
import { toApiError } from "@/services/apiClient";
import type { EvaluationFailure } from "@/types/incident";

/**
 * PRD §16 asks for a tested prototype rather than a demonstrated one, and
 * explicitly for the cases where it fails. This screen shows both: the measured
 * accuracy per stage, and every miss the harness kept.
 */
export function EvaluationReport() {
  const [metric, setMetric] = useState<string>("all");
  const evaluation = useLatestEvaluation();

  if (evaluation.isPending) {
    return (
      <div className="flex max-w-[1100px] flex-col gap-4 px-5 py-7 sm:px-8">
        <Skeleton className="h-[120px]" />
        <Skeleton className="h-[260px]" />
      </div>
    );
  }

  if (evaluation.isError) {
    return (
      <div className="px-8 py-10">
        <ErrorState
          message={toApiError(evaluation.error).message}
          onRetry={() => void evaluation.refetch()}
        />
      </div>
    );
  }

  const run = evaluation.data;

  if (!run) {
    return (
      <div className="px-5 py-7 sm:px-8">
        <Panel>
          <EmptyState
            title="No evaluation has been run yet"
            description="Run `pnpm evaluate` from the repository root. The harness replays the labelled synthetic dataset through the live pipeline and stores the result here — including every case Sentriq gets wrong."
          />
        </Panel>
      </div>
    );
  }

  const failures = run.failures ?? [];
  const visible =
    metric === "all" ? failures : failures.filter((failure) => failure.metric === metric);

  const metricKeys = ["all", ...new Set(failures.map((f) => f.metric))];

  return (
    <div className="flex max-w-[1100px] flex-col gap-5 px-5 py-7 sm:px-8">
      <div className="flex flex-col gap-2">
        <Eyebrow>Measured, not claimed</Eyebrow>
        <h2 className="font-display text-[26px] font-semibold tracking-[-0.03em] text-ink">
          Evaluation on {run.datasetSize} labelled synthetic reports
        </h2>
        <p className="max-w-[680px] text-[13.5px] leading-[1.65] text-pretty text-ink-muted">
          Every report in the dataset is invented — no real personal data. Each was replayed
          through the live pipeline and scored against its label. The failures below are kept
          deliberately: they are the honest edge of what this system can currently do.
        </p>
        <div className="machine mt-1 text-[11px] text-ink-disabled">
          RUN {formatTimestamp(run.createdAt)} · ENGINE {run.engine.toUpperCase()} · MODEL{" "}
          {run.model} · EMBEDDINGS {run.embeddingModel}
        </div>
      </div>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[14px]">
        {run.metrics.map((item) => (
          <Panel key={item.key} className="p-[18px]">
            <Eyebrow>{item.label}</Eyebrow>
            <div className="mt-[10px] font-display text-[34px] leading-none font-semibold tracking-[-0.04em] text-ink">
              {formatPct(item.accuracy, 1)}
            </div>
            <div className="machine mt-2 text-[11px] text-ink-disabled">
              {item.correct}/{item.total}
              {item.precision !== null ? ` · P ${formatPct(item.precision, 0)}` : ""}
            </div>
            <ProgressTrack
              className="mt-3"
              height={5}
              value={item.accuracy}
              barClassName={
                item.accuracy >= 85
                  ? "bg-jade-600"
                  : item.accuracy >= 65
                    ? "bg-high-bar"
                    : "bg-critical-bar"
              }
            />
            <p className="mt-3 text-[12px] leading-[1.6] text-ink-faint">{item.note}</p>
          </Panel>
        ))}
      </section>

      {run.notes.length > 0 ? (
        <Panel className="bg-sunk p-[18px]">
          <Eyebrow>How to read this</Eyebrow>
          <ul className="mt-3 flex flex-col gap-2">
            {run.notes.map((note) => (
              <li key={note} className="text-[13px] leading-[1.6] text-ink-body">
                — {note}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {run.confusion.length > 0 ? (
        <Panel className="p-5">
          <PanelHeading>Where classification slips</PanelHeading>
          <div className="mt-[14px] flex flex-wrap gap-2">
            {run.confusion.map((row) => (
              <div
                key={`${row.expected}-${row.actual}`}
                className="rounded-[var(--radius-inner)] border border-line-subtle bg-sunk px-3 py-2 text-[12.5px] text-ink-body"
              >
                {row.expected} <span className="text-ink-disabled">→</span> {row.actual}
                <span className="machine ml-2 text-[11px] text-ink-faint">×{row.count}</span>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle px-5 py-4">
          <PanelHeading>Kept failures ({failures.length})</PanelHeading>
          <div className="flex flex-wrap gap-[6px]">
            {metricKeys.map((key) => (
              <FilterPill key={key} active={metric === key} onClick={() => setMetric(key)}>
                {key === "all" ? "All" : key}
              </FilterPill>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <EmptyState title="No failures in this category" />
        ) : (
          <div className="flex flex-col">
            {visible.map((failure, index) => (
              <FailureRow key={`${failure.reportId}-${failure.metric}-${index}`} failure={failure} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function FailureRow({ failure }: { failure: EvaluationFailure }) {
  return (
    <div className="border-t border-line-subtle px-5 py-4 first:border-t-0">
      <div className="flex flex-wrap items-center gap-[10px]">
        <span className="machine text-[11px] tracking-[0.1em] text-ink-faint uppercase">
          {failure.metric}
        </span>
        <span className="machine text-[12px] text-jade-600">{failure.reportId}</span>
      </div>

      <p className="machine mt-2 text-[12.5px] leading-[1.7] text-ink-body">{failure.excerpt}</p>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[12.5px]">
        <span className="text-ink-faint">
          Expected <span className="text-ink">{failure.expected}</span>
        </span>
        <span className="text-ink-faint">
          Got <span className="text-critical">{failure.actual}</span>
        </span>
      </div>

      {failure.commentary ? (
        <p className="mt-2 text-[12.5px] leading-[1.6] text-ink-faint">{failure.commentary}</p>
      ) : null}
    </div>
  );
}

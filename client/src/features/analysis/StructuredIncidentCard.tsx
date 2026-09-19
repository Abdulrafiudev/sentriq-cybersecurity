"use client";

import Link from "next/link";
import { Eyebrow, IndicatorChip, RedactedText, SeverityBadge } from "@/components/ui/primitives";
import { formatSimilarity } from "@/lib/format";
import type { TriageSubmission } from "@/types/incident";

/** Step 3 of the submit flow: the raw paragraph, now a structured incident. */
export function StructuredIncidentCard({ result }: { result: TriageSubmission }) {
  const { incident, analysis } = result;
  const topMatch = incident.relatedIncidents[0];

  const fields: Array<{ label: string; value: string }> = [
    { label: "TYPE", value: incident.incidentType },
    { label: "CONFIDENCE", value: `${incident.confidencePct}%` },
    {
      label: "LANGUAGE",
      value:
        incident.languageHint === "Auto-detect"
          ? `Detected: ${incident.language}`
          : incident.languageHint,
    },
    { label: "INDICATORS", value: `${incident.indicators.length} extracted` },
    {
      label: "RELATED",
      value: topMatch
        ? `${topMatch.incidentId} · ${formatSimilarity(topMatch.similarityScore)}`
        : "None found",
    },
    { label: "ROUTED TO", value: incident.assignedTeam },
  ];

  return (
    <div className="flex animate-[var(--animate-sq-in)] flex-col gap-[14px]">
      <div className="machine text-[10.5px] tracking-[0.14em] text-ink-faint">
        STEP 3 — STRUCTURED INCIDENT
      </div>

      <div className="overflow-hidden rounded-[var(--radius-flow)] border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle px-5 py-[18px]">
          <div className="flex flex-wrap items-center gap-[10px]">
            <span className="machine text-[12px] text-jade-600">{incident.incidentId}</span>
            <SeverityBadge severity={incident.severity} />
            {analysis.duplicateOf ? (
              <span className="text-[12px] text-ink-faint">
                Merged as a duplicate of{" "}
                <span className="machine">{analysis.duplicateOf}</span>
              </span>
            ) : null}
          </div>
          <Link
            href={`/incidents/${incident.incidentId}`}
            className="cursor-pointer rounded-[var(--radius-control)] border border-jade-200 bg-jade-50 px-[13px] py-2 text-[12.5px] font-medium text-jade-800 transition-colors hover:bg-jade-400"
          >
            Open incident →
          </Link>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4 border-b border-line-subtle px-5 py-[18px]">
          {fields.map((field) => (
            <div key={field.label}>
              <div className="machine text-[10.5px] tracking-[0.1em] text-ink-faint">
                {field.label}
              </div>
              <div className="mt-[6px] text-[13.5px] text-ink">{field.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-[18px] px-5 py-[18px]">
          <div>
            <Eyebrow>Redacted report</Eyebrow>
            <div className="machine mt-2 text-[12.5px] leading-[1.8] text-ink-body">
              <RedactedText text={incident.redactedReport} />
            </div>
            <div className="mt-3 text-[12px] text-ink-faint">{incident.redactionNote}</div>
          </div>

          <div>
            <Eyebrow>Indicators</Eyebrow>
            {incident.indicators.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-ink-faint">
                No technical indicators in this report.
              </p>
            ) : (
              <div className="mt-[10px] flex flex-col gap-[7px]">
                {incident.indicators.map((indicator) => (
                  <div
                    key={`${indicator.type}-${indicator.value}`}
                    className="flex min-w-0 items-center gap-[10px]"
                  >
                    <IndicatorChip type={indicator.type} />
                    <span
                      title={indicator.value}
                      className="machine truncate text-[12px] text-ink-body"
                    >
                      {indicator.value}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-line-subtle bg-sunk px-5 py-3 text-[12px] text-ink-faint">
          Routed by rule <span className="machine">{analysis.routingRule.ruleId}</span> —{" "}
          {analysis.routingRule.rationale}
        </div>
      </div>
    </div>
  );
}

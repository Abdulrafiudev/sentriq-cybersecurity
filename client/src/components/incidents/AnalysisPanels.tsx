import Link from "next/link";
import { Eyebrow, Panel, PanelHeading, ProgressTrack } from "@/components/ui/primitives";
import { formatDuration, formatRelative, formatSimilarity } from "@/lib/format";
import type { Incident, RelatedIncident } from "@/types/incident";

/**
 * Jade means "the system". These three panels are everything Sentriq decided, so
 * the analysis card is the only tinted surface on the screen.
 */
export function AiAnalysisCard({ incident }: { incident: Incident }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-jade-200 bg-jade-100 p-5">
      <div className="flex items-center justify-between">
        <PanelHeading>AI analysis</PanelHeading>
        <span
          title={
            incident.analysisEngine === "llm"
              ? "GPT classification, cross-checked against the rule engine"
              : "Rule engine only — no model key configured"
          }
          className="machine text-[10.5px] text-jade-800"
        >
          {incident.confidencePct}% CONF.
        </span>
      </div>

      <div className="mt-3 font-display text-[22px] font-semibold tracking-[-0.03em] text-ink">
        {incident.incidentType}
      </div>

      <p className="mt-3 text-[13px] leading-[1.65] text-pretty text-ink-body">
        {incident.classificationExplanation}
      </p>

      <SecondOpinionNote secondOpinion={incident.secondOpinion} />

      <div className="mt-4 border-t border-jade-300 pt-4">
        <div className="machine text-[10.5px] tracking-[0.12em] text-jade-700">
          SEVERITY RATIONALE
        </div>
        <p className="mt-2 text-[13px] leading-[1.65] text-pretty text-ink-body">
          {incident.severityReason}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-jade-300 pt-4">
        <Meta label="ENGINE" value={incident.analysisEngine === "llm" ? "GPT + rules" : "Rules only"} />
        <Meta label="LANGUAGE" value={incident.language} />
        <Meta label="TRIAGED IN" value={formatDuration(incident.processingMs)} />
      </div>
    </div>
  );
}

/**
 * The rule engine's independent read.
 *
 * Deliberately a flag rather than a penalty on the confidence score. The rule
 * engine's own "confidence" is a keyword-weight score, not a probability, so
 * folding it into the published number made that number mean less — and it
 * marked down correct answers whenever the keywords caught an earlier stage of
 * the same attack. The analyst gets the same warning without the distortion.
 *
 * Neutral grey on purpose: this is an informational note, and the palette
 * reserves severity hues for severity and jade for the system's own confidence.
 */
function SecondOpinionNote({ secondOpinion }: { secondOpinion: Incident["secondOpinion"] }) {
  if (!secondOpinion || secondOpinion.agreed) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[var(--radius-inner)] border border-status-merged-border bg-status-merged-bg px-3 py-2">
      <span className="machine text-[10px] tracking-[0.1em] text-status-merged">
        SECOND OPINION
      </span>
      <span className="text-[12.5px] text-ink-body">
        The rule engine read this as <span className="font-medium">{secondOpinion.category}</span>.
        Worth a look.
      </span>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="machine text-[10px] tracking-[0.1em] text-jade-700">{label}</div>
      <div className="mt-[2px] text-[12.5px] text-ink-body">{value}</div>
    </div>
  );
}

export function RelatedIncidentsCard({
  related,
  loading,
}: {
  related: RelatedIncident[];
  loading?: boolean;
}) {
  return (
    <Panel className="p-5">
      <PanelHeading>Related incidents</PanelHeading>

      {loading ? (
        <p className="mt-3 text-[13px] text-ink-faint">Searching…</p>
      ) : related.length === 0 ? (
        <p className="mt-3 text-[13px] text-ink-faint">
          Nothing above the similarity threshold. This report looks like a first sighting.
        </p>
      ) : (
        <div className="mt-[14px] flex flex-col gap-2">
          {related.map((match) => (
            <Link
              key={match.incidentId}
              href={`/incidents/${match.incidentId}`}
              className="block rounded-[var(--radius-inner)] border border-line-subtle bg-sunk p-3 transition-colors hover:border-line hover:bg-hover"
            >
              <div className="flex items-center justify-between gap-[10px]">
                <span className="machine text-[12px] text-jade-600">{match.incidentId}</span>
                <span className="machine text-[11.5px] text-ink-faint">
                  {formatSimilarity(match.similarityScore)}
                </span>
              </div>
              <div className="mt-2 text-[12.5px] text-pretty text-ink-body">{match.title}</div>
              <ProgressTrack
                className="mt-[10px] bg-[#EDECE7]"
                height={4}
                value={match.similarityScore * 100}
                barClassName="bg-jade-600"
              />
            </Link>
          ))}
        </div>
      )}
    </Panel>
  );
}

export function RoutedToCard({ team, routedAt }: { team: string; routedAt?: string }) {
  return (
    <Panel className="p-5">
      <Eyebrow>Routed to</Eyebrow>
      <div className="mt-[10px] flex items-center gap-[10px]">
        <span className="size-2 rounded-full bg-jade-600" />
        <span className="font-display text-base font-semibold text-ink">{team}</span>
      </div>
      <div className="mt-2 text-[12.5px] text-ink-faint">
        {/* Routing happens inside the pipeline run, so it shares the incident's
            timestamp. Sentriq does not track team acknowledgement — claiming it
            here would be inventing a fact the system never observes. */}
        Assigned automatically at triage
        {routedAt ? `, ${formatRelative(routedAt)}` : ""}
      </div>
    </Panel>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useIncident, useRelatedIncidents, useUpdateIncident } from "@/hooks/useIncidents";
import { usePageMeta } from "@/components/layout/PageMeta";
import { ReportCard } from "@/components/incidents/ReportCard";
import { IndicatorList } from "@/components/incidents/IndicatorList";
import {
  AiAnalysisCard,
  RelatedIncidentsCard,
  RoutedToCard,
} from "@/components/incidents/AnalysisPanels";
import {
  Button,
  ErrorState,
  SeverityBadge,
  Skeleton,
  StatusPill,
} from "@/components/ui/primitives";
import { formatTimestamp } from "@/lib/format";
import { toApiError } from "@/services/apiClient";
import { RESPONSE_TEAMS, type ResponseTeam } from "@/types/incident";

/** Everything the pipeline decided about one report, and the two actions on it. */
export function IncidentDetail({ incidentId }: { incidentId: string }) {
  const router = useRouter();
  const incident = useIncident(incidentId);
  const related = useRelatedIncidents(incidentId);
  const update = useUpdateIncident(incidentId);

  usePageMeta({
    title: "Incident detail",
    meta: incident.data ? `${incident.data.incidentId} · ${incident.data.assignedTeam}` : null,
  });

  if (incident.isError) {
    return (
      <div className="px-8 py-10">
        <ErrorState
          title="Incident unavailable"
          message={toApiError(incident.error).message}
          onRetry={() => void incident.refetch()}
        />
      </div>
    );
  }

  if (incident.isPending || !incident.data) {
    return (
      <div className="flex max-w-[1240px] flex-col gap-[18px] px-5 py-6 sm:px-8">
        <Skeleton className="h-[34px] w-[110px]" />
        <Skeleton className="h-[90px]" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-[14px]">
          <Skeleton className="h-[320px]" />
          <Skeleton className="h-[320px]" />
        </div>
      </div>
    );
  }

  const data = incident.data;

  // Reassignment cycles through the teams. A full picker is the obvious next
  // step, but the routing rules already decide this in almost every case.
  const reassign = () => {
    const current = RESPONSE_TEAMS.indexOf(data.assignedTeam);
    const next = RESPONSE_TEAMS[(current + 1) % RESPONSE_TEAMS.length] as ResponseTeam;
    update.mutate(
      { assignedTeam: next, status: "In review" },
      { onSuccess: () => toast.success(`${data.incidentId} reassigned to ${next}`) },
    );
  };

  const escalate = () =>
    update.mutate(
      { severity: "Critical", status: "In review" },
      { onSuccess: () => toast.success(`${data.incidentId} escalated to Critical`) },
    );

  return (
    <div className="flex max-w-[1240px] flex-col gap-[18px] px-5 py-6 sm:px-8">
      <button
        type="button"
        onClick={() => router.push("/incidents")}
        className="machine w-fit cursor-pointer rounded-lg border border-line bg-surface px-3 py-[7px] text-[12px] text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
      >
        ← QUEUE
      </button>

      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-[10px]">
            <span className="machine text-[12px] text-jade-600">{data.incidentId}</span>
            <SeverityBadge severity={data.severity} />
            <StatusPill status={data.status} />
            <span className="machine text-[11px] text-ink-disabled">
              {formatTimestamp(data.createdAt)}
            </span>
          </div>
          <h2 className="mt-[10px] font-display text-[26px] font-semibold tracking-[-0.03em] text-pretty text-ink">
            {data.title}
          </h2>
          {data.mergedInto ? (
            <p className="mt-2 text-[12.5px] text-ink-faint">
              Merged into{" "}
              <a href={`/incidents/${data.mergedInto}`} className="machine">
                {data.mergedInto}
              </a>{" "}
              as a duplicate.
            </p>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={reassign} disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Reassign"}
          </Button>
          <Button
            variant="escalate"
            onClick={escalate}
            disabled={update.isPending || data.severity === "Critical"}
          >
            Escalate
          </Button>
        </div>
      </div>

      {update.isError ? (
        <p className="text-[12.5px] text-critical">{toApiError(update.error).message}</p>
      ) : null}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-[14px]">
        <div className="flex min-w-0 flex-col gap-[14px]">
          <ReportCard
            redactedReport={data.redactedReport}
            redactionNote={data.redactionNote}
          />
          <IndicatorList indicators={data.indicators} />
        </div>

        <div className="flex min-w-0 flex-col gap-[14px]">
          <AiAnalysisCard incident={data} />
          <RelatedIncidentsCard related={related.data ?? []} loading={related.isPending} />
          <RoutedToCard team={data.assignedTeam} routedAt={data.createdAt} />
        </div>
      </div>
    </div>
  );
}

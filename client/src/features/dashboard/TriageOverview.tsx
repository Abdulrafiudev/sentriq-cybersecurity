"use client";

import { useState } from "react";
import Link from "next/link";
import { useDashboardStats } from "@/hooks/useDashboard";
import { useIncidents } from "@/hooks/useIncidents";
import { StatCard } from "@/components/dashboard/StatCard";
import { SeverityChart } from "@/components/charts/SeverityChart";
import { CategoryDistribution } from "@/components/charts/CategoryDistribution";
import { IncidentTable } from "@/components/incidents/IncidentTable";
import {
  ErrorState,
  FilterPill,
  Panel,
  PanelHeading,
  Skeleton,
} from "@/components/ui/primitives";
import { formatNumber, formatPct } from "@/lib/format";
import { toApiError } from "@/services/apiClient";
import type { QueueFilter } from "@/types/incident";

const FILTERS: QueueFilter[] = ["All", "Critical", "High", "Unreviewed"];

/** What needs attention right now — the first screen an analyst opens. */
export function TriageOverview() {
  const [filter, setFilter] = useState<QueueFilter>("All");
  const stats = useDashboardStats();
  const queue = useIncidents({ filter, sort: "severity", limit: 8 });

  if (stats.isError) {
    return (
      <div className="px-8 py-10">
        <ErrorState message={toApiError(stats.error).message} onRetry={() => void stats.refetch()} />
      </div>
    );
  }

  const totals = stats.data?.totals;

  return (
    <div className="flex max-w-[1360px] flex-col gap-5 px-5 py-7 sm:px-8">
      <section className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-[14px]">
        {stats.isPending || !totals ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[132px] rounded-[var(--radius-card)]" />
          ))
        ) : (
          <>
            <StatCard
              label="Total incidents"
              value={formatNumber(totals.total)}
              sub={`+${formatNumber(totals.last24h)} in last 24h`}
            />
            <StatCard
              label="Critical"
              value={formatNumber(totals.critical)}
              sub={`${formatNumber(totals.criticalAwaitingAnalyst)} awaiting analyst`}
              tone="critical"
            />
            <StatCard
              label="High severity"
              value={formatNumber(totals.high)}
              sub={`${formatNumber(totals.highRoutedToIdentity)} routed to Identity`}
              tone="high"
            />
            <StatCard
              label="Duplicates merged"
              value={formatNumber(totals.duplicatesMerged)}
              sub={`${formatPct(totals.duplicatePct)} of intake volume`}
              tone="jade"
            />
          </>
        )}
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-[14px]">
        {stats.isPending || !stats.data ? (
          <>
            <Skeleton className="h-[250px] rounded-[var(--radius-card)]" />
            <Skeleton className="h-[250px] rounded-[var(--radius-card)]" />
          </>
        ) : (
          <>
            <SeverityChart rows={stats.data.severity} meta="ALL TIME" />
            <CategoryDistribution
              categories={stats.data.categories}
              meta={stats.data.pipeline.engine === "llm" ? "GPT + RULES" : "RULES ENGINE"}
            />
          </>
        )}
      </section>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle px-5 py-4">
          <PanelHeading>Priority queue</PanelHeading>
          <div className="flex flex-wrap gap-[6px]">
            {FILTERS.map((option) => (
              <FilterPill
                key={option}
                active={filter === option}
                onClick={() => setFilter(option)}
              >
                {option}
              </FilterPill>
            ))}
          </div>
        </div>

        <IncidentTable
          incidents={queue.data?.items ?? []}
          loading={queue.isPending}
          emptyMessage={
            filter === "All"
              ? "No incidents yet. Submit a report to see the pipeline run."
              : `Nothing in the queue matches “${filter}”.`
          }
        />

        {(queue.data?.pagination.total ?? 0) > (queue.data?.items.length ?? 0) ? (
          <div className="border-t border-line-subtle px-5 py-3 text-[12.5px] text-ink-faint">
            Showing {queue.data?.items.length} of {formatNumber(queue.data?.pagination.total ?? 0)}.{" "}
            <Link href="/incidents" className="font-medium">
              Open the full queue →
            </Link>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

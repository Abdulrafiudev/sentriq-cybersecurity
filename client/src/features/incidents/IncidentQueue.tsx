"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useIncidents } from "@/hooks/useIncidents";
import { IncidentTable } from "@/components/incidents/IncidentTable";
import {
  Button,
  ErrorState,
  FilterPill,
  Panel,
  PanelHeading,
} from "@/components/ui/primitives";
import { formatNumber } from "@/lib/format";
import { toApiError } from "@/services/apiClient";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_STATUSES,
  RESPONSE_TEAMS,
  SEVERITY_LEVELS,
  type IncidentCategory,
  type IncidentStatus,
  type QueueSort,
  type ResponseTeam,
  type Severity,
} from "@/types/incident";

const SORT_LABELS: Record<QueueSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  severity: "Severity",
  confidence: "Confidence",
};

const selectClass =
  "cursor-pointer rounded-[var(--radius-pill)] border border-[#dfded8] bg-surface px-[10px] py-[6px] text-[12px] text-ink-muted hover:text-ink focus:border-jade-600";

/**
 * The full queue (PRD §4): search plus severity, category, status and team
 * filters with sorting. Filter state lives in the URL so an analyst can send a
 * colleague exactly the view they are looking at.
 */
export function IncidentQueue() {
  const router = useRouter();
  const params = useSearchParams();

  const severity = useMemo(() => readList<Severity>(params.get("severity")), [params]);
  const category = useMemo(() => readList<IncidentCategory>(params.get("category")), [params]);
  const status = useMemo(() => readList<IncidentStatus>(params.get("status")), [params]);
  const team = useMemo(() => readList<ResponseTeam>(params.get("team")), [params]);
  // Severity first by default: the queue exists to answer "what do I work on
  // next", and newest-first buries a Critical from this morning under an hour of
  // password-reset reports.
  const sort = (params.get("sort") as QueueSort | null) ?? "severity";
  const page = Number(params.get("page") ?? 1);
  const urlSearch = params.get("search") ?? "";

  // Local mirror so typing stays responsive; the URL catches up on a debounce.
  // When the URL changes from elsewhere (back button, Clear filters) the draft is
  // reset during render rather than in an effect, so there is no stale frame.
  const [searchDraft, setSearchDraft] = useState(urlSearch);
  const [lastUrlSearch, setLastUrlSearch] = useState(urlSearch);
  if (lastUrlSearch !== urlSearch) {
    setLastUrlSearch(urlSearch);
    setSearchDraft(urlSearch);
  }

  const setParams = useCallback(
    (updates: Record<string, string | string[] | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value.length === 0) next.delete(key);
        else next.set(key, Array.isArray(value) ? value.join(",") : value);
      }
      // Any filter change invalidates the current page number.
      if (!("page" in updates)) next.delete("page");
      router.replace(`/incidents?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  useEffect(() => {
    if (searchDraft === urlSearch) return;
    const timer = setTimeout(() => setParams({ search: searchDraft || null }), 300);
    return () => clearTimeout(timer);
  }, [searchDraft, urlSearch, setParams]);

  const query = { search: urlSearch, severity, category, status, team, sort, page, limit: 25 };
  const incidents = useIncidents(query);
  const pagination = incidents.data?.pagination;

  const activeFilters =
    severity.length + category.length + status.length + team.length + (urlSearch ? 1 : 0);

  const toggle = <T extends string>(current: T[], value: T) =>
    current.includes(value) ? current.filter((v) => v !== value) : [...current, value];

  return (
    <div className="flex max-w-[1360px] flex-col gap-4 px-5 py-7 sm:px-8">
      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line-subtle bg-sunk px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PanelHeading>
              {pagination
                ? `${formatNumber(pagination.total)} incident${pagination.total === 1 ? "" : "s"}`
                : "Incident queue"}
            </PanelHeading>

            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search ID, title, report text or indicator…"
              className="w-full max-w-[340px] rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 py-[8px] text-[13px] text-ink outline-none placeholder:text-ink-disabled focus:border-jade-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-[6px]">
            {SEVERITY_LEVELS.map((level) => (
              <FilterPill
                key={level}
                active={severity.includes(level)}
                onClick={() => setParams({ severity: toggle(severity, level) })}
              >
                {level}
              </FilterPill>
            ))}

            <span className="mx-1 h-4 w-px bg-line" />

            <select
              aria-label="Filter by category"
              value={category[0] ?? ""}
              onChange={(event) => setParams({ category: event.target.value ? [event.target.value] : null })}
              className={selectClass}
            >
              <option value="">All categories</option>
              {INCIDENT_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by status"
              value={status[0] ?? ""}
              onChange={(event) => setParams({ status: event.target.value ? [event.target.value] : null })}
              className={selectClass}
            >
              <option value="">All statuses</option>
              {INCIDENT_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by team"
              value={team[0] ?? ""}
              onChange={(event) => setParams({ team: event.target.value ? [event.target.value] : null })}
              className={selectClass}
            >
              <option value="">All teams</option>
              {RESPONSE_TEAMS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              aria-label="Sort incidents"
              value={sort}
              onChange={(event) => setParams({ sort: event.target.value })}
              className={selectClass}
            >
              {(Object.keys(SORT_LABELS) as QueueSort[]).map((option) => (
                <option key={option} value={option}>
                  {SORT_LABELS[option]}
                </option>
              ))}
            </select>

            {activeFilters > 0 ? (
              <button
                type="button"
                onClick={() => router.replace("/incidents", { scroll: false })}
                className="cursor-pointer text-[12px] text-ink-muted underline underline-offset-[3px] hover:text-ink"
              >
                Clear {activeFilters} filter{activeFilters === 1 ? "" : "s"}
              </button>
            ) : null}
          </div>
        </div>

        {incidents.isError ? (
          <ErrorState
            message={toApiError(incidents.error).message}
            onRetry={() => void incidents.refetch()}
          />
        ) : (
          <IncidentTable incidents={incidents.data?.items ?? []} loading={incidents.isPending} />
        )}

        {pagination && pagination.pages > 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-line-subtle px-5 py-3">
            <span className="machine text-[11.5px] text-ink-faint">
              PAGE {pagination.page} / {pagination.pages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={pagination.page <= 1}
                onClick={() => setParams({ page: String(pagination.page - 1) })}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setParams({ page: String(pagination.page + 1) })}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

function readList<T extends string>(raw: string | null): T[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean) as T[];
}

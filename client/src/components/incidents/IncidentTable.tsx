"use client";

import { useRouter } from "next/navigation";
import { SeverityBadge, Skeleton, StatusPill } from "@/components/ui/primitives";
import type { Incident } from "@/types/incident";

const COLUMNS = ["ID", "TITLE", "CATEGORY", "SEVERITY", "CONF.", "TEAM", "STATUS"] as const;

/**
 * The priority queue. A whole row is the click target — analysts scan titles, not
 * IDs — with a real link on the ID so middle-click and copy-link still work.
 */
export function IncidentTable({
  incidents,
  loading,
  emptyMessage = "No incidents match these filters.",
}: {
  incidents: Incident[];
  loading?: boolean;
  emptyMessage?: string;
}) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex flex-col gap-[1px]">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[52px] rounded-none" />
        ))}
      </div>
    );
  }

  if (incidents.length === 0) {
    return <div className="px-5 py-12 text-center text-[13px] text-ink-faint">{emptyMessage}</div>;
  }

  return (
    <div className="no-scrollbar overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse">
        <thead>
          <tr className="machine bg-sunk text-left text-[10px] tracking-[0.12em] text-ink-faint">
            {COLUMNS.map((column, index) => (
              <th
                key={column}
                scope="col"
                className={
                  index === 0 || index === COLUMNS.length - 1
                    ? "px-5 py-[11px] font-medium"
                    : "px-3 py-[11px] font-medium"
                }
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <tr
              key={incident.incidentId}
              onClick={() => router.push(`/incidents/${incident.incidentId}`)}
              className="cursor-pointer border-t border-line-subtle transition-colors hover:bg-sunk"
            >
              <td className="machine px-5 py-[15px] text-[12px] whitespace-nowrap text-ink-faint">
                {incident.incidentId}
              </td>
              <td className="px-3 py-[15px] text-[13.5px] text-ink">{incident.title}</td>
              <td className="px-3 py-[15px] text-[12.5px] whitespace-nowrap text-ink-muted">
                {incident.incidentType}
              </td>
              <td className="px-3 py-[15px] whitespace-nowrap">
                <SeverityBadge severity={incident.severity} />
              </td>
              <td className="machine px-3 py-[15px] text-[12px] whitespace-nowrap text-ink-muted">
                {incident.confidencePct}%
                {/* Analysts scan the queue rather than opening every case, so a
                    disagreement between the two engines has to be visible here. */}
                {incident.secondOpinion && !incident.secondOpinion.agreed ? (
                  <span
                    title={`The rule engine read this as ${incident.secondOpinion.category}`}
                    className="ml-[5px] text-status-merged"
                  >
                    ⚑
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-[15px] text-[12.5px] whitespace-nowrap text-ink-muted">
                {incident.assignedTeam}
              </td>
              <td className="px-5 py-[15px] whitespace-nowrap">
                <StatusPill status={incident.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import {
  Eyebrow,
  ErrorState,
  Panel,
  PanelHeading,
  SeverityBadge,
  Skeleton,
} from "@/components/ui/primitives";
import { useRoutingRules } from "@/hooks/useSystem";
import { formatNumber } from "@/lib/format";
import { toApiError } from "@/services/apiClient";

/**
 * Routing is pure policy with no model in the loop, so it is shown as readable
 * rules an analyst can argue with rather than a black box. Rules are ordered and
 * the first match wins.
 */
export function RoutingRulesView() {
  const routing = useRoutingRules();

  if (routing.isPending) {
    return (
      <div className="flex max-w-[1100px] flex-col gap-4 px-5 py-7 sm:px-8">
        <Skeleton className="h-[110px]" />
        <Skeleton className="h-[380px]" />
      </div>
    );
  }

  if (routing.isError) {
    return (
      <div className="px-8 py-10">
        <ErrorState
          message={toApiError(routing.error).message}
          onRetry={() => void routing.refetch()}
        />
      </div>
    );
  }

  const { rules, teams } = routing.data;

  return (
    <div className="flex max-w-[1100px] flex-col gap-5 px-5 py-7 sm:px-8">
      <div className="flex flex-col gap-2">
        <Eyebrow>Deterministic, in order</Eyebrow>
        <h2 className="font-display text-[26px] font-semibold tracking-[-0.03em] text-ink">
          How an incident finds its team
        </h2>
        <p className="max-w-[680px] text-[13.5px] leading-[1.65] text-pretty text-ink-muted">
          Routing runs after classification and severity, and never involves the model. The
          first rule whose category matches — and whose severity floor is met — wins.
        </p>
      </div>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-[14px]">
        {teams.map((team) => (
          <Panel key={team.team} className="p-[18px]">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-jade-600" />
              <span className="text-[13px] text-ink-body">{team.team}</span>
            </div>
            <div className="mt-[10px] font-display text-[30px] leading-none font-semibold tracking-[-0.04em] text-ink">
              {formatNumber(team.count)}
            </div>
            <div className="mt-2 text-[12px] text-ink-faint">incidents currently assigned</div>
          </Panel>
        ))}
      </section>

      <Panel className="overflow-hidden">
        <div className="border-b border-line-subtle px-5 py-4">
          <PanelHeading>Rule set</PanelHeading>
        </div>

        <div className="no-scrollbar overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="machine bg-sunk text-left text-[10px] tracking-[0.12em] text-ink-faint">
                <th className="px-5 py-[11px] font-medium">#</th>
                <th className="px-3 py-[11px] font-medium">RULE</th>
                <th className="px-3 py-[11px] font-medium">CATEGORY</th>
                <th className="px-3 py-[11px] font-medium">MIN SEVERITY</th>
                <th className="px-3 py-[11px] font-medium">TEAM</th>
                <th className="px-5 py-[11px] font-medium">WHY</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule, index) => (
                <tr key={rule.id} className="border-t border-line-subtle align-top">
                  <td className="machine px-5 py-[14px] text-[12px] text-ink-disabled">
                    {index + 1}
                  </td>
                  <td className="machine px-3 py-[14px] text-[12px] whitespace-nowrap text-jade-600">
                    {rule.id}
                  </td>
                  <td className="px-3 py-[14px] text-[12.5px] whitespace-nowrap text-ink">
                    {rule.category}
                  </td>
                  <td className="px-3 py-[14px] whitespace-nowrap">
                    {rule.minSeverity ? (
                      <SeverityBadge severity={rule.minSeverity} />
                    ) : (
                      <span className="text-[12.5px] text-ink-disabled">any</span>
                    )}
                  </td>
                  <td className="px-3 py-[14px] text-[12.5px] whitespace-nowrap text-ink-body">
                    {rule.team}
                  </td>
                  <td className="max-w-[360px] px-5 py-[14px] text-[12.5px] leading-[1.6] text-ink-faint">
                    {rule.rationale}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

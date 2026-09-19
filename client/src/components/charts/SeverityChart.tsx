import { Panel, PanelHeading, ProgressTrack } from "@/components/ui/primitives";
import { SEVERITY_BAR } from "@/config/tokens";
import { formatNumber } from "@/lib/format";
import type { Severity } from "@/types/incident";

/**
 * Horizontal bars rather than a donut: severity is ordinal and analysts compare
 * counts, which a shared baseline makes exact and an angle does not.
 *
 * Bars are scaled against the largest band, not the total, so a queue dominated
 * by Low incidents still shows a readable Critical bar.
 */
export function SeverityChart({
  rows,
  meta = "ALL TIME",
}: {
  rows: Array<{ level: Severity; count: number; pct: number }>;
  meta?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between">
        <PanelHeading>Incidents by severity</PanelHeading>
        <span className="machine text-[10.5px] text-ink-disabled">{meta}</span>
      </div>

      <div className="mt-[18px] flex flex-col gap-[14px]">
        {rows.map((row) => (
          <div key={row.level} className="flex flex-col gap-[7px]">
            <div className="flex justify-between text-[12.5px]">
              <span className="text-ink-body">{row.level}</span>
              <span className="machine text-ink-faint">{formatNumber(row.count)}</span>
            </div>
            <ProgressTrack
              value={(row.count / max) * 100}
              barClassName={SEVERITY_BAR[row.level]}
            />
          </div>
        ))}
      </div>
    </Panel>
  );
}

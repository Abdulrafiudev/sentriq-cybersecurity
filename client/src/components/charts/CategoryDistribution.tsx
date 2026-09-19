import Link from "next/link";
import { Panel, PanelHeading } from "@/components/ui/primitives";
import { formatNumber, formatPct } from "@/lib/format";
import type { IncidentCategory } from "@/types/incident";

/** Short labels for the two categories that do not fit a tile at 130px. */
const SHORT_LABEL: Partial<Record<IncidentCategory, string>> = {
  "Fraud / Social Engineering": "Fraud / Soc. Eng.",
};

/**
 * A tile grid rather than a pie: eight categories is past the point where angles
 * are comparable, and each tile doubles as a filter link into the queue.
 */
export function CategoryDistribution({
  categories,
  meta = "CLASSIFIER",
}: {
  categories: Array<{ name: IncidentCategory; count: number; pct: number }>;
  meta?: string;
}) {
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between">
        <PanelHeading>Category distribution</PanelHeading>
        <span className="machine text-[10.5px] text-ink-disabled">{meta}</span>
      </div>

      <div className="mt-[18px] grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-[10px]">
        {categories.map((category) => (
          <Link
            key={category.name}
            href={`/incidents?category=${encodeURIComponent(category.name)}`}
            className="rounded-[var(--radius-inner)] border border-line-subtle bg-sunk px-3 py-[11px] transition-colors hover:border-line hover:bg-hover"
          >
            <div className="text-[12.5px] text-ink-body">
              {SHORT_LABEL[category.name] ?? category.name}
            </div>
            <div className="mt-[6px] flex items-baseline gap-[6px]">
              <span className="font-display text-[20px] font-semibold tracking-[-0.03em] text-ink">
                {formatNumber(category.count)}
              </span>
              <span className="machine text-[10.5px] text-ink-disabled">
                {formatPct(category.pct)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

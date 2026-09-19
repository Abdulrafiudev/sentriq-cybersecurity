import { IndicatorChip, Panel, PanelHeading } from "@/components/ui/primitives";
import type { Indicator } from "@/types/incident";

/**
 * Indicators are the part of an incident an analyst copies into a blocklist, so
 * the value is never wrapped or prettified — it truncates and keeps the full
 * string in the title attribute.
 */
export function IndicatorList({ indicators }: { indicators: Indicator[] }) {
  return (
    <Panel className="p-5">
      <div className="flex items-center justify-between">
        <PanelHeading>Extracted indicators</PanelHeading>
        <span className="machine text-[10.5px] text-ink-disabled">
          {indicators.length} FOUND
        </span>
      </div>

      {indicators.length === 0 ? (
        <p className="mt-3 text-[13px] text-ink-faint">
          No technical indicators in this report. That is common for social-engineering
          incidents, where the only evidence is the conversation itself.
        </p>
      ) : (
        <div className="mt-[14px] flex flex-col gap-2">
          {indicators.map((indicator) => (
            <div
              key={`${indicator.type}-${indicator.value}`}
              className="flex min-w-0 items-center gap-3 rounded-[10px] border border-line-subtle bg-sunk px-3 py-[10px]"
            >
              <IndicatorChip type={indicator.type} />
              <span
                title={indicator.value}
                className="machine truncate text-[12.5px] text-ink-body"
              >
                {indicator.value}
              </span>
              <span
                title={
                  indicator.source === "rules"
                    ? "Matched by a deterministic pattern, independently of the model"
                    : "Identified by the language model from context"
                }
                className="machine ml-auto shrink-0 text-[10px] tracking-[0.1em] text-ink-disabled"
              >
                {indicator.source === "rules" ? "RULE" : "LLM"}
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

import { cn } from "@/lib/utils";
import type { PipelineStage } from "@/types/incident";

export const PIPELINE_STEPS: Array<{ key: PipelineStage["key"]; label: string }> = [
  { key: "received", label: "Received" },
  { key: "redaction", label: "Redaction" },
  { key: "classify", label: "Classify" },
  { key: "indicators", label: "Indicators" },
  { key: "severity", label: "Severity" },
  { key: "similarity", label: "Similarity" },
  { key: "routing", label: "Routing" },
];

/**
 * The seven pipeline stages, in order.
 *
 * `reached` is how far the run has visibly progressed; `stages` is what the server
 * actually reported. While a request is in flight the stepper advances on its own
 * so the screen is not frozen, but every note stays "—" until the real stage data
 * comes back — the UI never invents a result it has not been told.
 */
export function PipelineStepper({
  reached,
  running,
  stages,
}: {
  reached: number;
  running: boolean;
  stages: PipelineStage[];
}) {
  const byKey = new Map(stages.map((stage) => [stage.key, stage]));
  const last = PIPELINE_STEPS.length - 1;

  return (
    <div className="no-scrollbar overflow-x-auto rounded-[var(--radius-flow)] border border-line bg-surface px-[18px] py-[22px]">
      <div className="flex min-w-[700px] items-start">
        {PIPELINE_STEPS.map((step, index) => {
          const state = index < reached ? "done" : index === reached && running ? "active" : "idle";
          const stage = byKey.get(step.key);

          return (
            <div
              key={step.key}
              className="relative flex flex-1 flex-col items-center gap-[10px] px-1"
            >
              <div
                aria-hidden
                className={cn(
                  "absolute top-2 h-[2px]",
                  index < reached ? "bg-jade-600" : "bg-line",
                )}
                style={{
                  left: index === 0 ? "50%" : 0,
                  right: index === last ? "50%" : 0,
                }}
              />
              <div
                className={cn(
                  "relative size-[18px] rounded-full",
                  state === "done" && "bg-jade-600 shadow-[0_0_0_3px_var(--color-jade-50)]",
                  state === "active" &&
                    "animate-[var(--animate-sq-pulse-fast)] bg-surface shadow-[inset_0_0_0_2.5px_var(--color-jade-600),0_0_0_3px_var(--color-jade-50)]",
                  state === "idle" &&
                    "bg-surface shadow-[inset_0_0_0_2px_var(--color-line-strong)]",
                )}
              />
              <div
                className={cn(
                  "text-center text-[12.5px] font-medium",
                  state === "idle" ? "text-ink-disabled" : "text-ink",
                )}
              >
                {step.label}
              </div>
              <div className="machine text-center text-[10.5px] text-ink-disabled">
                {stage?.note ?? "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

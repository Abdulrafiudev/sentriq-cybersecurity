import { cn } from "@/lib/utils";

/**
 * Four of these sit above the charts. The critical variant is the only stat that
 * is allowed to shout — it carries the severity tint so the eye lands there first.
 */
export function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "default" | "critical" | "high" | "jade";
}) {
  const critical = tone === "critical";

  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border p-[18px]",
        critical ? "border-critical-border bg-critical-bg" : "border-line bg-surface",
      )}
    >
      <div className={cn("eyebrow", critical && "text-critical")}>{label}</div>
      <div
        className={cn(
          "mt-[10px] font-display text-[40px] leading-none font-semibold tracking-[-0.04em]",
          tone === "critical" && "text-critical",
          tone === "high" && "text-high",
          tone === "jade" && "text-jade-600",
          tone === "default" && "text-ink",
        )}
      >
        {value}
      </div>
      <div className={cn("mt-2 text-[12px]", critical ? "text-critical-sub" : "text-ink-faint")}>
        {sub}
      </div>
    </div>
  );
}

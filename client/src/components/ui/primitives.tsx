import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SEVERITY_CLASSES, SEVERITY_RULE, STATUS_CLASSES } from "@/config/tokens";
import type { IncidentStatus, IndicatorType, Severity } from "@/types/incident";

/**
 * The primitive layer from the design system sheet: badges, pills, chips, cards,
 * eyebrows and buttons. Screens compose these and never restate the tokens.
 */

// --- Surfaces --------------------------------------------------------------

/** Flat by rule — 1px line, no shadow. Only popovers and drawers lift. */
export function Panel({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-[var(--radius-card)] border border-line bg-surface", className)}
      {...props}
    />
  );
}

export function PanelHeading({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("font-display text-[15px] font-semibold", className)} {...props} />;
}

export function Eyebrow({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("eyebrow", className)} {...props} />;
}

/** Every machine-generated value goes through here, or through `font-mono`. */
export function Mono({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn("machine", className)} {...props} />;
}

// --- Badges ----------------------------------------------------------------

export function SeverityBadge({
  severity,
  className,
  title,
}: {
  severity: Severity;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title ?? SEVERITY_RULE[severity]}
      className={cn(
        "machine inline-block rounded-[var(--radius-chip)] border px-2 py-[3px] text-[10.5px] uppercase tracking-[0.09em]",
        SEVERITY_CLASSES[severity],
        className,
      )}
    >
      {severity}
    </span>
  );
}

export function StatusPill({
  status,
  className,
}: {
  status: IncidentStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-full border px-[9px] py-[3px] text-[11.5px] whitespace-nowrap",
        STATUS_CLASSES[status],
        className,
      )}
    >
      {status}
    </span>
  );
}

export function IndicatorChip({
  type,
  className,
}: {
  type: IndicatorType | string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "machine shrink-0 rounded-[5px] border border-jade-200 bg-jade-50 px-[6px] py-[3px] text-[10px] tracking-[0.1em] text-jade-800",
        className,
      )}
    >
      {type}
    </span>
  );
}

/** Highlights `[REDACTED]`-style tokens inside a report body. */
export function RedactedText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\[[A-Z_]+\])/g);
  return (
    <span className={className}>
      {parts.map((part, index) =>
        /^\[[A-Z_]+\]$/.test(part) ? (
          <span
            key={`${part}-${index}`}
            className="rounded-[4px] border border-violet-border bg-violet-bg px-[3px] text-violet"
          >
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </span>
  );
}

// --- Buttons ---------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "escalate" | "tinted" | "ghost";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-0 bg-jade-600 text-white font-semibold hover:bg-jade-800",
  secondary: "border border-line-strong bg-surface text-ink font-medium hover:bg-hover",
  escalate:
    "border border-critical-border bg-critical-bg text-critical font-semibold hover:bg-critical-hover",
  tinted: "border border-jade-200 bg-jade-50 text-jade-800 font-medium hover:bg-jade-400",
  ghost: "border-0 bg-transparent text-ink-muted underline underline-offset-[3px] hover:text-ink",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        "cursor-pointer rounded-[var(--radius-control)] px-4 py-[9px] text-[13px] transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-55",
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

export function FilterPill({
  active,
  className,
  ...props
}: ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "machine cursor-pointer rounded-[var(--radius-pill)] border px-[11px] py-[6px] text-[11.5px] tracking-[0.04em] transition-colors",
        active
          ? "border-jade-200 bg-jade-50 text-jade-800"
          : "border-[#dfded8] bg-surface text-ink-muted hover:text-ink",
        className,
      )}
      {...props}
    />
  );
}

/** Same geometry as a filter pill, but for prose labels rather than machine values. */
export function SegmentedOption({
  active,
  className,
  ...props
}: ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "cursor-pointer rounded-[var(--radius-pill)] border px-[11px] py-[6px] text-[12px] transition-colors",
        active
          ? "border-jade-200 bg-jade-50 font-medium text-jade-800"
          : "border-[#dfded8] bg-surface text-ink-muted hover:text-ink",
        className,
      )}
      {...props}
    />
  );
}

// --- Feedback --------------------------------------------------------------

export function ProgressTrack({
  value,
  barClassName,
  className,
  height = 7,
}: {
  value: number;
  barClassName?: string;
  className?: string;
  height?: number;
}) {
  return (
    <div
      className={cn("overflow-hidden rounded-full bg-line-subtle", className)}
      style={{ height }}
    >
      <div
        className={cn("h-full rounded-full", barClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[var(--radius-inner)] bg-line-subtle", className)} />;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="font-display text-[15px] font-semibold">{title}</div>
      {description ? (
        <p className="max-w-[420px] text-[13px] leading-relaxed text-ink-faint">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Could not load this",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="font-display text-[15px] font-semibold text-critical">{title}</div>
      {message ? (
        <p className="max-w-[460px] text-[13px] leading-relaxed text-ink-body">{message}</p>
      ) : null}
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

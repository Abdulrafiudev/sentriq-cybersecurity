import type { IncidentStatus, Severity } from "@/types/incident";

/**
 * Token maps for the two enums that carry colour. Written as full class strings
 * so Tailwind's scanner can see them — never build these by interpolation.
 */

export const SEVERITY_CLASSES: Record<Severity, string> = {
  Critical: "text-critical bg-critical-bg border-critical-border",
  High: "text-high bg-high-bg border-high-border",
  Medium: "text-medium bg-medium-bg border-medium-border",
  Low: "text-low bg-low-bg border-low-border",
};

/** Saturated fills, used only in the severity bar chart. */
export const SEVERITY_BAR: Record<Severity, string> = {
  Critical: "bg-critical-bar",
  High: "bg-high-bar",
  Medium: "bg-medium-bar",
  Low: "bg-low-bar",
};

export const SEVERITY_TEXT: Record<Severity, string> = {
  Critical: "text-critical",
  High: "text-high",
  Medium: "text-medium",
  Low: "text-low",
};

export const STATUS_CLASSES: Record<IncidentStatus, string> = {
  Open: "text-ink bg-surface border-status-open-border",
  "In review": "text-jade-800 bg-jade-50 border-jade-200",
  // Violet always means "handled by policy" — shared with redaction tokens.
  Triaged: "text-violet bg-violet-bg border-violet-border",
  Merged: "text-status-merged bg-status-merged-bg border-status-merged-border",
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

/** The assignment rule behind each level, shown as a tooltip and on the system sheet. */
export const SEVERITY_RULE: Record<Severity, string> = {
  Critical: "Confirmed compromise, privileged access, active ransomware, or funds moved.",
  High: "Credentials entered or sensitive systems reachable, containment unconfirmed.",
  Medium: "Attempt observed, no execution, no confirmed loss.",
  Low: "Blocked upstream, duplicate, or benign after review.",
};

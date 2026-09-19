/** Shared vocabulary for the triage pipeline. Mirrored by the client in `@/types`. */

export const INCIDENT_CATEGORIES = [
  "Phishing",
  "Malware",
  "Account Takeover",
  "Credential Theft",
  "Unauthorized Access",
  "Data Breach",
  "Fraud / Social Engineering",
  "Other",
] as const;
export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

export const SEVERITY_LEVELS = ["Critical", "High", "Medium", "Low"] as const;
export type Severity = (typeof SEVERITY_LEVELS)[number];

export const INCIDENT_STATUSES = ["Open", "In review", "Triaged", "Merged"] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INDICATOR_TYPES = ["IP", "URL", "DOMAIN", "EMAIL", "HASH", "SYSTEM", "ACCOUNT"] as const;
export type IndicatorType = (typeof INDICATOR_TYPES)[number];

export const RESPONSE_TEAMS = [
  "SOC / Phishing",
  "Malware Response",
  "Identity / Fraud",
  "Incident Response",
  "General SOC Queue",
] as const;
export type ResponseTeam = (typeof RESPONSE_TEAMS)[number];

export const REPORT_LANGUAGES = ["English", "Nigerian Pidgin", "Mixed", "Unknown"] as const;
export type ReportLanguage = (typeof REPORT_LANGUAGES)[number];

export const LANGUAGE_HINTS = ["Auto-detect", "English", "Nigerian Pidgin"] as const;
export type LanguageHint = (typeof LANGUAGE_HINTS)[number];

export interface Indicator {
  type: IndicatorType;
  value: string;
  /** How the value was found — regex rules or the language model. */
  source: "rules" | "llm";
}

export interface RedactionEntity {
  type:
    | "NAME"
    | "PHONE"
    | "EMAIL"
    | "ACCOUNT"
    | "ADDRESS"
    | "AMOUNT"
    | "IP"
    | "URL"
    | "ORG_SYSTEM"
    | "ID_NUMBER";
  token: string;
  original: string;
  source: "rules" | "llm";
}

export interface RelatedIncidentRef {
  incidentId: string;
  similarityScore: number;
  title?: string;
}

/** Per-stage timing, surfaced by the submit screen's pipeline stepper. */
export interface PipelineStage {
  key:
    | "received"
    | "redaction"
    | "classify"
    | "indicators"
    | "severity"
    | "similarity"
    | "routing";
  label: string;
  note: string;
  durationMs: number;
}

export type AnalysisEngine = "llm" | "heuristic";

/**
 * What the deterministic rule engine concluded, kept alongside the model's answer.
 * It is a cross-check an analyst can see, not an input to the confidence score.
 */
export interface SecondOpinion {
  category: IncidentCategory;
  agreed: boolean;
}

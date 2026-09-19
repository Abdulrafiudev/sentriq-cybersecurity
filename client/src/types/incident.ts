/** Mirrors `server/src/types/domain.ts`. Keep the two in step. */

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

export const LANGUAGE_HINTS = ["Auto-detect", "English", "Nigerian Pidgin"] as const;
export type LanguageHint = (typeof LANGUAGE_HINTS)[number];

export type ReportLanguage = "English" | "Nigerian Pidgin" | "Mixed" | "Unknown";

export interface Indicator {
  type: IndicatorType;
  value: string;
  source: "rules" | "llm";
}

export interface RedactionEntity {
  type: string;
  token: string;
  original: string;
  source: "rules" | "llm";
}

export interface RelatedIncidentRef {
  incidentId: string;
  similarityScore: number;
  title?: string;
}

export interface PipelineStage {
  key: "received" | "redaction" | "classify" | "indicators" | "severity" | "similarity" | "routing";
  label: string;
  note: string;
  durationMs: number;
}

/** The rule engine's independent read, kept as a cross-check, never scored. */
export interface SecondOpinion {
  category: IncidentCategory;
  agreed: boolean;
}

export interface Incident {
  incidentId: string;
  title: string;
  redactedReport: string;
  redactionEntities: RedactionEntity[];
  redactionNote: string;
  incidentType: IncidentCategory;
  classificationConfidence: number;
  confidencePct: number;
  classificationExplanation: string;
  secondOpinion: SecondOpinion | null;
  severity: Severity;
  severityReason: string;
  assignedTeam: ResponseTeam;
  status: IncidentStatus;
  language: ReportLanguage;
  languageHint: LanguageHint;
  indicators: Indicator[];
  relatedIncidents: RelatedIncidentRef[];
  analysisEngine: "llm" | "heuristic";
  pipeline: PipelineStage[];
  processingMs: number;
  mergedInto: string | null;
  embeddingModel: string;
  hasOriginal: boolean;
  createdAt: string;
  updatedAt: string;
}

/** What the queue table and related-incident cards need. */
export interface IncidentSummary {
  incidentId: string;
  title: string;
  incidentType: IncidentCategory;
  severity: Severity;
  status: IncidentStatus;
  assignedTeam: ResponseTeam;
  confidencePct: number;
  language: ReportLanguage;
  createdAt: string;
}

export interface RelatedIncident {
  incidentId: string;
  similarityScore: number;
  title: string;
  severity: Severity | null;
  incidentType: IncidentCategory | null;
  status: IncidentStatus | null;
  assignedTeam: ResponseTeam | null;
  createdAt: string | null;
}

export interface TriageSubmission {
  incident: Incident;
  pipeline: PipelineStage[];
  analysis: {
    engine: "llm" | "heuristic";
    secondOpinion: SecondOpinion | null;
    similarityBackend: string;
    embeddingModel: string;
    processingMs: number;
    routingRule: { team: ResponseTeam; ruleId: string; rationale: string };
    duplicateOf: string | null;
  };
}

export interface DashboardStats {
  totals: {
    total: number;
    last24h: number;
    critical: number;
    criticalAwaitingAnalyst: number;
    high: number;
    highRoutedToIdentity: number;
    open: number;
    inReview: number;
    triaged: number;
    duplicatesMerged: number;
    duplicatePct: number;
  };
  severity: Array<{ level: Severity; count: number; pct: number }>;
  categories: Array<{ name: IncidentCategory; count: number; pct: number }>;
  teams: Array<{ team: ResponseTeam; count: number }>;
  recent: IncidentSummary[];
  performance: { medianTriageMs: number; medianTriageSeconds: number; processed: number };
  pipeline: {
    engine: "llm" | "heuristic";
    model: string;
    embeddingModel: string;
    embeddingSpace: string;
    vectorSearch: string;
    similarityThreshold: number;
    duplicateThreshold: number;
  };
}

export interface RoutingRule {
  id: string;
  category: IncidentCategory;
  team: ResponseTeam;
  minSeverity: Severity | null;
  rationale: string;
  incidentsRouted: number;
}

export interface EvaluationMetric {
  key: string;
  label: string;
  correct: number;
  total: number;
  accuracy: number;
  precision: number | null;
  recall: number | null;
  note: string;
}

export interface EvaluationFailure {
  metric: string;
  reportId: string;
  excerpt: string;
  expected: string;
  actual: string;
  commentary: string;
}

export interface EvaluationRun {
  runId: string;
  engine: "llm" | "heuristic";
  model: string;
  embeddingModel: string;
  datasetSize: number;
  durationMs: number;
  metrics: EvaluationMetric[];
  failures: EvaluationFailure[];
  confusion: Array<{ expected: string; actual: string; count: number }>;
  notes: string[];
  createdAt: string;
}

export interface AuthUser {
  sub: string;
  email: string;
  name: string;
  role: "analyst" | "lead";
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export type QueueFilter = "All" | "Critical" | "High" | "Unreviewed";
export type QueueSort = "newest" | "oldest" | "severity" | "confidence";

export interface IncidentQuery {
  search?: string;
  severity?: Severity[];
  category?: IncidentCategory[];
  status?: IncidentStatus[];
  team?: ResponseTeam[];
  filter?: QueueFilter;
  sort?: QueueSort;
  page?: number;
  limit?: number;
}

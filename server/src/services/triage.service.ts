import { env } from "../config/env";
import type {
  AnalysisEngine,
  Indicator,
  IncidentCategory,
  LanguageHint,
  PipelineStage,
  RedactionEntity,
  ReportLanguage,
  ResponseTeam,
  SecondOpinion,
  Severity,
} from "../types/domain";
import { REPORT_LANGUAGES } from "../types/domain";
import { analyzeWithLlm, isLlmAvailable, type LlmAnalysis } from "./ai.service";
import {
  buildFallbackTitle,
  classifyWithRules,
  detectLanguage,
  reconcileClassification,
  scrubTitle,
} from "./classification.service";
import { embedReport, thresholdsFor } from "./embedding.service";
import { extractIndicators } from "./indicator.service";
import { redact } from "./redaction.service";
import { routeIncident, type RoutingDecision } from "./routing.service";
import { findRelatedIncidents, type SimilarityResult } from "./similarity.service";
import { reconcileSeverity, scoreSeverityWithRules } from "./severity.service";

/**
 * The complete triage pipeline (PRD §10), with no database or HTTP in it.
 *
 *   Report → Redact PII → Classify → Extract indicators → Score severity
 *          → Embed → Detect related → Route
 *
 * Each stage is timed so the submit screen's stepper can show real progress
 * instead of a fake animation.
 */

export interface TriageInput {
  report: string;
  languageHint?: LanguageHint;
  /** Skip the related-incident stage, e.g. while seeding the very first record. */
  skipSimilarity?: boolean;
  excludeIncidentId?: string;
}

export interface TriageResult {
  title: string;
  originalReport: string;
  redactedReport: string;
  redactionEntities: RedactionEntity[];
  redactionNote: string;

  incidentType: IncidentCategory;
  classificationConfidence: number;
  classificationExplanation: string;

  severity: Severity;
  severityReason: string;

  language: ReportLanguage;
  languageHint: LanguageHint;

  indicators: Indicator[];
  related: SimilarityResult["related"];
  duplicateOf: string | null;
  similarityBackend: SimilarityResult["backend"] | "skipped";

  assignedTeam: ResponseTeam;
  routing: RoutingDecision;

  embedding: number[];
  embeddingModel: string;

  analysisEngine: AnalysisEngine;
  /** The rule engine's independent category, when the model was the classifier. */
  secondOpinion: SecondOpinion | null;
  pipeline: PipelineStage[];
  processingMs: number;
}

const clock = () => Number(process.hrtime.bigint() / 1_000_000n);

export async function runTriagePipeline(input: TriageInput): Promise<TriageResult> {
  const report = input.report.trim();
  const languageHint: LanguageHint = input.languageHint ?? "Auto-detect";
  const stages: PipelineStage[] = [];
  const startedAt = clock();
  let mark = startedAt;

  const stage = (
    key: PipelineStage["key"],
    label: string,
    note: string,
  ) => {
    const now = clock();
    stages.push({ key, label, note, durationMs: now - mark });
    mark = now;
  };

  stage("received", "Received", "0.0s");

  // --- One GPT call feeds redaction, classification, severity and indicators ---
  const llm: LlmAnalysis | null = await analyzeWithLlm(report);
  const analysisEngine: AnalysisEngine = llm ? "llm" : "heuristic";

  // 1. Redact before anything else touches the text.
  const redaction = redact(report, llm);
  stage(
    "redaction",
    "Redaction",
    redaction.entities.length === 0
      ? "none found"
      : `${redaction.entities.length} ${redaction.entities.length === 1 ? "entity" : "entities"}`,
  );

  // 2. Classify. Rules always run so there is a control to compare against.
  const ruleClassification = classifyWithRules(report);
  const classification = reconcileClassification(llm, ruleClassification);
  stage("classify", "Classify", classification.category);

  // 3. Indicators come from the original text — tokens are not evidence.
  const indicators = extractIndicators(report, llm);
  stage(
    "indicators",
    "Indicators",
    `${indicators.length} found`,
  );

  // 4. Severity, with the model allowed to escalate but not to bury.
  const ruleSeverity = scoreSeverityWithRules(report, classification.category, indicators);
  const severity = reconcileSeverity(llm, ruleSeverity);
  stage("severity", "Severity", severity.severity);

  // 5. Embed the redacted text, then look for neighbours.
  const embedding = await embedReport(redaction.redactedReport);

  let similarity: SimilarityResult = {
    related: [],
    duplicateOf: null,
    backend: "in-process-cosine",
    thresholds: thresholdsFor(embedding.space),
  };
  if (!input.skipSimilarity) {
    similarity = await findRelatedIncidents(embedding.vector, {
      excludeIncidentId: input.excludeIncidentId,
      space: embedding.space,
    });
  }
  stage(
    "similarity",
    "Similarity",
    similarity.related.length === 0
      ? "no match"
      : `${similarity.related.length} ${similarity.related.length === 1 ? "match" : "matches"}`,
  );

  // 6. Route. Pure policy, no model.
  const routing = routeIncident(classification.category, severity.severity);
  stage("routing", "Routing", routing.team);

  const language: ReportLanguage =
    languageHint === "English"
      ? "English"
      : languageHint === "Nigerian Pidgin"
        ? "Nigerian Pidgin"
        : llm && REPORT_LANGUAGES.includes(llm.language)
          ? llm.language
          : detectLanguage(report);

  // Titles surface on the dashboard, in the queue and in related-incident cards,
  // so they are built from the redacted text and scrubbed of anything the
  // redactor found — a leaked name in a title would undo the whole first stage.
  const rawTitle =
    (llm?.title ?? "").trim() ||
    buildFallbackTitle(redaction.redactedReport, classification.category);
  const title = scrubTitle(rawTitle, redaction.entities);

  return {
    title: title.length > 140 ? `${title.slice(0, 137)}…` : title,
    originalReport: report,
    redactedReport: redaction.redactedReport,
    redactionEntities: redaction.entities,
    redactionNote: redaction.note,

    incidentType: classification.category,
    classificationConfidence: classification.confidence,
    classificationExplanation: classification.explanation,

    severity: severity.severity,
    severityReason: severity.reason,

    language,
    languageHint,

    indicators,
    related: similarity.related,
    duplicateOf: similarity.duplicateOf,
    similarityBackend: input.skipSimilarity ? "skipped" : similarity.backend,

    assignedTeam: routing.team,
    routing,

    embedding: embedding.vector,
    embeddingModel: embedding.model,

    analysisEngine,
    secondOpinion: classification.secondOpinion,
    pipeline: stages,
    processingMs: clock() - startedAt,
  };
}

export function pipelineMeta() {
  const space = isLlmAvailable() ? ("semantic" as const) : ("lexical" as const);
  const thresholds = thresholdsFor(space);
  return {
    engine: isLlmAvailable() ? ("llm" as const) : ("heuristic" as const),
    model: isLlmAvailable() ? env.openaiModel : "sentriq-rules-v1",
    embeddingModel: isLlmAvailable() ? env.openaiEmbeddingModel : "sentriq-lexical-v1",
    embeddingSpace: space,
    vectorSearch: env.vectorSearchEnabled ? "atlas" : "in-process",
    similarityThreshold: thresholds.related,
    duplicateThreshold: thresholds.duplicate,
  };
}

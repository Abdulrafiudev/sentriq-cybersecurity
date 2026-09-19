import { randomUUID } from "node:crypto";
import { DATASET, type DatasetRecord } from "../data/dataset";
import { EvaluationRun } from "../models/EvaluationRun";
import { pipelineMeta, runTriagePipeline } from "./triage.service";
import { lexicalEmbedding, thresholdsFor } from "./embedding.service";
import { embedWithLlm } from "./ai.service";
import { refang } from "./patterns";
import { cosineSimilarity, l2Normalize } from "../utils/vector";
import { logger } from "../utils/logger";

/**
 * Evaluation harness (PRD §16).
 *
 * Replays the labelled synthetic dataset through the live pipeline and measures
 * five things: classification accuracy, PII detection, indicator extraction,
 * severity accuracy and duplicate detection. It deliberately keeps and stores the
 * failures — the brief asks for honest results, not a highlight reel.
 *
 * Similarity is scored dataset-against-dataset, so the number does not depend on
 * whatever happens to be in the database when the harness runs.
 */

interface Outcome {
  record: DatasetRecord;
  category: string;
  severity: string;
  redactedReport: string;
  indicatorValues: string[];
}

export interface Failure {
  metric: string;
  reportId: string;
  excerpt: string;
  expected: string;
  actual: string;
  commentary: string;
}

const norm = (v: string) => refang(v).trim().toLowerCase().replace(/\/+$/, "");
const excerpt = (text: string, max = 150) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
const pct = (part: number, whole: number) =>
  whole === 0 ? 0 : Number(((part / whole) * 100).toFixed(1));

const RANK: Record<string, number> = { Low: 0, Medium: 1, High: 2, Critical: 3 };

export async function runEvaluation({ quiet = false } = {}) {
  const meta = pipelineMeta();
  const startedAt = Date.now();
  logger.info(
    `Evaluating ${DATASET.length} labelled reports with the ${meta.engine} engine (${meta.model})`,
  );

  const outcomes: Outcome[] = [];
  for (const record of DATASET) {
    const result = await runTriagePipeline({
      report: record.report,
      languageHint: record.language === "Nigerian Pidgin" ? "Nigerian Pidgin" : "Auto-detect",
      skipSimilarity: true,
    });

    outcomes.push({
      record,
      category: result.incidentType,
      severity: result.severity,
      redactedReport: result.redactedReport,
      indicatorValues: result.indicators.map((i) => i.value),
    });

    if (!quiet) process.stdout.write(".");
  }
  if (!quiet) process.stdout.write("\n");

  const failures: Failure[] = [];

  // --- 1. Classification ---------------------------------------------------
  let classCorrect = 0;
  const confusion = new Map<string, number>();
  for (const o of outcomes) {
    if (o.category === o.record.expectedCategory) {
      classCorrect += 1;
      continue;
    }
    const key = `${o.record.expectedCategory}→${o.category}`;
    confusion.set(key, (confusion.get(key) ?? 0) + 1);
    failures.push({
      metric: "classification",
      reportId: o.record.id,
      excerpt: excerpt(o.record.report),
      expected: o.record.expectedCategory,
      actual: o.category,
      commentary: o.record.note ?? "",
    });
  }

  // --- 2. PII detection ----------------------------------------------------
  let piiExpected = 0;
  let piiCaught = 0;
  let piiSurvived = 0;
  for (const o of outcomes) {
    for (const value of o.record.expectedPii) {
      piiExpected += 1;
      if (o.redactedReport.includes(value)) {
        piiSurvived += 1;
        failures.push({
          metric: "pii",
          reportId: o.record.id,
          excerpt: excerpt(o.record.report),
          expected: `redacted: ${value}`,
          actual: "left in the report",
          commentary:
            "PII survived redaction — the most serious failure class for this product.",
        });
      } else {
        piiCaught += 1;
      }
    }
  }

  // --- 3. Indicator extraction --------------------------------------------
  let indExpected = 0;
  let indFound = 0;
  let indReturned = 0;
  for (const o of outcomes) {
    const found = new Set(o.indicatorValues.map(norm));
    indReturned += found.size;

    for (const expected of o.record.expectedIndicators) {
      indExpected += 1;
      const hit = [...found].some(
        (f) => f === norm(expected.value) || f.includes(norm(expected.value)),
      );
      if (hit) {
        indFound += 1;
      } else {
        failures.push({
          metric: "indicators",
          reportId: o.record.id,
          excerpt: excerpt(o.record.report),
          expected: `${expected.type} ${expected.value}`,
          actual: o.indicatorValues.join(", ") || "nothing extracted",
          commentary:
            "Indicator missed — analysts would have to re-read the report to find it.",
        });
      }
    }
  }

  // --- 4. Severity ---------------------------------------------------------
  let sevCorrect = 0;
  let sevWithinOne = 0;
  for (const o of outcomes) {
    const delta = Math.abs((RANK[o.severity] ?? 0) - (RANK[o.record.expectedSeverity] ?? 0));
    if (delta === 0) sevCorrect += 1;
    if (delta <= 1) sevWithinOne += 1;
    if (delta === 0) continue;

    failures.push({
      metric: "severity",
      reportId: o.record.id,
      excerpt: excerpt(o.record.report),
      expected: o.record.expectedSeverity,
      actual: o.severity,
      commentary:
        delta > 1
          ? "Off by more than one level — the kind of miss that reorders an analyst's day."
          : (o.record.note ?? "Off by one level."),
    });
  }

  // --- 5. Duplicate detection ---------------------------------------------
  const space = meta.engine === "llm" ? ("semantic" as const) : ("lexical" as const);
  const { related: relatedThreshold } = thresholdsFor(space);

  const vectors = new Map<string, number[]>();
  for (const o of outcomes) {
    const remote = await embedWithLlm(o.redactedReport);
    vectors.set(o.record.id, l2Normalize(remote ?? lexicalEmbedding(o.redactedReport)));
  }

  let dupExpected = 0;
  let dupCaught = 0;
  let dupFalsePositives = 0;

  for (const [index, o] of outcomes.entries()) {
    const mine = vectors.get(o.record.id) ?? [];
    // Only compare against earlier records — the same information a live
    // submission would have had at the time.
    const scored = outcomes
      .slice(0, index)
      .map((other) => ({
        id: other.record.id,
        score: cosineSimilarity(mine, vectors.get(other.record.id) ?? []),
      }))
      .sort((a, b) => b.score - a.score);

    const top = scored[0];
    const flagged = top && top.score >= relatedThreshold ? top.id : null;

    if (o.record.duplicateOf) {
      dupExpected += 1;
      const hit = scored.some(
        (s) => s.id === o.record.duplicateOf && s.score >= relatedThreshold,
      );
      if (hit) {
        dupCaught += 1;
      } else {
        failures.push({
          metric: "duplicates",
          reportId: o.record.id,
          excerpt: excerpt(o.record.report),
          expected: `related to ${o.record.duplicateOf}`,
          actual: flagged
            ? `top match ${flagged} at ${(top?.score ?? 0).toFixed(2)}`
            : "no match above threshold",
          commentary: "Duplicate missed — the analyst reads the same campaign twice.",
        });
      }
    } else if (flagged) {
      const flaggedCategory = DATASET.find((d) => d.id === flagged)?.expectedCategory;
      if (flaggedCategory !== o.record.expectedCategory) {
        dupFalsePositives += 1;
        failures.push({
          metric: "duplicates",
          reportId: o.record.id,
          excerpt: excerpt(o.record.report),
          expected: "no duplicate",
          actual: `flagged ${flagged} at ${(top?.score ?? 0).toFixed(2)}`,
          commentary: "False positive — similar wording, unrelated incident.",
        });
      }
    }
  }

  const metrics = [
    {
      key: "classification",
      label: "Classification accuracy",
      correct: classCorrect,
      total: outcomes.length,
      accuracy: pct(classCorrect, outcomes.length),
      precision: null,
      recall: null,
      note: "Exact category match against the labelled dataset.",
    },
    {
      key: "pii",
      label: "PII detection",
      correct: piiCaught,
      total: piiExpected,
      accuracy: pct(piiCaught, piiExpected),
      precision: null,
      recall: pct(piiCaught, piiExpected),
      note:
        piiSurvived === 0
          ? "Every labelled PII value was removed before storage."
          : `${piiSurvived} labelled PII value(s) survived redaction.`,
    },
    {
      key: "indicators",
      label: "Indicator extraction",
      correct: indFound,
      total: indExpected,
      accuracy: pct(indFound, indExpected),
      precision: pct(indFound, indReturned),
      recall: pct(indFound, indExpected),
      note: `${indReturned} indicators returned in total across the dataset.`,
    },
    {
      key: "severity",
      label: "Severity accuracy",
      correct: sevCorrect,
      total: outcomes.length,
      accuracy: pct(sevCorrect, outcomes.length),
      precision: null,
      recall: null,
      note: `${pct(sevWithinOne, outcomes.length)}% land within one level of the label.`,
    },
    {
      key: "duplicates",
      label: "Duplicate detection",
      correct: dupCaught,
      total: dupExpected,
      accuracy: pct(dupCaught, dupExpected),
      precision: null,
      recall: pct(dupCaught, dupExpected),
      note: `${dupFalsePositives} false positive(s) at a ${relatedThreshold} threshold in the ${space} vector space.`,
    },
  ];

  const run = await EvaluationRun.create({
    runId: randomUUID(),
    engine: meta.engine,
    model: meta.model,
    embeddingModel: meta.embeddingModel,
    datasetSize: DATASET.length,
    durationMs: Date.now() - startedAt,
    metrics,
    failures,
    confusion: [...confusion.entries()].map(([key, count]) => {
      const [expected, actual] = key.split("→");
      return { expected, actual, count };
    }),
    notes: [
      "The dataset is fully synthetic. No real personal data is included.",
      "Similarity is measured dataset-against-dataset, so the score does not depend on database contents.",
      meta.engine === "heuristic"
        ? "Run without an OPENAI_API_KEY. These are the deterministic rule engine's numbers — the floor, not the ceiling. Names and internal system names have no fixed shape, so only the model can catch them; that is why PII recall is the weakest metric here."
        : `Run with GPT (${meta.model}) alongside the rule engine.`,
    ],
  });

  return { run, metrics, failures };
}

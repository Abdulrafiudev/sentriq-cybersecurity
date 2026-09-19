import { Schema, model } from "mongoose";

/**
 * A stored result from `pnpm evaluate` (PRD §16). Kept in the database so the
 * Evaluation screen shows measured numbers rather than claims, including the
 * cases Sentriq got wrong.
 */

const metricSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    correct: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    /** Extra detail: precision/recall for the extraction metrics. */
    precision: { type: Number, default: null },
    recall: { type: Number, default: null },
    note: { type: String, default: "" },
  },
  { _id: false },
);

const failureSchema = new Schema(
  {
    metric: { type: String, required: true },
    reportId: { type: String, required: true },
    excerpt: { type: String, required: true },
    expected: { type: String, required: true },
    actual: { type: String, required: true },
    commentary: { type: String, default: "" },
  },
  { _id: false },
);

const confusionSchema = new Schema(
  { expected: String, actual: String, count: Number },
  { _id: false },
);

const evaluationRunSchema = new Schema(
  {
    runId: { type: String, required: true, unique: true },
    engine: { type: String, enum: ["llm", "heuristic"], required: true },
    model: { type: String, default: "" },
    embeddingModel: { type: String, default: "" },
    datasetSize: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },
    metrics: { type: [metricSchema], default: [] },
    failures: { type: [failureSchema], default: [] },
    confusion: { type: [confusionSchema], default: [] },
    notes: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const EvaluationRun = model("EvaluationRun", evaluationRunSchema);

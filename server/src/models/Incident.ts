import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_STATUSES,
  INDICATOR_TYPES,
  REPORT_LANGUAGES,
  RESPONSE_TEAMS,
  SEVERITY_LEVELS,
} from "../types/domain";

const indicatorSchema = new Schema(
  {
    type: { type: String, enum: INDICATOR_TYPES, required: true },
    value: { type: String, required: true, trim: true },
    source: { type: String, enum: ["rules", "llm"], default: "rules" },
  },
  { _id: false },
);

const redactionEntitySchema = new Schema(
  {
    type: { type: String, required: true },
    token: { type: String, required: true },
    original: { type: String, required: true },
    source: { type: String, enum: ["rules", "llm"], default: "rules" },
  },
  { _id: false },
);

const relatedIncidentSchema = new Schema(
  {
    incidentId: { type: String, required: true },
    similarityScore: { type: Number, required: true, min: 0, max: 1 },
    title: { type: String },
  },
  { _id: false },
);

const pipelineStageSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    note: { type: String, default: "" },
    durationMs: { type: Number, default: 0 },
  },
  { _id: false },
);

const incidentSchema = new Schema(
  {
    incidentId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },

    originalReport: { type: String, required: true },
    redactedReport: { type: String, required: true },
    redactionEntities: { type: [redactionEntitySchema], default: [] },
    redactionNote: { type: String, default: "" },

    incidentType: { type: String, enum: INCIDENT_CATEGORIES, required: true, index: true },
    classificationConfidence: { type: Number, required: true, min: 0, max: 1 },
    classificationExplanation: { type: String, default: "" },

    /** The rule engine's independent read. Shown to analysts, never scored. */
    secondOpinion: {
      type: new Schema(
        {
          category: { type: String, enum: INCIDENT_CATEGORIES, required: true },
          agreed: { type: Boolean, required: true },
        },
        { _id: false },
      ),
      default: null,
    },

    severity: { type: String, enum: SEVERITY_LEVELS, required: true, index: true },
    severityReason: { type: String, default: "" },

    assignedTeam: { type: String, enum: RESPONSE_TEAMS, required: true, index: true },
    status: { type: String, enum: INCIDENT_STATUSES, default: "Open", index: true },

    language: { type: String, enum: REPORT_LANGUAGES, default: "Unknown" },
    languageHint: { type: String, default: "Auto-detect" },

    indicators: { type: [indicatorSchema], default: [] },
    relatedIncidents: { type: [relatedIncidentSchema], default: [] },

    /** Dense vector used for related-incident search. Excluded from API payloads. */
    embedding: { type: [Number], default: [], select: false },
    embeddingModel: { type: String, default: "" },

    analysisEngine: { type: String, enum: ["llm", "heuristic"], default: "heuristic" },
    pipeline: { type: [pipelineStageSchema], default: [] },
    processingMs: { type: Number, default: 0 },

    /** Set when similarity crossed the duplicate threshold. */
    mergedInto: { type: String, default: null },
    /** Ground-truth labels, present only for seeded evaluation records. */
    evaluation: {
      type: new Schema(
        {
          isSeed: { type: Boolean, default: false },
          expectedCategory: { type: String },
          expectedSeverity: { type: String },
          expectedPiiCount: { type: Number },
          expectedIndicatorValues: { type: [String], default: [] },
          duplicateOf: { type: String, default: null },
        },
        { _id: false },
      ),
      default: undefined,
    },
  },
  { timestamps: true },
);

incidentSchema.index({ createdAt: -1 });
// `language_override` is remapped because this schema already uses `language`
// for the report's human language, which Mongo would otherwise read as a stemmer.
incidentSchema.index(
  { title: "text", redactedReport: "text" },
  { default_language: "english", language_override: "textIndexLanguage" },
);

export type IncidentDoc = HydratedDocument<InferSchemaType<typeof incidentSchema>>;
export const Incident = model("Incident", incidentSchema);

import { Incident, type IncidentDoc } from "../models/Incident";
import { nextSequence } from "../models/Counter";
import { ApiError } from "../utils/ApiError";
import { logger } from "../utils/logger";
import { runTriagePipeline, type TriageResult } from "./triage.service";
import {
  INCIDENT_CATEGORIES,
  SEVERITY_LEVELS,
  type IncidentCategory,
  type IncidentStatus,
  type LanguageHint,
  type ResponseTeam,
  type Severity,
} from "../types/domain";

/** IDs continue from INC-100 so a fresh database still looks like a live queue. */
const ID_SEQUENCE = "incidentId";
const ID_OFFSET = 100;

async function nextIncidentId(): Promise<string> {
  const seq = await nextSequence(ID_SEQUENCE, ID_OFFSET);
  return `INC-${seq}`;
}

export interface CreateIncidentInput {
  report: string;
  languageHint?: LanguageHint;
  /** Seeding only: ground-truth labels kept for the evaluation harness. */
  evaluation?: {
    isSeed: boolean;
    expectedCategory?: string;
    expectedSeverity?: string;
    expectedPiiCount?: number;
    expectedIndicatorValues?: string[];
    duplicateOf?: string | null;
  };
  createdAt?: Date;
}

export interface CreateIncidentResult {
  incident: IncidentDoc;
  triage: TriageResult;
}

/**
 * POST /api/incidents, end to end: run the pipeline, persist, and back-link the
 * incidents it matched so the relationship is visible from both sides.
 */
export async function createIncident(input: CreateIncidentInput): Promise<CreateIncidentResult> {
  const report = input.report.trim();
  if (report.length === 0) throw ApiError.badRequest("Report text is required");

  const triage = await runTriagePipeline({
    report,
    languageHint: input.languageHint,
  });

  const incidentId = await nextIncidentId();
  const isDuplicate = triage.duplicateOf !== null;

  const incident = await Incident.create({
    incidentId,
    title: triage.title,
    originalReport: triage.originalReport,
    redactedReport: triage.redactedReport,
    redactionEntities: triage.redactionEntities,
    redactionNote: triage.redactionNote,
    incidentType: triage.incidentType,
    classificationConfidence: triage.classificationConfidence,
    classificationExplanation: triage.classificationExplanation,
    secondOpinion: triage.secondOpinion,
    severity: triage.severity,
    severityReason: triage.severityReason,
    assignedTeam: triage.assignedTeam,
    status: isDuplicate ? "Merged" : "Open",
    mergedInto: triage.duplicateOf,
    language: triage.language,
    languageHint: triage.languageHint,
    indicators: triage.indicators,
    relatedIncidents: triage.related,
    embedding: triage.embedding,
    embeddingModel: triage.embeddingModel,
    analysisEngine: triage.analysisEngine,
    pipeline: triage.pipeline,
    processingMs: triage.processingMs,
    evaluation: input.evaluation,
  });

  // Backdating a seeded record has to go through the driver: Mongoose marks
  // `createdAt` immutable and strips it from an update, reporting a modified
  // document while silently changing only `updatedAt`.
  if (input.createdAt) {
    await Incident.collection.updateOne(
      { _id: incident._id },
      { $set: { createdAt: input.createdAt, updatedAt: input.createdAt } },
    );
    incident.set("createdAt", input.createdAt);
  }

  await backlinkRelated(incidentId, triage);

  logger.info(
    `Triaged ${incidentId}: ${triage.incidentType} / ${triage.severity} → ${triage.assignedTeam} (${triage.analysisEngine}, ${triage.processingMs}ms)`,
  );

  return { incident, triage };
}

/** Adds the reverse edge so an older incident also shows its newer duplicate. */
async function backlinkRelated(incidentId: string, triage: TriageResult): Promise<void> {
  await Promise.all(
    triage.related.map((match) =>
      Incident.updateOne(
        { incidentId: match.incidentId, "relatedIncidents.incidentId": { $ne: incidentId } },
        {
          $push: {
            relatedIncidents: {
              incidentId,
              similarityScore: match.similarityScore,
              title: triage.title,
            },
          },
        },
      ).catch((error: unknown) => {
        logger.warn(`Could not back-link ${match.incidentId} → ${incidentId}`, error);
      }),
    ),
  );
}

// --- Queries ---------------------------------------------------------------

export interface ListIncidentsQuery {
  search?: string;
  severity?: Severity[];
  category?: IncidentCategory[];
  status?: IncidentStatus[];
  team?: ResponseTeam[];
  /** Dashboard shorthand used by the queue's filter pills. */
  filter?: "All" | "Critical" | "High" | "Unreviewed";
  sort?: "newest" | "oldest" | "severity" | "confidence";
  page?: number;
  limit?: number;
}

export async function listIncidents(query: ListIncidentsQuery) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 25));

  const filter: Record<string, unknown> = {};

  if (query.severity?.length) filter.severity = { $in: query.severity };
  if (query.category?.length) filter.incidentType = { $in: query.category };
  if (query.status?.length) filter.status = { $in: query.status };
  if (query.team?.length) filter.assignedTeam = { $in: query.team };

  if (query.filter === "Critical") filter.severity = { $in: ["Critical"] };
  if (query.filter === "High") filter.severity = { $in: ["High"] };
  if (query.filter === "Unreviewed") filter.status = { $in: ["Open"] };

  if (query.search?.trim()) {
    const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(escaped, "i");
    filter.$or = [
      { incidentId: rx },
      { title: rx },
      { redactedReport: rx },
      { "indicators.value": rx },
    ];
  }

  /**
   * Severity is a string enum, so Mongo would sort it alphabetically — Critical,
   * High, Low, Medium — which is wrong. It is ranked inside the query with
   * $indexOfArray against the severity order rather than sorted in memory: this
   * is the queue's default view, and paging through it in the application would
   * mean fetching the whole collection on every request.
   */
  if (query.sort === "severity") {
    const [items, total] = await Promise.all([
      Incident.aggregate([
        { $match: filter },
        { $addFields: { severityRank: { $indexOfArray: [[...SEVERITY_LEVELS], "$severity"] } } },
        { $sort: { severityRank: 1, createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        // `select: false` on the schema does not apply to an aggregation, so the
        // embedding has to be dropped explicitly or every row ships 1536 floats.
        { $project: { embedding: 0, severityRank: 0 } },
      ]),
      Incident.countDocuments(filter),
    ]);

    return {
      items,
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  const sort: Record<string, 1 | -1> =
    query.sort === "oldest"
      ? { createdAt: 1 }
      : query.sort === "confidence"
        ? { classificationConfidence: -1 }
        : { createdAt: -1 };

  const [items, total] = await Promise.all([
    Incident.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Incident.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function getIncident(incidentId: string) {
  const incident = await Incident.findOne({ incidentId }).lean();
  if (!incident) throw ApiError.notFound(`Incident ${incidentId} not found`);
  return incident;
}

export async function getRelatedIncidents(incidentId: string) {
  const incident = await Incident.findOne({ incidentId }, { relatedIncidents: 1 }).lean();
  if (!incident) throw ApiError.notFound(`Incident ${incidentId} not found`);

  const refs = incident.relatedIncidents ?? [];
  if (refs.length === 0) return [];

  const docs = await Incident.find(
    { incidentId: { $in: refs.map((r) => r.incidentId) } },
    { incidentId: 1, title: 1, severity: 1, incidentType: 1, status: 1, assignedTeam: 1, createdAt: 1, _id: 0 },
  ).lean();

  const byId = new Map(docs.map((d) => [d.incidentId, d]));
  return refs
    .map((ref) => {
      const doc = byId.get(ref.incidentId);
      return {
        incidentId: ref.incidentId,
        similarityScore: ref.similarityScore,
        title: doc?.title ?? ref.title ?? "Incident no longer available",
        severity: doc?.severity ?? null,
        incidentType: doc?.incidentType ?? null,
        status: doc?.status ?? null,
        assignedTeam: doc?.assignedTeam ?? null,
        createdAt: doc?.createdAt ?? null,
      };
    })
    .sort((a, b) => b.similarityScore - a.similarityScore);
}

export interface UpdateIncidentInput {
  status?: IncidentStatus;
  severity?: Severity;
  assignedTeam?: ResponseTeam;
  title?: string;
}

export async function updateIncident(incidentId: string, patch: UpdateIncidentInput) {
  const incident = await Incident.findOneAndUpdate({ incidentId }, { $set: patch }, { new: true }).lean();
  if (!incident) throw ApiError.notFound(`Incident ${incidentId} not found`);
  return incident;
}

export async function deleteIncident(incidentId: string) {
  const result = await Incident.findOneAndDelete({ incidentId }).lean();
  if (!result) throw ApiError.notFound(`Incident ${incidentId} not found`);
  await Incident.updateMany(
    { "relatedIncidents.incidentId": incidentId },
    { $pull: { relatedIncidents: { incidentId } } },
  );
  return { incidentId };
}

// --- Dashboard -------------------------------------------------------------

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Number(((part / whole) * 100).toFixed(1));
}

export async function getDashboardStats() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    total,
    last24h,
    severityRows,
    categoryRows,
    statusRows,
    teamRows,
    criticalOpen,
    highToIdentity,
    recent,
    timings,
  ] = await Promise.all([
    Incident.countDocuments({}),
    Incident.countDocuments({ createdAt: { $gte: since24h } }),
    Incident.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$severity", count: { $sum: 1 } } },
    ]),
    Incident.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$incidentType", count: { $sum: 1 } } },
    ]),
    Incident.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Incident.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$assignedTeam", count: { $sum: 1 } } },
    ]),
    Incident.countDocuments({ severity: "Critical", status: "Open" }),
    Incident.countDocuments({ severity: "High", assignedTeam: "Identity / Fraud" }),
    Incident.find({}, { embedding: 0, originalReport: 0 })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
    Incident.aggregate<{ _id: null; values: number[] }>([
      { $match: { processingMs: { $gt: 0 } } },
      { $group: { _id: null, values: { $push: "$processingMs" } } },
    ]),
  ]);

  const countOf = (rows: Array<{ _id: string; count: number }>, key: string) =>
    rows.find((r) => r._id === key)?.count ?? 0;

  const merged = countOf(statusRows, "Merged");
  const durations = (timings[0]?.values ?? []).sort((a, b) => a - b);
  const medianMs =
    durations.length === 0
      ? 0
      : (durations[Math.floor((durations.length - 1) / 2)] ?? 0);

  return {
    totals: {
      total,
      last24h,
      critical: countOf(severityRows, "Critical"),
      criticalAwaitingAnalyst: criticalOpen,
      high: countOf(severityRows, "High"),
      highRoutedToIdentity: highToIdentity,
      open: countOf(statusRows, "Open"),
      inReview: countOf(statusRows, "In review"),
      triaged: countOf(statusRows, "Triaged"),
      duplicatesMerged: merged,
      duplicatePct: pct(merged, total),
    },
    severity: SEVERITY_LEVELS.map((level) => {
      const count = countOf(severityRows, level);
      return { level, count, pct: pct(count, total) };
    }),
    categories: INCIDENT_CATEGORIES.map((name) => {
      const count = countOf(categoryRows, name);
      return { name, count, pct: pct(count, total) };
    }).sort((a, b) => b.count - a.count),
    teams: teamRows
      .map((r) => ({ team: r._id, count: r.count }))
      .sort((a, b) => b.count - a.count),
    recent,
    performance: {
      medianTriageMs: medianMs,
      medianTriageSeconds: Number((medianMs / 1000).toFixed(1)),
      processed: durations.length,
    },
  };
}

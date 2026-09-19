import { Incident } from "../models/Incident";
import { Counter, resetSequence } from "../models/Counter";
import { DATASET, DATASET_SUMMARY } from "../data/dataset";
import { createIncident } from "./incident.service";
import { pipelineMeta } from "./triage.service";
import { logger } from "../utils/logger";

/**
 * Seeds the database by running the real pipeline over the synthetic dataset.
 * Nothing is hand-written into Mongo — the queue you see after seeding is the
 * genuine output of the system, which is also what the evaluation measures.
 */

export interface SeedOptions {
  /** Keep existing incidents and append the dataset alongside them. */
  keep?: boolean;
  /** Quieter output when seeding as part of server start-up. */
  quiet?: boolean;
}

export async function seedDatabase({ keep = false, quiet = false }: SeedOptions = {}) {
  if (!keep) {
    const removed = await Incident.deleteMany({});
    await Counter.deleteMany({});
    logger.info(`Cleared ${removed.deletedCount} existing incidents`);
  }

  await resetSequence("incidentId", keep ? await currentOffset() : 0);

  const meta = pipelineMeta();
  logger.info(
    `Seeding ${DATASET.length} synthetic reports using the ${meta.engine} engine (${meta.model})`,
  );

  const idMap = new Map<string, string>();
  const startedAt = Date.now();
  // Spread creation times across the last three days so the dashboard has shape.
  const spanMs = 3 * 24 * 60 * 60 * 1000;

  for (const [index, record] of DATASET.entries()) {
    const createdAt = new Date(Date.now() - spanMs + (index / DATASET.length) * spanMs);

    const { incident, triage } = await createIncident({
      report: record.report,
      languageHint: record.language === "Nigerian Pidgin" ? "Nigerian Pidgin" : "Auto-detect",
      createdAt,
      evaluation: {
        isSeed: true,
        expectedCategory: record.expectedCategory,
        expectedSeverity: record.expectedSeverity,
        expectedPiiCount: record.expectedPii.length,
        expectedIndicatorValues: record.expectedIndicators.map((i) => i.value),
        duplicateOf: record.duplicateOf ? (idMap.get(record.duplicateOf) ?? null) : null,
      },
    });

    idMap.set(record.id, incident.incidentId);
    if (!quiet) {
      logger.info(
        `  ${record.id} → ${incident.incidentId}  ${triage.incidentType} / ${triage.severity} → ${triage.assignedTeam}` +
          (triage.related.length ? `  (${triage.related.length} related)` : ""),
      );
    }
  }

  await applyWorkflowStates();

  const total = await Incident.countDocuments({});
  logger.info(
    `Seeded ${DATASET.length} reports in ${((Date.now() - startedAt) / 1000).toFixed(1)}s — ${total} incidents in the database`,
  );
  if (!quiet) logger.info(`Dataset mix: ${JSON.stringify(DATASET_SUMMARY)}`);

  return { seeded: DATASET.length, total };
}

async function currentOffset(): Promise<number> {
  const last = await Incident.findOne({}, { incidentId: 1 }).sort({ createdAt: -1 }).lean();
  const n = Number((last?.incidentId ?? "INC-100").replace("INC-", ""));
  return Number.isFinite(n) ? n - 100 : 0;
}

/** Ages a slice of the queue into review/triaged so the dashboard is not all Open. */
async function applyWorkflowStates() {
  const open = await Incident.find({ status: "Open" }, { incidentId: 1 })
    .sort({ createdAt: 1 })
    .lean();
  const ids = open.map((d) => d.incidentId);

  const triaged = ids.slice(0, Math.floor(ids.length * 0.3));
  const inReview = ids.slice(triaged.length, triaged.length + Math.floor(ids.length * 0.2));

  if (triaged.length) {
    await Incident.updateMany({ incidentId: { $in: triaged } }, { $set: { status: "Triaged" } });
  }
  if (inReview.length) {
    await Incident.updateMany({ incidentId: { $in: inReview } }, { $set: { status: "In review" } });
  }
}

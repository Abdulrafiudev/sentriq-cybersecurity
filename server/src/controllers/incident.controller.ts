import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { validatedQuery } from "../middlewares/validate.middleware";
import { logger } from "../utils/logger";
import { ApiError } from "../utils/ApiError";
import { Incident } from "../models/Incident";
import {
  createIncident,
  deleteIncident,
  getIncident,
  getRelatedIncidents,
  listIncidents,
  updateIncident,
} from "../services/incident.service";
import { serializeIncident, serializeIncidents } from "../utils/serialize";
import type {
  CreateIncidentBody,
  ListIncidentsQueryInput,
} from "../validators/incident.validator";

/** Controllers stay thin — every decision lives in the service layer (PRD §8). */

export const create = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateIncidentBody;

  const { incident, triage } = await createIncident({
    report: body.report,
    languageHint: body.languageHint,
  });

  res.status(201).json({
    data: {
      incident: serializeIncident(incident.toObject()),
      /** Per-stage timings so the submit screen can replay the real run. */
      pipeline: triage.pipeline,
      analysis: {
        engine: triage.analysisEngine,
        secondOpinion: triage.secondOpinion,
        similarityBackend: triage.similarityBackend,
        embeddingModel: triage.embeddingModel,
        processingMs: triage.processingMs,
        routingRule: triage.routing,
        duplicateOf: triage.duplicateOf,
      },
    },
  });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = validatedQuery<ListIncidentsQueryInput>(req);
  const { items, pagination } = await listIncidents(query);
  res.json({ data: serializeIncidents(items), pagination });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const incident = await getIncident(String(req.params.id));
  res.json({ data: serializeIncident(incident) });
});

export const getRelated = asyncHandler(async (req: Request, res: Response) => {
  const related = await getRelatedIncidents(String(req.params.id));
  res.json({ data: related });
});

/**
 * The un-redacted report. Separate endpoint on purpose: it is role-gated and every
 * reveal is written to the log, which is what the design note asks for.
 */
export const getOriginal = asyncHandler(async (req: Request, res: Response) => {
  const incidentId = String(req.params.id);
  const incident = await Incident.findOne({ incidentId }, { originalReport: 1, _id: 0 }).lean();
  if (!incident) throw ApiError.notFound(`Incident ${incidentId} not found`);

  logger.warn(
    `PII reveal: ${req.user?.email ?? "auth-disabled"} viewed the original report for ${incidentId}`,
  );

  res.json({
    data: {
      incidentId,
      originalReport: incident.originalReport,
      revealedBy: req.user?.email ?? null,
      revealedAt: new Date().toISOString(),
    },
  });
});

export const patch = asyncHandler(async (req: Request, res: Response) => {
  const incident = await updateIncident(String(req.params.id), req.body);
  res.json({ data: serializeIncident(incident) });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const result = await deleteIncident(String(req.params.id));
  res.json({ data: result });
});

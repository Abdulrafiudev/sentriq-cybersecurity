import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getDashboardStats } from "../services/incident.service";
import { pipelineMeta } from "../services/triage.service";
import { serializeIncidentSummary } from "../utils/serialize";

export const stats = asyncHandler(async (_req: Request, res: Response) => {
  const data = await getDashboardStats();
  res.json({
    data: {
      ...data,
      recent: data.recent.map((doc) => serializeIncidentSummary(doc as Record<string, unknown>)),
      pipeline: pipelineMeta(),
    },
  });
});

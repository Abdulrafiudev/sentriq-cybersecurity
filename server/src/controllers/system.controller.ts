import type { Request, Response } from "express";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler";
import { ROUTING_RULES } from "../services/routing.service";
import { pipelineMeta } from "../services/triage.service";
import { EvaluationRun } from "../models/EvaluationRun";
import { Incident } from "../models/Incident";
import { env } from "../config/env";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_STATUSES,
  INDICATOR_TYPES,
  RESPONSE_TEAMS,
  SEVERITY_LEVELS,
} from "../types/domain";

export const health = asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    data: {
      status: "ok",
      uptimeSeconds: Math.round(process.uptime()),
      database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      pipeline: pipelineMeta(),
      authEnabled: env.authEnabled,
      version: "1.0.0",
    },
  });
});

/** The vocabulary the client renders filters from — kept in one place. */
export const taxonomy = asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    data: {
      categories: INCIDENT_CATEGORIES,
      severities: SEVERITY_LEVELS,
      statuses: INCIDENT_STATUSES,
      teams: RESPONSE_TEAMS,
      indicatorTypes: INDICATOR_TYPES,
    },
  });
});

export const routingRules = asyncHandler(async (_req: Request, res: Response) => {
  // Show how much traffic each rule's destination team is actually carrying.
  const counts = await Incident.aggregate<{ _id: string; count: number }>([
    { $group: { _id: "$assignedTeam", count: { $sum: 1 } } },
  ]);
  const byTeam = new Map(counts.map((c) => [c._id, c.count]));

  res.json({
    data: {
      rules: ROUTING_RULES.map((rule) => ({
        ...rule,
        minSeverity: rule.minSeverity ?? null,
        incidentsRouted: byTeam.get(rule.team) ?? 0,
      })),
      teams: [...byTeam.entries()]
        .map(([team, count]) => ({ team, count }))
        .sort((a, b) => b.count - a.count),
    },
  });
});

export const latestEvaluation = asyncHandler(async (_req: Request, res: Response) => {
  const run = await EvaluationRun.findOne({}).sort({ createdAt: -1 }).lean();
  res.json({ data: run ?? null });
});

export const evaluationHistory = asyncHandler(async (_req: Request, res: Response) => {
  const runs = await EvaluationRun.find({}, { failures: 0, confusion: 0 })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  res.json({ data: runs });
});

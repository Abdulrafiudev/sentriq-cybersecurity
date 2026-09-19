import { apiClient } from "./apiClient";
import type { EvaluationRun, RoutingRule } from "@/types/incident";

export interface SystemHealth {
  status: string;
  uptimeSeconds: number;
  database: "connected" | "disconnected";
  authEnabled: boolean;
  version: string;
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

export async function fetchHealth(): Promise<SystemHealth> {
  const { data } = await apiClient.get<{ data: SystemHealth }>("/health");
  return data.data;
}

export async function fetchRoutingRules(): Promise<{
  rules: RoutingRule[];
  teams: Array<{ team: string; count: number }>;
}> {
  const { data } = await apiClient.get<{
    data: { rules: RoutingRule[]; teams: Array<{ team: string; count: number }> };
  }>("/routing-rules");
  return data.data;
}

export async function fetchLatestEvaluation(): Promise<EvaluationRun | null> {
  const { data } = await apiClient.get<{ data: EvaluationRun | null }>("/evaluation");
  return data.data;
}

import type { IncidentQuery } from "@/types/incident";

/** One source of truth for cache keys, so invalidation is never guesswork. */
export const queryKeys = {
  dashboard: ["dashboard", "stats"] as const,
  incidents: (query: IncidentQuery) => ["incidents", "list", query] as const,
  incidentsRoot: ["incidents"] as const,
  incident: (id: string) => ["incidents", "detail", id] as const,
  related: (id: string) => ["incidents", "related", id] as const,
  routingRules: ["system", "routing-rules"] as const,
  evaluation: ["system", "evaluation"] as const,
  health: ["system", "health"] as const,
  authConfig: ["auth", "config"] as const,
  me: ["auth", "me"] as const,
};

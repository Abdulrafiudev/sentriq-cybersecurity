import { useQuery } from "@tanstack/react-query";
import { fetchHealth, fetchLatestEvaluation, fetchRoutingRules } from "@/services/systemService";
import { queryKeys } from "./queryKeys";

export function useRoutingRules() {
  return useQuery({ queryKey: queryKeys.routingRules, queryFn: fetchRoutingRules });
}

export function useLatestEvaluation() {
  return useQuery({ queryKey: queryKeys.evaluation, queryFn: fetchLatestEvaluation });
}

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: fetchHealth,
    staleTime: 60_000,
    retry: false,
  });
}

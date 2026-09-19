import { useQuery } from "@tanstack/react-query";
import { fetchDashboardStats } from "@/services/dashboardService";
import { queryKeys } from "./queryKeys";

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: fetchDashboardStats,
    // The queue moves; a minute-old count is stale enough to mislead.
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

import { apiClient } from "./apiClient";
import type { DashboardStats } from "@/types/incident";

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get<{ data: DashboardStats }>("/dashboard/stats");
  return data.data;
}

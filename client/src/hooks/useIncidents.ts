import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchIncident,
  fetchIncidents,
  fetchRelatedIncidents,
  patchIncident,
  submitReport,
} from "@/services/incidentService";
import type { IncidentQuery, TriageSubmission } from "@/types/incident";
import { queryKeys } from "./queryKeys";

export function useIncidents(query: IncidentQuery) {
  return useQuery({
    queryKey: queryKeys.incidents(query),
    queryFn: () => fetchIncidents(query),
    // Keeping the previous page visible stops the table flashing on filter change.
    placeholderData: (previous) => previous,
  });
}

export function useIncident(incidentId: string) {
  return useQuery({
    queryKey: queryKeys.incident(incidentId),
    queryFn: () => fetchIncident(incidentId),
    enabled: Boolean(incidentId),
  });
}

export function useRelatedIncidents(incidentId: string) {
  return useQuery({
    queryKey: queryKeys.related(incidentId),
    queryFn: () => fetchRelatedIncidents(incidentId),
    enabled: Boolean(incidentId),
  });
}

export function useSubmitReport(options?: { onSuccess?: (result: TriageSubmission) => void }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitReport,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.incidentsRoot });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      options?.onSuccess?.(result);
    },
  });
}

export function useUpdateIncident(incidentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: Parameters<typeof patchIncident>[1]) => patchIncident(incidentId, patch),
    onSuccess: (incident) => {
      queryClient.setQueryData(queryKeys.incident(incidentId), incident);
      void queryClient.invalidateQueries({ queryKey: queryKeys.incidentsRoot });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

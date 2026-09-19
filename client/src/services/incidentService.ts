import { apiClient } from "./apiClient";
import type {
  Incident,
  IncidentQuery,
  IncidentStatus,
  LanguageHint,
  Pagination,
  RelatedIncident,
  ResponseTeam,
  Severity,
  TriageSubmission,
} from "@/types/incident";

/** Services own the HTTP call and return typed data. No React in here. */

interface Envelope<T> {
  data: T;
  pagination?: Pagination;
}

/** Arrays become repeated params so Express receives them as arrays. */
function toParams(query: IncidentQuery): Record<string, string | number | string[]> {
  const params: Record<string, string | number | string[]> = {};
  if (query.search?.trim()) params.search = query.search.trim();
  if (query.severity?.length) params.severity = query.severity;
  if (query.category?.length) params.category = query.category;
  if (query.status?.length) params.status = query.status;
  if (query.team?.length) params.team = query.team;
  if (query.filter && query.filter !== "All") params.filter = query.filter;
  if (query.sort) params.sort = query.sort;
  params.page = query.page ?? 1;
  params.limit = query.limit ?? 25;
  return params;
}

export async function fetchIncidents(
  query: IncidentQuery,
): Promise<{ items: Incident[]; pagination: Pagination }> {
  const { data } = await apiClient.get<Envelope<Incident[]>>("/incidents", {
    params: toParams(query),
    paramsSerializer: { indexes: null },
  });
  return {
    items: data.data,
    pagination: data.pagination ?? { page: 1, limit: 25, total: data.data.length, pages: 1 },
  };
}

export async function fetchIncident(incidentId: string): Promise<Incident> {
  const { data } = await apiClient.get<Envelope<Incident>>(`/incidents/${incidentId}`);
  return data.data;
}

export async function fetchRelatedIncidents(incidentId: string): Promise<RelatedIncident[]> {
  const { data } = await apiClient.get<Envelope<RelatedIncident[]>>(
    `/incidents/${incidentId}/related`,
  );
  return data.data;
}

export async function submitReport(input: {
  report: string;
  languageHint: LanguageHint;
}): Promise<TriageSubmission> {
  const { data } = await apiClient.post<Envelope<TriageSubmission>>("/incidents", input);
  return data.data;
}

export async function patchIncident(
  incidentId: string,
  patch: {
    status?: IncidentStatus;
    severity?: Severity;
    assignedTeam?: ResponseTeam;
    title?: string;
  },
): Promise<Incident> {
  const { data } = await apiClient.patch<Envelope<Incident>>(`/incidents/${incidentId}`, patch);
  return data.data;
}

export async function deleteIncident(incidentId: string): Promise<void> {
  await apiClient.delete(`/incidents/${incidentId}`);
}

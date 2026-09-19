/**
 * One place that decides what leaves the API. Two rules:
 *   - `embedding` never goes over the wire (large, and of no use to a browser).
 *   - `originalReport` is stripped from every payload. Revealing un-redacted text
 *     is its own endpoint, gated by role and logged.
 */

type AnyRecord = Record<string, unknown>;

export function serializeIncident(doc: AnyRecord) {
  const {
    _id,
    __v,
    embedding,
    originalReport,
    ...rest
  } = doc as AnyRecord & { _id?: unknown; __v?: unknown };

  void _id;
  void __v;
  void embedding;
  void originalReport;

  return {
    ...rest,
    /** Percentage form, which is what every screen renders. */
    confidencePct: Math.round(Number(rest.classificationConfidence ?? 0) * 100),
    hasOriginal: typeof originalReport === "string" && originalReport.length > 0,
  };
}

export function serializeIncidents(docs: AnyRecord[]) {
  return docs.map(serializeIncident);
}

/** Trimmed shape for tables and related-incident cards. */
export function serializeIncidentSummary(doc: AnyRecord) {
  const full = serializeIncident(doc) as AnyRecord & { confidencePct: number };
  return {
    incidentId: full.incidentId,
    title: full.title,
    incidentType: full.incidentType,
    severity: full.severity,
    status: full.status,
    assignedTeam: full.assignedTeam,
    confidencePct: full.confidencePct,
    language: full.language,
    createdAt: full.createdAt,
  };
}

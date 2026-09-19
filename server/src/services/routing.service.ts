import type { IncidentCategory, ResponseTeam, Severity } from "../types/domain";

/**
 * Step 7 of the pipeline. Routing is pure policy, so it stays as explicit code an
 * analyst can read and argue with — no model in the loop.
 */

export interface RoutingRule {
  id: string;
  category: IncidentCategory;
  team: ResponseTeam;
  /** Only applies at or above this severity; otherwise the category default wins. */
  minSeverity?: Severity;
  rationale: string;
}

const SEVERITY_RANK: Record<Severity, number> = { Low: 0, Medium: 1, High: 2, Critical: 3 };

/** Ordered — the first matching rule wins. */
export const ROUTING_RULES: RoutingRule[] = [
  {
    id: "r-breach-critical",
    category: "Data Breach",
    team: "Incident Response",
    rationale: "Any confirmed or suspected breach goes straight to Incident Response.",
  },
  {
    id: "r-phishing",
    category: "Phishing",
    team: "SOC / Phishing",
    rationale: "Standard phishing intake, including reports that never got as far as a click.",
  },
  {
    id: "r-malware",
    category: "Malware",
    team: "Malware Response",
    rationale: "Anything involving malicious code or ransomware.",
  },
  {
    id: "r-ato",
    category: "Account Takeover",
    team: "Identity / Fraud",
    rationale: "Someone else is operating the account — identity and fraud own the response.",
  },
  {
    id: "r-credential-theft",
    category: "Credential Theft",
    team: "Identity / Fraud",
    rationale: "Credential exposure is handled by the identity team regardless of the vector.",
  },
  {
    id: "r-unauthorized-high",
    category: "Unauthorized Access",
    team: "Incident Response",
    minSeverity: "High",
    rationale: "High-severity misuse of legitimate access needs a full investigation.",
  },
  {
    id: "r-unauthorized",
    category: "Unauthorized Access",
    team: "General SOC Queue",
    rationale: "Lower-severity access anomalies are triaged by the general queue first.",
  },
  {
    id: "r-fraud",
    category: "Fraud / Social Engineering",
    team: "Identity / Fraud",
    minSeverity: "High",
    rationale: "Fraud with real financial exposure goes to the fraud desk.",
  },
  {
    id: "r-fraud-low",
    category: "Fraud / Social Engineering",
    team: "General SOC Queue",
    rationale: "Attempted fraud with no loss is logged through the general queue.",
  },
  {
    id: "r-other",
    category: "Other",
    team: "General SOC Queue",
    rationale: "Unclassified reports default to the general queue for a human read.",
  },
];

export interface RoutingDecision {
  team: ResponseTeam;
  ruleId: string;
  rationale: string;
}

export function routeIncident(category: IncidentCategory, severity: Severity): RoutingDecision {
  const match = ROUTING_RULES.find(
    (rule) =>
      rule.category === category &&
      (rule.minSeverity === undefined ||
        SEVERITY_RANK[severity] >= SEVERITY_RANK[rule.minSeverity]),
  );

  if (!match) {
    return {
      team: "General SOC Queue",
      ruleId: "r-default",
      rationale: "No rule matched, so the incident falls through to the general queue.",
    };
  }

  return { team: match.team, ruleId: match.id, rationale: match.rationale };
}

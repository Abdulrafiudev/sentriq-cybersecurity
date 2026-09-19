import { SEVERITY_LEVELS, type IncidentCategory, type Indicator, type Severity } from "../types/domain";
import type { LlmAnalysis } from "./ai.service";

/**
 * Step 5 of the pipeline.
 *
 * Severity is the number analysts actually act on, so it is the stage least
 * suitable for an unchecked model. The rule engine below scores concrete impact
 * factors from the PRD (credential compromise, privilege, sensitive systems,
 * ransomware, financial loss, blast radius). GPT may raise severity when it sees
 * context the rules missed, but it may only lower it by one level — an escalation
 * the model cannot justify is safer than a missed critical.
 */

interface Factor {
  key: string;
  pattern: RegExp;
  weight: number;
  reason: string;
}

const FACTORS: Factor[] = [
  {
    key: "credentials_entered",
    pattern: /\b(entered|typed|gave|provided|submitted|put in|enter)\b[^.]{0,40}\b(password|pin|otp|code|credential|bvn|card detail)/i,
    weight: 4,
    reason: "credentials were entered",
  },
  {
    key: "credentials_entered_pidgin",
    pattern: /\b(enter|give|send)\b[^.]{0,25}\b(my |the )?(password|code|pin|otp)\b/i,
    weight: 4,
    reason: "credentials were handed over",
  },
  {
    key: "ransomware_active",
    pattern: /\b(ransom|encrypt(ed|ing)|files? (are |now )?lock|\.lokx|cannot open (my |the )?files)/i,
    weight: 5,
    reason: "encryption or a ransom demand is active",
  },
  {
    key: "funds_moved",
    pattern: /\b(money|funds|₦|ngn|naira|\$)\b[^.]{0,40}\b(gone|missing|transferred|debited|withdraw|waka|disappear|already sent|already paid)/i,
    weight: 5,
    reason: "funds have already moved",
  },
  {
    key: "privileged_account",
    pattern: /\b(admin|administrator|domain admin|root|privileged|service account|superuser)\b/i,
    weight: 4,
    reason: "a privileged account is involved",
  },
  {
    key: "sensitive_system",
    pattern: /\b(treasury|payroll|citizen|patient|core banking|swift|database|records? api|hr system|finance department|financial system|beneficiary)\b/i,
    weight: 3,
    reason: "a sensitive system is in scope",
  },
  {
    key: "data_exposed",
    pattern: /\b(exfiltrat|leaked|published|posted online|dark web|for sale|downloaded (the )?(record|database))/i,
    weight: 5,
    reason: "data is confirmed exposed",
  },
  {
    key: "account_compromised",
    pattern: /\b(someone|person|they)\b[^.]{0,40}\b(logged in|accessed|controlling|using my account)|\bunrecogni[sz]ed (login|session)|\bperson don enter my account\b/i,
    weight: 3.5,
    reason: "an unauthorised session was observed",
  },
  {
    key: "many_users",
    pattern: /\b(several|multiple|many|all|both|two|three|four|five|\d{2,}) (staff|users|colleagues|people|employees|department)/i,
    weight: 3,
    reason: "multiple users are affected",
  },
  {
    key: "lateral_spread",
    pattern: /\b(spread|other (machines|computers|systems)|shared (drive|folder)|network drive)\b/i,
    weight: 2.5,
    reason: "there is potential for lateral spread",
  },
  {
    key: "malware_executed",
    pattern: /\b(opened|ran|executed|double[- ]clicked|enabled (the )?macro)\b[^.]{0,40}\b(attachment|file|invoice|macro|exe)/i,
    weight: 3,
    reason: "a malicious file was executed",
  },
];

/** Each of these caps severity, because they are evidence that nothing landed. */
const MITIGATIONS: Factor[] = [
  {
    key: "blocked_upstream",
    pattern: /\b(blocked|quarantined|stopped|filtered|rejected|prevented)\b[^.]{0,40}\b(gateway|firewall|antivirus|spam|mail|before)/i,
    weight: 4,
    reason: "the attempt was blocked upstream",
  },
  {
    key: "no_interaction",
    pattern: /\b(did ?n[o']t|no one|nobody|never)\b[^.]{0,30}\b(click|open|reply|respond|enter|pay)/i,
    weight: 4,
    reason: "nobody interacted with it",
  },
  {
    key: "contained",
    pattern: /\b(revoked|reset|disabled|isolated|contained|quarantined|changed my password|account (was )?locked|session was (killed|terminated|ended))\b/i,
    weight: 2.5,
    reason: "access has been revoked or reset",
  },
  {
    key: "no_loss",
    pattern: /\b(no (money|funds|payment|data)|nothing (was )?(lost|taken|paid)|(payment|transfer) (was )?not (made|sent)|(has|have) not made the payment)\b/i,
    weight: 3,
    reason: "no confirmed loss",
  },
];

/** Baseline weight per category, before report-specific factors. */
const CATEGORY_BASE: Record<IncidentCategory, number> = {
  Phishing: 4,
  Malware: 4,
  "Account Takeover": 5,
  "Credential Theft": 5,
  "Unauthorized Access": 4,
  "Data Breach": 6,
  "Fraud / Social Engineering": 4,
  Other: 1.5,
};

export interface SeverityAssessment {
  severity: Severity;
  reason: string;
  score: number;
  factors: string[];
  mitigations: string[];
}

export function scoreSeverityWithRules(
  report: string,
  category: IncidentCategory,
  indicators: Indicator[],
): SeverityAssessment {
  let score = CATEGORY_BASE[category] ?? 2;
  const factors: string[] = [];
  const mitigations: string[] = [];

  for (const factor of FACTORS) {
    if (factor.pattern.test(report)) {
      score += factor.weight;
      factors.push(factor.reason);
    }
  }

  for (const mitigation of MITIGATIONS) {
    if (mitigation.pattern.test(report)) {
      score -= mitigation.weight;
      mitigations.push(mitigation.reason);
    }
  }

  // A report with hard technical evidence is marginally more actionable.
  if (indicators.some((i) => i.type === "HASH" || i.type === "IP")) score += 0.5;

  const severity: Severity =
    score >= 11 ? "Critical" : score >= 7.5 ? "High" : score >= 4 ? "Medium" : "Low";

  return { severity, reason: buildReason(severity, factors, mitigations), score: Number(score.toFixed(2)), factors, mitigations };
}

function buildReason(severity: Severity, factors: string[], mitigations: string[]): string {
  const list = (items: string[]) =>
    items.length <= 1
      ? items[0] ?? ""
      : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

  if (factors.length === 0 && mitigations.length === 0) {
    return `Scored ${severity} on the baseline for this category. The report contains no explicit impact or containment detail, so it is placed conservatively pending analyst review.`;
  }

  const head = factors.length
    ? `Severity is ${severity} because ${list(factors)}.`
    : `Severity is ${severity} on category baseline alone.`;

  const tail = mitigations.length
    ? ` Rating is held down because ${list(mitigations)}.`
    : severity === "Critical" || severity === "High"
      ? " No containment was reported, so compromise is assumed until confirmed otherwise."
      : "";

  return head + tail;
}

const RANK: Record<Severity, number> = { Low: 0, Medium: 1, High: 2, Critical: 3 };

/**
 * GPT may escalate freely; it may de-escalate by at most one level. That asymmetry
 * is deliberate — under-calling a real compromise costs far more than over-calling.
 */
export function reconcileSeverity(
  llm: LlmAnalysis | null,
  rules: SeverityAssessment,
): { severity: Severity; reason: string; adjusted: boolean } {
  if (!llm || !SEVERITY_LEVELS.includes(llm.severity)) {
    return { severity: rules.severity, reason: rules.reason, adjusted: false };
  }

  const floorRank = Math.max(0, RANK[rules.severity] - 1);
  const chosenRank = Math.max(floorRank, RANK[llm.severity]);
  const severity = SEVERITY_LEVELS.find((s) => RANK[s] === chosenRank) ?? rules.severity;

  if (severity === llm.severity) {
    const agreement =
      llm.severity === rules.severity
        ? ""
        : ` The rule engine independently scored this ${rules.severity} (${rules.score}).`;
    return { severity, reason: llm.severityReason + agreement, adjusted: llm.severity !== rules.severity };
  }

  // The model tried to drop more than one level; the floor held.
  return {
    severity,
    reason: `${rules.reason} The model proposed ${llm.severity}, but Sentriq does not allow a downgrade of more than one level from the rule score, so this is held at ${severity}.`,
    adjusted: true,
  };
}

import type { RedactionEntity } from "../types/domain";
import { PATTERNS, dropOverlaps, findAll, isPlausibleDomain, type Span } from "./patterns";
import type { LlmAnalysis } from "./ai.service";

/**
 * Step 2 of the pipeline. PII is removed before anything else runs, so every later
 * stage (classification, embedding, storage, the dashboard) only ever sees the
 * redacted text.
 *
 * Hybrid by design: regex owns the predictable shapes (phone, email, account, ID,
 * money) because they must never be missed; GPT contributes the contextual ones
 * (people's names, internal system names, addresses) that have no stable form.
 *
 * Technical indicators (URL, IP, domain, hash) are deliberately NOT redacted. They
 * are indicators of compromise rather than personal data, and analysts need them
 * visible to act. Set REDACT_TECHNICAL=true to redact them too.
 */

const REDACT_TECHNICAL = ["1", "true", "yes"].includes(
  (process.env.REDACT_TECHNICAL ?? "").toLowerCase(),
);

const TOKEN: Record<RedactionEntity["type"], string> = {
  NAME: "[NAME_REDACTED]",
  PHONE: "[PHONE_REDACTED]",
  EMAIL: "[EMAIL_REDACTED]",
  ACCOUNT: "[ACCOUNT_REDACTED]",
  ADDRESS: "[ADDRESS_REDACTED]",
  AMOUNT: "[AMOUNT]",
  IP: "[IP_REDACTED]",
  URL: "[URL]",
  ORG_SYSTEM: "[ORG_SYSTEM]",
  ID_NUMBER: "[ID_REDACTED]",
};

const HUMAN_LABEL: Record<RedactionEntity["type"], string> = {
  NAME: "staff name",
  PHONE: "phone",
  EMAIL: "email",
  ACCOUNT: "account number",
  ADDRESS: "address",
  AMOUNT: "financial amount",
  IP: "IP",
  URL: "URL",
  ORG_SYSTEM: "system name",
  ID_NUMBER: "ID number",
};

/** Brand names that look like system names but are public knowledge, not PII. */
const PUBLIC_BRANDS = new Set([
  "gmail", "yahoo", "outlook", "whatsapp", "facebook", "instagram", "twitter", "x",
  "telegram", "microsoft", "google", "apple", "android", "windows", "zoom", "slack",
  "mtn", "glo", "airtel", "9mobile", "visa", "mastercard",
]);

type Candidate = Span & { type: RedactionEntity["type"]; source: "rules" | "llm" };

function ruleCandidates(text: string): Candidate[] {
  const out: Candidate[] = [];
  const push = (type: RedactionEntity["type"], spans: Span[], source: "rules" | "llm" = "rules") => {
    for (const span of spans) out.push({ ...span, type, source });
  };

  // Order matters only for readability; overlaps are resolved by span length below.
  push("EMAIL", findAll(text, PATTERNS.email));
  push("PHONE", findAll(text, PATTERNS.phone));
  push("AMOUNT", findAll(text, PATTERNS.amount));
  push("ID_NUMBER", findAll(text, PATTERNS.idNumber));
  push("ACCOUNT", findAll(text, PATTERNS.account));

  if (REDACT_TECHNICAL) {
    push("URL", findAll(text, PATTERNS.url));
    push("IP", findAll(text, PATTERNS.ipv4));
  }

  return out;
}

/** Locates every verbatim occurrence of an LLM-reported entity inside the text. */
function llmCandidates(text: string, analysis: LlmAnalysis | null): Candidate[] {
  if (!analysis) return [];
  const out: Candidate[] = [];

  for (const entity of analysis.piiEntities) {
    const value = (entity.value ?? "").trim();
    if (value.length < 2) continue;

    const type = (entity.type as RedactionEntity["type"]) ?? "NAME";
    if (!(type in TOKEN)) continue;
    if (type === "ORG_SYSTEM" && PUBLIC_BRANDS.has(value.toLowerCase())) continue;
    // Single common words would shred the report; require a proper noun or multi-word value.
    if (type === "NAME" && !/^[A-Z]/.test(value)) continue;

    let from = 0;
    for (;;) {
      const at = text.indexOf(value, from);
      if (at === -1) break;
      out.push({ start: at, end: at + value.length, value, type, source: "llm" });
      from = at + value.length;
    }
  }

  return out;
}

export interface RedactionResult {
  redactedReport: string;
  entities: RedactionEntity[];
  /** Analyst-facing summary, e.g. "4 entities redacted — 1 email, 1 phone…". */
  note: string;
}

export function redact(text: string, analysis: LlmAnalysis | null = null): RedactionResult {
  const candidates = [...ruleCandidates(text), ...llmCandidates(text, analysis)].filter((c) => {
    // A bare domain caught as an "account" or similar is not PII.
    if (c.type === "ACCOUNT" && isPlausibleDomain(c.value)) return false;
    return true;
  });

  const spans = dropOverlaps(candidates);
  const entities: RedactionEntity[] = [];

  // Replace right-to-left so earlier offsets stay valid.
  let redactedReport = text;
  for (const span of [...spans].sort((a, b) => b.start - a.start)) {
    redactedReport =
      redactedReport.slice(0, span.start) + TOKEN[span.type] + redactedReport.slice(span.end);
    entities.unshift({
      type: span.type,
      token: TOKEN[span.type],
      original: span.value,
      source: span.source,
    });
  }

  return { redactedReport, entities, note: buildNote(entities) };
}

function buildNote(entities: RedactionEntity[]): string {
  if (entities.length === 0) return "No personal data detected in this report.";

  const counts = new Map<RedactionEntity["type"], number>();
  for (const e of entities) counts.set(e.type, (counts.get(e.type) ?? 0) + 1);

  const parts = [...counts.entries()].map(([type, count]) => {
    const label = HUMAN_LABEL[type];
    return `${count} ${count === 1 ? label : `${label}s`}`;
  });

  const noun = entities.length === 1 ? "entity" : "entities";
  return `${entities.length} ${noun} redacted — ${parts.join(", ")}.`;
}

/** Re-applies known replacements, used when re-processing a stored report. */
export function countByType(entities: RedactionEntity[]): Record<string, number> {
  return entities.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1;
    return acc;
  }, {});
}

import type { Indicator, IndicatorType } from "../types/domain";
import type { LlmAnalysis } from "./ai.service";
import { INDICATOR_TYPES } from "../types/domain";
import { PATTERNS, findAll, hostnameOf, isPlausibleDomain, refang } from "./patterns";

/**
 * Step 4 of the pipeline. Regex finds every indicator with a fixed shape; GPT adds
 * the ones that only context reveals (affected systems, named accounts). Rule hits
 * win on conflict, and the model can never remove a rule-extracted value.
 *
 * Indicators are extracted from the ORIGINAL report — redaction may replace an
 * email address with a token, but the sender address is still evidence.
 */

const MAX_VALUE_LENGTH = 300;

function normalizeType(raw: string): IndicatorType | null {
  const upper = (raw ?? "").toUpperCase().trim();
  return (INDICATOR_TYPES as readonly string[]).includes(upper) ? (upper as IndicatorType) : null;
}

function keyOf(type: IndicatorType, value: string): string {
  return `${type}:${refang(value).toLowerCase().replace(/[/.]+$/, "")}`;
}

export function extractIndicators(
  originalReport: string,
  analysis: LlmAnalysis | null = null,
): Indicator[] {
  const byKey = new Map<string, Indicator>();

  const add = (type: IndicatorType, rawValue: string, source: "rules" | "llm") => {
    const value = rawValue.trim().replace(/[.,;:)\]]+$/, "");
    if (value.length === 0 || value.length > MAX_VALUE_LENGTH) return;
    const key = keyOf(type, value);
    const existing = byKey.get(key);
    // Rules outrank the model for the same value.
    if (existing && !(existing.source === "llm" && source === "rules")) return;
    byKey.set(key, { type, value, source });
  };

  // --- Rules ---------------------------------------------------------------
  const urls = findAll(originalReport, PATTERNS.url);
  for (const span of urls) add("URL", span.value, "rules");

  for (const span of findAll(originalReport, PATTERNS.ipv4)) add("IP", span.value, "rules");
  for (const span of findAll(originalReport, PATTERNS.hash)) add("HASH", span.value, "rules");
  for (const span of findAll(originalReport, PATTERNS.email)) {
    add("EMAIL", span.value, "rules");
    const domain = span.value.split("@")[1];
    if (domain && isPlausibleDomain(domain)) add("DOMAIN", domain, "rules");
  }

  // Domains: those inside a URL, plus bare ones the text mentions directly.
  for (const span of urls) {
    const host = hostnameOf(span.value);
    if (host) add("DOMAIN", host, "rules");
  }
  const urlRanges = urls.map((u) => [u.start, u.end] as const);
  for (const span of findAll(originalReport, PATTERNS.domain)) {
    const insideUrl = urlRanges.some(([s, e]) => span.start >= s && span.end <= e);
    if (insideUrl || !isPlausibleDomain(span.value)) continue;
    // Skip a domain that is only the tail of an email address already captured.
    if (originalReport[span.start - 1] === "@") continue;
    add("DOMAIN", span.value, "rules");
  }

  // --- Model ---------------------------------------------------------------
  for (const item of analysis?.indicators ?? []) {
    const type = normalizeType(item.type);
    if (!type) continue;
    // Predictable shapes are the rules' job; trust the model only for the rest.
    if (type !== "SYSTEM" && type !== "ACCOUNT") {
      const alreadyKnown = byKey.has(keyOf(type, item.value));
      if (!alreadyKnown && !originalReport.includes(item.value.trim())) continue;
    }
    add(type, item.value, "llm");
  }

  const order: Record<IndicatorType, number> = {
    URL: 0,
    DOMAIN: 1,
    IP: 2,
    EMAIL: 3,
    HASH: 4,
    SYSTEM: 5,
    ACCOUNT: 6,
  };
  return [...byKey.values()].sort(
    (a, b) => order[a.type] - order[b.type] || a.value.localeCompare(b.value),
  );
}

/**
 * Deterministic patterns for the "rules" half of the hybrid pipeline (PRD §11).
 * Anything with a stable shape is matched here, never left to the model.
 */

export const PATTERNS = {
  /** http(s) URLs, including the defanged `[.]` form seen in analyst reports. */
  url: /\bhttps?:\/\/[^\s<>"')\]]+/gi,
  /** Bare domains (no scheme). Filtered against a TLD allow-list before use. */
  domain: /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\[\.\]|\.))+[a-z]{2,24}\b/gi,
  email: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}\b/gi,
  ipv4: /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g,
  /** MD5 / SHA-1 / SHA-256 hex digests. */
  hash: /\b(?:[a-f0-9]{64}|[a-f0-9]{40}|[a-f0-9]{32})\b/gi,
  /**
   * Nigerian mobile numbers: 08012345678, +2348012345678, 0801 234 5678.
   * The national number is always 10 digits after the 0 or the +234, starting
   * 7/8/9 — writing it as a 3-digit network prefix plus 3 plus 4 is what makes
   * the spaced and hyphenated forms match as well as the run-together one.
   */
  phone: /(?:\+?234[\s-]?|\b0)[789]\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/g,
  /** 10-digit NUBAN bank account numbers. */
  account: /\b\d{10}\b/g,
  /** Money: ₦120,000 / NGN 120000 / N120,000 / $4,500. */
  amount: /(?:₦|NGN\s?|N(?=\d)|\$)\s?\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?\b/gi,
  /** BVN / NIN style 11-digit identifiers. */
  idNumber: /\b\d{11}\b/g,
} as const;

/** TLDs we accept for bare-domain matches, to avoid catching "e.g." or "no.1". */
const DOMAIN_TLDS = new Set([
  "com", "net", "org", "io", "co", "ng", "gov", "edu", "info", "biz", "xyz", "top",
  "online", "site", "shop", "app", "dev", "live", "cc", "me", "us", "uk", "africa",
]);

export function refang(value: string): string {
  return value.replace(/\[\.\]/g, ".").replace(/\[:\/\/\]/g, "://").replace(/hxxp/gi, "http");
}

export function isPlausibleDomain(value: string): boolean {
  const parts = refang(value).toLowerCase().split(".");
  const tld = parts[parts.length - 1];
  return parts.length >= 2 && tld !== undefined && DOMAIN_TLDS.has(tld);
}

export function hostnameOf(url: string): string | null {
  try {
    return new URL(refang(url)).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export interface Span {
  start: number;
  end: number;
  value: string;
}

export function findAll(text: string, pattern: RegExp): Span[] {
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  const out: Span[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[0].length === 0) {
      re.lastIndex += 1;
      continue;
    }
    out.push({ start: m.index, end: m.index + m[0].length, value: m[0] });
  }
  return out;
}

/** Keeps the earliest, longest span when two matches overlap. */
export function dropOverlaps<T extends Span>(spans: T[]): T[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const kept: T[] = [];
  let cursor = -1;
  for (const span of sorted) {
    if (span.start >= cursor) {
      kept.push(span);
      cursor = span.end;
    }
  }
  return kept;
}

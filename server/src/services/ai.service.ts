import OpenAI from "openai";
import { env, llmEnabled } from "../config/env";
import { logger } from "../utils/logger";
import { INCIDENT_CATEGORIES, REPORT_LANGUAGES, SEVERITY_LEVELS } from "../types/domain";

/**
 * Thin wrapper around the GPT API. Every LLM call in Sentriq goes through here so
 * the model, timeouts, retries, structured-output contract and the offline
 * fallback all live in one place.
 *
 * If OPENAI_API_KEY is unset the whole server still runs: callers fall back to the
 * deterministic heuristic engine, so demos and tests never depend on the network.
 */

let client: OpenAI | null = null;
if (llmEnabled) {
  client = new OpenAI({
    apiKey: env.openaiApiKey,
    timeout: env.openaiTimeoutMs,
    maxRetries: env.openaiMaxRetries,
  });
}

export function isLlmAvailable(): boolean {
  return client !== null;
}

/** What GPT is asked to produce for a single report. */
export interface LlmAnalysis {
  title: string;
  language: (typeof REPORT_LANGUAGES)[number];
  category: (typeof INCIDENT_CATEGORIES)[number];
  categoryConfidence: number;
  categoryExplanation: string;
  severity: (typeof SEVERITY_LEVELS)[number];
  severityReason: string;
  piiEntities: Array<{ type: string; value: string }>;
  indicators: Array<{ type: string; value: string }>;
}

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "language",
    "category",
    "categoryConfidence",
    "categoryExplanation",
    "severity",
    "severityReason",
    "piiEntities",
    "indicators",
  ],
  properties: {
    title: {
      type: "string",
      description:
        "A neutral 6-12 word analyst headline describing what happened. No personal names, no quotes.",
    },
    language: { type: "string", enum: [...REPORT_LANGUAGES] },
    category: { type: "string", enum: [...INCIDENT_CATEGORIES] },
    categoryConfidence: { type: "number", description: "Confidence in the category, 0 to 1." },
    categoryExplanation: {
      type: "string",
      description: "Two sentences max explaining the signals behind the category.",
    },
    severity: { type: "string", enum: [...SEVERITY_LEVELS] },
    severityReason: {
      type: "string",
      description: "Two sentences max explaining the severity, citing impact and containment.",
    },
    piiEntities: {
      type: "array",
      description:
        "Personal or organisation-identifying substrings copied verbatim from the report.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "value"],
        properties: {
          type: {
            type: "string",
            enum: [
              "NAME",
              "PHONE",
              "EMAIL",
              "ACCOUNT",
              "ADDRESS",
              "AMOUNT",
              "ORG_SYSTEM",
              "ID_NUMBER",
            ],
          },
          value: { type: "string", description: "Exact substring as it appears in the report." },
        },
      },
    },
    indicators: {
      type: "array",
      description: "Technical indicators of compromise copied verbatim from the report.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "value"],
        properties: {
          type: {
            type: "string",
            enum: ["IP", "URL", "DOMAIN", "EMAIL", "HASH", "SYSTEM", "ACCOUNT"],
          },
          value: { type: "string" },
        },
      },
    },
  },
} as const;

const SYSTEM_PROMPT = [
  "You are Sentriq's triage analyst for a national cybersecurity operations centre.",
  "You read raw incident reports written by non-technical staff and members of the public.",
  "Reports arrive in standard English, Nigerian Pidgin, or a mix of both. Treat Pidgin as a first-class language and never dismiss a report because of its phrasing.",
  "",
  "Return one JSON object matching the provided schema. Rules:",
  "",
  "CATEGORY: choose exactly one allowed value. Use Other only when nothing else fits, never as a hedge.",
  "- Phishing: a deceptive message trying to get the reader to click, log in, or hand over a code.",
  "- Credential Theft: credentials were captured, but not through a deceptive message (keylogger, shoulder surfing, shared password).",
  "- Account Takeover: someone is already operating the victim's account.",
  "- Malware: malicious software, ransomware, infected attachments.",
  "- Unauthorized Access: a legitimate account or system reached data it should not have.",
  "- Data Breach: data confirmed exposed or exfiltrated.",
  "- Fraud / Social Engineering: deception aimed at money or a process change, with no technical vector.",
  "If a phishing message led to a confirmed takeover, prefer Account Takeover. Classify by the furthest stage actually reached.",
  "",
  "CONFIDENCE: an honest probability between 0 and 1. Vague or contradictory reports must score below 0.7. Do not default to 0.9.",
  "",
  "SEVERITY: apply these thresholds exactly.",
  "- Critical: confirmed compromise, privileged access, active ransomware or encryption, funds already moved, or sensitive records confirmed exposed.",
  "- High: credentials were entered or sensitive systems were reachable, and containment is unconfirmed.",
  "- Medium: an attempt was observed, nothing executed, no confirmed loss.",
  "- Low: blocked upstream, a duplicate, or benign after review.",
  "",
  "PII: list personal or organisation-identifying substrings exactly as written, so they can be located and replaced. Include people's names, phone numbers, emails, account numbers, addresses, money amounts, national ID numbers, and internal system or application names (ORG_SYSTEM). Do not include public brand names of banks or telcos. Do not invent values that are not in the text.",
  "",
  "INDICATORS: technical values only, copied verbatim. IPs, URLs, domains, sender email addresses, file hashes, and affected systems. Do not normalise or defang them.",
  "",
  "Never fabricate detail the report does not contain. If the report is benign, say so through a Low severity and a low-confidence category rather than inventing an attack.",
].join("\n");

/** Some models only accept the default temperature; detected once and remembered. */
let supportsTemperature = true;

/** Calls GPT once for the full analysis. Returns null when unavailable or malformed. */
export async function analyzeWithLlm(report: string): Promise<LlmAnalysis | null> {
  if (!client) return null;

  const request = (withTemperature: boolean) =>
    client!.chat.completions.create({
      model: env.openaiModel,
      // Triage should be reproducible; near-zero temperature, not creative writing.
      ...(withTemperature ? { temperature: 0.1 } : {}),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Incident report:\n<report>\n${report.slice(0, 8000)}\n</report>` },
      ],
      response_format: {
        type: "json_schema" as const,
        json_schema: { name: "sentriq_analysis", strict: true, schema: ANALYSIS_SCHEMA },
      },
    });

  try {
    let completion;
    try {
      completion = await request(supportsTemperature);
    } catch (error) {
      // Retry without it rather than losing the whole analysis over one parameter.
      if (supportsTemperature && isUnsupportedTemperature(error)) {
        logger.warn(`${env.openaiModel} rejects a custom temperature; using the default`);
        supportsTemperature = false;
        completion = await request(false);
      } else {
        throw error;
      }
    }

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LlmAnalysis;
    return {
      ...parsed,
      categoryConfidence: Math.min(1, Math.max(0, Number(parsed.categoryConfidence) || 0)),
      piiEntities: Array.isArray(parsed.piiEntities) ? parsed.piiEntities : [],
      indicators: Array.isArray(parsed.indicators) ? parsed.indicators : [],
    };
  } catch (error) {
    logger.warn("GPT analysis failed, falling back to the heuristic engine", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function isUnsupportedTemperature(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /temperature/i.test(message) && /(unsupported|not supported|does not support)/i.test(message);
}

/** Embedding for related-incident search. Returns null when unavailable. */
export async function embedWithLlm(text: string): Promise<number[] | null> {
  if (!client) return null;
  try {
    const response = await client.embeddings.create({
      model: env.openaiEmbeddingModel,
      input: text.slice(0, 8000),
    });
    const vector = response.data[0]?.embedding;
    return Array.isArray(vector) ? vector : null;
  } catch (error) {
    logger.warn("GPT embedding failed, falling back to the lexical vector", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export const aiMeta = {
  model: env.openaiModel,
  embeddingModel: env.openaiEmbeddingModel,
  get enabled() {
    return client !== null;
  },
};

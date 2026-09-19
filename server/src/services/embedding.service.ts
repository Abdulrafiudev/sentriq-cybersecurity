import { env } from "../config/env";
import { embedWithLlm } from "./ai.service";
import { l2Normalize } from "../utils/vector";

/**
 * Turns a redacted report into a dense vector for related-incident search.
 *
 * Primary path is the GPT embedding model. The fallback is a deterministic hashed
 * bag-of-bigrams vector — genuinely useful for near-duplicate detection (the case
 * that matters most for this product) and it keeps the demo working with no key.
 */

const FALLBACK_DIMS = 512;

/** Words too common in incident reports to carry any signal. */
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "to", "of", "in", "on", "at", "for",
  "with", "my", "me", "i", "it", "is", "was", "were", "be", "been", "that", "this",
  "there", "then", "they", "them", "he", "she", "we", "you", "have", "has", "had",
  "do", "did", "not", "no", "so", "from", "by", "as", "said", "say", "am", "dey",
  "wey", "na", "don", "go", "make", "una", "abeg",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\[[a-z_]+\]/g, " ") // redaction tokens carry no topical signal
    .replace(/[^a-z0-9\s.@:/-]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.\-/]+|[.\-/]+$/g, ""))
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/** FNV-1a — small, fast, and stable across processes. */
function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function lexicalEmbedding(text: string, dims = FALLBACK_DIMS): number[] {
  const vector = new Array<number>(dims).fill(0);
  const tokens = tokenize(text);

  // Unsigned counts. Signed hashing cancels shared terms and collapses the score
  // range, which is exactly the signal near-duplicate detection depends on.
  const bump = (term: string, weight: number) => {
    const index = hash(term) % dims;
    vector[index] = (vector[index] ?? 0) + weight;
  };

  for (const token of tokens) bump(token, 1);
  // Bigrams sharpen exact-duplicate detection but punish paraphrase, so they are
  // a minority of the signal. 0.4 measured best on the synthetic dataset.
  for (let i = 0; i < tokens.length - 1; i += 1) bump(`${tokens[i]}_${tokens[i + 1]}`, 0.4);

  // Sublinear scaling, so one repeated word cannot dominate the vector.
  for (let i = 0; i < dims; i += 1) {
    const v = vector[i] ?? 0;
    vector[i] = v > 0 ? 1 + Math.log(v) : 0;
  }

  return l2Normalize(vector);
}

/**
 * Which vector space a report was embedded into. Cosine values are not comparable
 * between the two, so thresholds are chosen per space rather than globally.
 */
export type EmbeddingSpace = "semantic" | "lexical";

export interface EmbeddingResult {
  vector: number[];
  model: string;
  space: EmbeddingSpace;
}

export async function embedReport(text: string): Promise<EmbeddingResult> {
  const remote = await embedWithLlm(text);
  if (remote && remote.length > 0) {
    return { vector: l2Normalize(remote), model: env.openaiEmbeddingModel, space: "semantic" };
  }
  return { vector: lexicalEmbedding(text), model: "sentriq-lexical-v1", space: "lexical" };
}

/**
 * Thresholds per space, measured against the labelled dataset:
 *   semantic — unrelated reports sit well below 0.5, near-duplicates above 0.85.
 *   lexical  — unrelated sit under 0.1, duplicates in the 0.33–0.48 band.
 */
export function thresholdsFor(space: EmbeddingSpace): {
  related: number;
  duplicate: number;
  relatedThreshold: number;
  duplicateThreshold: number;
} {
  const [related, duplicate] =
    space === "semantic"
      ? [env.similarityThreshold, env.duplicateThreshold]
      : [env.lexicalSimilarityThreshold, env.lexicalDuplicateThreshold];
  // Both names are exposed because callers read it either as a policy or as
  // a value to hand straight back to the client.
  return { related, duplicate, relatedThreshold: related, duplicateThreshold: duplicate };
}

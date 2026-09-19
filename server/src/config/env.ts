import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function str(key: string, fallback: string): string {
  const v = process.env[key];
  return v === undefined || v === "" ? fallback : v;
}

function num(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

export const env = {
  nodeEnv: str("NODE_ENV", "development"),
  isProd: str("NODE_ENV", "development") === "production",
  port: num("PORT", 4000),

  mongoUri: str("MONGODB_URI", "mongodb://127.0.0.1:27017/sentriq"),

  /** Comma-separated list of allowed browser origins. */
  corsOrigins: str("CORS_ORIGIN", "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  jwtSecret: str("JWT_SECRET", "sentriq-dev-secret-change-me"),
  jwtExpiresIn: str("JWT_EXPIRES_IN", "12h"),
  /** Turn auth off only for local demos. */
  authEnabled: bool("AUTH_ENABLED", true),

  adminEmail: str("ADMIN_EMAIL", "analyst@sentriq.io"),
  adminPassword: str("ADMIN_PASSWORD", "sentriq-demo"),
  adminName: str("ADMIN_NAME", "A. Ibrahim"),

  /** OpenAI (GPT) — the LLM half of the hybrid rules + AI pipeline. */
  openaiApiKey: str("OPENAI_API_KEY", ""),
  openaiModel: str("OPENAI_MODEL", "gpt-4o-mini"),
  openaiEmbeddingModel: str("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
  openaiTimeoutMs: num("OPENAI_TIMEOUT_MS", 45_000),
  openaiMaxRetries: num("OPENAI_MAX_RETRIES", 2),

  /** Atlas Vector Search index name. Falls back to in-process cosine when off. */
  vectorSearchEnabled: bool("VECTOR_SEARCH_ENABLED", false),
  vectorIndexName: str("VECTOR_INDEX_NAME", "incident_embedding_index"),
  /** Cosine similarity at or above this is reported as a related incident. */
  similarityThreshold: num("SIMILARITY_THRESHOLD", 0.55),
  /** At or above this, the incoming report is treated as a duplicate and merged. */
  duplicateThreshold: num("DUPLICATE_THRESHOLD", 0.9),
  /** The lexical fallback lives on a different scale, so it has its own pair. */
  lexicalSimilarityThreshold: num("LEXICAL_SIMILARITY_THRESHOLD", 0.28),
  lexicalDuplicateThreshold: num("LEXICAL_DUPLICATE_THRESHOLD", 0.45),
  similarityCandidateLimit: num("SIMILARITY_CANDIDATE_LIMIT", 400),
  maxRelatedIncidents: num("MAX_RELATED_INCIDENTS", 3),

  rateLimitWindowMs: num("RATE_LIMIT_WINDOW_MS", 60_000),
  rateLimitMax: num("RATE_LIMIT_MAX", 120),
} as const;

/** True when a real GPT key is configured; otherwise the deterministic engine runs. */
export const llmEnabled = env.openaiApiKey.length > 0;

import { createApp } from "./app";
import { env, llmEnabled } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./config/db";
import { ensureAdminUser } from "./services/auth.service";
import { seedDatabase } from "./services/seed.service";
import { runEvaluation } from "./services/evaluation.service";
import { Incident } from "./models/Incident";
import { logger } from "./utils/logger";

/**
 * `--seed` / SEED_ON_START fills an empty database on boot. Useful with the
 * in-memory MongoDB, where every start is a clean slate. Existing data is never
 * touched — if the queue already has incidents, this does nothing.
 */
async function seedIfRequested() {
  const requested =
    process.argv.includes("--seed") ||
    ["1", "true", "yes"].includes((process.env.SEED_ON_START ?? "").toLowerCase());
  if (!requested) return;

  if ((await Incident.estimatedDocumentCount()) > 0) {
    logger.info("Database already has incidents, skipping the boot seed");
    return;
  }

  await seedDatabase({ quiet: true });
  // Also populate the Evaluation screen, so a fresh demo has every view filled.
  await runEvaluation({ quiet: true });
}

async function main() {
  await connectDatabase();
  await ensureAdminUser();
  await seedIfRequested();

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info(`Sentriq API listening on http://localhost:${env.port}`);
    logger.info(
      llmEnabled
        ? `AI engine: GPT (${env.openaiModel}) + rules, embeddings via ${env.openaiEmbeddingModel}`
        : "AI engine: deterministic rules only — set OPENAI_API_KEY to enable GPT",
    );
    logger.info(
      `Related-incident search: ${env.vectorSearchEnabled ? "Atlas Vector Search" : "in-process cosine"}`,
    );
    if (!env.authEnabled) logger.warn("AUTH_ENABLED=false — every API route is open");
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => {
      void disconnectDatabase().finally(() => process.exit(0));
    });
    // Do not hang forever on a stuck connection.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  logger.error("Failed to start Sentriq API", error);
  process.exit(1);
});

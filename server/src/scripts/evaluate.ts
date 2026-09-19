import { connectDatabase, disconnectDatabase } from "../config/db";
import { runEvaluation } from "../services/evaluation.service";
import { logger } from "../utils/logger";

/**
 *   pnpm evaluate           measure the pipeline against the labelled dataset
 *   pnpm evaluate:memory    same, against a throwaway in-process MongoDB
 *
 * Results are stored so the client's /evaluation screen shows measured numbers
 * rather than claims — including every case the pipeline gets wrong.
 */
async function main() {
  await connectDatabase();
  const { run, metrics, failures } = await runEvaluation();

  const line = "=".repeat(64);
  console.log(`\n${line}`);
  console.log(`Sentriq evaluation — ${run.datasetSize} labelled reports, ${run.engine} engine`);
  console.log(line);

  for (const metric of metrics) {
    console.log(
      `${metric.label.padEnd(24)} ${String(metric.accuracy).padStart(5)}%   (${metric.correct}/${metric.total})`,
    );
    console.log(`  ${metric.note}`);
  }

  console.log("-".repeat(64));
  console.log(`Failures kept for review: ${failures.length}`);
  for (const failure of failures.slice(0, 12)) {
    console.log(
      `  [${failure.metric}] ${failure.reportId}: expected ${failure.expected}, got ${failure.actual}`,
    );
  }
  if (failures.length > 12) {
    console.log(`  …and ${failures.length - 12} more (stored in the database)`);
  }

  console.log(line);
  console.log(`Stored as evaluation run ${run.runId}. Visible at /evaluation in the client.\n`);

  await disconnectDatabase();
}

main().catch((error: unknown) => {
  logger.error("Evaluation failed", error);
  process.exit(1);
});

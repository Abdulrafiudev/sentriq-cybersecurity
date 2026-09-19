import { connectDatabase, disconnectDatabase } from "../config/db";
import { ensureAdminUser } from "../services/auth.service";
import { seedDatabase } from "../services/seed.service";
import { logger } from "../utils/logger";

/**
 *   pnpm seed              re-seed, wiping existing incidents
 *   pnpm seed -- --keep    add the dataset alongside what is already there
 *   pnpm seed:memory       same, against a throwaway in-process MongoDB
 */
async function main() {
  await connectDatabase();
  await ensureAdminUser();
  await seedDatabase({ keep: process.argv.includes("--keep") });
  await disconnectDatabase();
}

main().catch((error: unknown) => {
  logger.error("Seeding failed", error);
  process.exit(1);
});

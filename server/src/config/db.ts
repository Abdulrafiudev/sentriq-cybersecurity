import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../utils/logger";

mongoose.set("strictQuery", true);

/** Held so shutdown can stop the throwaway server too. */
let memoryServer: { stop(): Promise<boolean> } | null = null;

/**
 * Starts a throwaway in-process MongoDB. Convenience for anyone who wants to run
 * Sentriq without installing Mongo or provisioning Atlas — `pnpm dev:memory`.
 * Data is discarded when the process exits.
 */
async function startMemoryServer(): Promise<string> {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const server = await MongoMemoryServer.create({ instance: { dbName: "sentriq" } });
  memoryServer = server;
  logger.warn("Using an in-memory MongoDB. Nothing is persisted between runs.");
  return server.getUri("sentriq");
}

export async function connectDatabase(uriOverride?: string): Promise<typeof mongoose> {
  const useMemory =
    process.argv.includes("--memory") ||
    ["1", "true", "yes"].includes((process.env.USE_MEMORY_DB ?? "").toLowerCase());

  const uri = uriOverride ?? (useMemory ? await startMemoryServer() : env.mongoUri);
  return connectTo(uri);
}

async function connectTo(uri: string): Promise<typeof mongoose> {
  mongoose.connection.on("connected", () => logger.info("MongoDB connected"));
  mongoose.connection.on("error", (error) => logger.error("MongoDB error", error));
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));

  try {
    return await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  } catch (error) {
    logger.error(
      `Could not reach MongoDB at ${uri.replace(/\/\/[^@]*@/, "//***@")}. ` +
        "Start a local mongod or set MONGODB_URI to an Atlas connection string.",
    );
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

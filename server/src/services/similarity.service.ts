import { env } from "../config/env";
import { Incident } from "../models/Incident";
import type { RelatedIncidentRef } from "../types/domain";
import { clamp01, cosineSimilarity } from "../utils/vector";
import { logger } from "../utils/logger";
import { thresholdsFor, type EmbeddingSpace } from "./embedding.service";

/**
 * Step 6 of the pipeline — related and duplicate incident detection.
 *
 * Two backends behind one function:
 *   1. MongoDB Atlas Vector Search ($vectorSearch), when VECTOR_SEARCH_ENABLED=true
 *      and the index exists. This is the production path the PRD calls for.
 *   2. In-process cosine over the most recent N incidents. Correct, just O(n) —
 *      fine for a local Mongo, a hackathon dataset, or a demo without Atlas.
 *
 * Both return the same shape, so nothing downstream knows which one ran.
 */

export interface SimilarityMatch extends RelatedIncidentRef {
  title: string;
}

export interface SimilarityResult {
  related: SimilarityMatch[];
  /** Set when the top match is at or above DUPLICATE_THRESHOLD. */
  duplicateOf: string | null;
  backend: "atlas-vector-search" | "in-process-cosine";
  thresholds: { relatedThreshold: number; duplicateThreshold: number };
}

interface Candidate {
  incidentId: string;
  title: string;
  embedding: number[];
}

async function searchWithAtlas(vector: number[], excludeId?: string): Promise<SimilarityMatch[]> {
  const pipeline = [
    {
      $vectorSearch: {
        index: env.vectorIndexName,
        path: "embedding",
        queryVector: vector,
        numCandidates: Math.max(50, env.similarityCandidateLimit),
        limit: env.maxRelatedIncidents + 1,
      },
    },
    {
      $project: {
        _id: 0,
        incidentId: 1,
        title: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ];

  const rows = (await Incident.aggregate(pipeline)) as Array<{
    incidentId: string;
    title: string;
    score: number;
  }>;

  return rows
    .filter((r) => r.incidentId !== excludeId)
    .map((r) => ({
      incidentId: r.incidentId,
      title: r.title,
      // Atlas returns cosine score already normalised into [0,1].
      similarityScore: Number(clamp01(r.score).toFixed(4)),
    }));
}

async function searchInProcess(vector: number[], excludeId?: string): Promise<SimilarityMatch[]> {
  const candidates = (await Incident.find(
    excludeId ? { incidentId: { $ne: excludeId } } : {},
    { incidentId: 1, title: 1, embedding: 1, _id: 0 },
  )
    .select("+embedding")
    .sort({ createdAt: -1 })
    .limit(env.similarityCandidateLimit)
    .lean()) as unknown as Candidate[];

  return candidates
    .filter((c) => Array.isArray(c.embedding) && c.embedding.length === vector.length)
    .map((c) => ({
      incidentId: c.incidentId,
      title: c.title,
      // Vectors are L2-normalised, so cosine lands in [-1,1]; clamp the negative tail.
      similarityScore: Number(clamp01(cosineSimilarity(vector, c.embedding)).toFixed(4)),
    }))
    .sort((a, b) => b.similarityScore - a.similarityScore);
}

export async function findRelatedIncidents(
  vector: number[],
  options: { excludeIncidentId?: string; space?: EmbeddingSpace } = {},
): Promise<SimilarityResult> {
  const { related: relatedThreshold, duplicate: duplicateThreshold } = thresholdsFor(
    options.space ?? "lexical",
  );

  let matches: SimilarityMatch[] = [];
  let backend: SimilarityResult["backend"] = "in-process-cosine";

  if (env.vectorSearchEnabled) {
    try {
      matches = await searchWithAtlas(vector, options.excludeIncidentId);
      backend = "atlas-vector-search";
    } catch (error) {
      logger.warn("Atlas Vector Search unavailable, using in-process cosine", {
        message: error instanceof Error ? error.message : String(error),
      });
      matches = await searchInProcess(vector, options.excludeIncidentId);
    }
  } else {
    matches = await searchInProcess(vector, options.excludeIncidentId);
  }

  const related = matches
    .filter((m) => m.similarityScore >= relatedThreshold)
    .slice(0, env.maxRelatedIncidents);

  const top = related[0];
  const duplicateOf = top && top.similarityScore >= duplicateThreshold ? top.incidentId : null;

  return { related, duplicateOf, backend, thresholds: { relatedThreshold, duplicateThreshold } };
}

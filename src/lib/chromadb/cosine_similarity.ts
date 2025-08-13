import { getMyCollection } from './chromadb';
import type { Collection } from 'chromadb';

type SearchResult = {
  id: string;
  score: number;
  metadata: Record<string, any>;
};

/**
 * Search ChromaDB for vectors similar to the given one.
 * @param vector - Array of 13 numbers representing the query vector
 * @param limit - Number of results to return (default 5)
 * @returns Array of similar entries with id, score, and metadata
 */
export const searchSimilarVectors = async (
  vector: number[],
  limit = 5
): Promise<SearchResult[]> => {
  if (vector.length !== 13) {
    throw new Error("Vector must be an array of 13 numbers.");
  }

  const collection = await getMyCollection();
  if (!collection) {
    throw new Error("ChromaDB collection not initialized.");
  }

  const results = await collection.query({
    queryEmbeddings: [vector],
    nResults: limit,
    include: ["metadatas", "distances"],
  });

  const ids = results.ids[0] ?? [];
  const scores = results.distances[0] ?? [];
  const metadatas = results.metadatas[0] ?? [];

  return ids.map((id, index) => ({
    id,
    score: scores[index] ?? 0,
    metadata: metadatas[index] ?? {},
  }));
};

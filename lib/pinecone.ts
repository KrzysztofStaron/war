import { Pinecone } from "@pinecone-database/pinecone";

let pcClient: Pinecone | null = null;

function getClient(): Pinecone {
  if (!pcClient) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) throw new Error("PINECONE_API_KEY is not set");
    pcClient = new Pinecone({ apiKey });
  }
  return pcClient;
}

export interface GroupMatch {
  /** 2-digit group prefix */
  prefix: string;
  /** Similarity score from Pinecone */
  score: number;
  /** Human-readable group name from metadata */
  name: string;
}

/**
 * Query the Pinecone "codes" index (75 FSC group vectors) with an embedding
 * and return the top-K most similar groups.
 */
export async function queryGroups(
  embedding: number[],
  topK: number = 10,
): Promise<GroupMatch[]> {
  const pc = getClient();
  const indexHost = process.env.PINECONE_INDEX_HOST;
  if (!indexHost) throw new Error("PINECONE_INDEX_HOST is not set");
  const index = pc.index("codes", indexHost);

  const result = await index.query({
    vector: embedding,
    topK,
    includeMetadata: true,
  });

  return (result.matches ?? []).map((match) => ({
    prefix: match.id,
    score: match.score ?? 0,
    name: (match.metadata?.name as string) ?? "",
  }));
}

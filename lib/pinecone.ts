import { Pinecone } from "@pinecone-database/pinecone";

const GROUPS_INDEX_HOST = "https://codes-xxf6i2m.svc.aped-4627-b74a.pinecone.io";

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
  const index = pc.index("codes", GROUPS_INDEX_HOST);

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

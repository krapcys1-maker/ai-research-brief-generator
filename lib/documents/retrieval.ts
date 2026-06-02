import { createEmbeddingProvider } from "@/lib/embeddings/client";
import type { UserDocumentChunk } from "@/lib/documents/schemas";

const STOPWORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "czy",
  "dla",
  "for",
  "from",
  "how",
  "jak",
  "jest",
  "oraz",
  "the",
  "this",
  "with"
]);

function tokenize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function cosine(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length);
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  if (!leftMagnitude || !rightMagnitude) {
    return 0;
  }

  return Math.max(0, dot / Math.sqrt(leftMagnitude * rightMagnitude));
}

function lexicalScore(question: string, chunk: UserDocumentChunk) {
  const queryTokens = new Set(tokenize(question));
  const chunkTokens = new Set(tokenize(chunk.text));

  if (!queryTokens.size || !chunkTokens.size) {
    return 0;
  }

  const overlap = [...queryTokens].filter((token) => chunkTokens.has(token)).length;
  return overlap / Math.min(queryTokens.size, 8);
}

export type RetrievedDocumentChunk = {
  chunk: UserDocumentChunk;
  score: number;
};

export async function retrieveDocumentChunks(input: {
  question: string;
  chunks: UserDocumentChunk[];
  topK?: number;
}) {
  const topK = input.topK ?? 6;
  let queryEmbedding: number[] | null = null;

  try {
    const provider = createEmbeddingProvider();
    [queryEmbedding] = await provider.embed([input.question]);
  } catch {
    queryEmbedding = null;
  }

  const scored = input.chunks
    .map<RetrievedDocumentChunk>((chunk) => {
      const semantic =
        queryEmbedding && chunk.embedding
          ? cosine(queryEmbedding, chunk.embedding)
          : 0;
      const lexical = lexicalScore(input.question, chunk);

      return {
        chunk,
        score: Math.max(lexical, semantic * 0.9)
      };
    })
    .filter((item) => item.score >= 0.12)
    .sort((a, b) => b.score - a.score);

  const seenDocuments = new Map<string, number>();
  const diversified: RetrievedDocumentChunk[] = [];

  for (const item of scored) {
    const count = seenDocuments.get(item.chunk.documentId) ?? 0;

    if (count >= 4) {
      continue;
    }

    seenDocuments.set(item.chunk.documentId, count + 1);
    diversified.push(item);

    if (diversified.length >= topK) {
      break;
    }
  }

  return diversified;
}

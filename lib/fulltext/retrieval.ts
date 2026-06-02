import type { PaperTextChunk } from "@/lib/fulltext/types";

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

function lexicalScore(question: string, chunk: PaperTextChunk) {
  const queryTokens = new Set(tokenize(question));
  const chunkTokens = new Set(tokenize(chunk.text));

  if (!queryTokens.size || !chunkTokens.size) {
    return 0;
  }

  const overlap = [...queryTokens].filter((token) => chunkTokens.has(token)).length;
  return overlap / Math.min(queryTokens.size, 10);
}

export type RetrievedPaperTextChunk = {
  chunk: PaperTextChunk;
  score: number;
};

export function retrievePaperTextChunks(input: {
  question: string;
  chunks: PaperTextChunk[];
  topK?: number;
}): RetrievedPaperTextChunk[] {
  const topK = input.topK ?? 6;
  const scored = input.chunks
    .map<RetrievedPaperTextChunk>((chunk) => ({
      chunk,
      score: lexicalScore(input.question, chunk)
    }))
    .filter((item) => item.score >= 0.12)
    .sort((a, b) => b.score - a.score);

  const seenPapers = new Map<string, number>();
  const diversified: RetrievedPaperTextChunk[] = [];

  for (const item of scored) {
    const count = seenPapers.get(item.chunk.paperId) ?? 0;

    if (count >= 3) {
      continue;
    }

    seenPapers.set(item.chunk.paperId, count + 1);
    diversified.push(item);

    if (diversified.length >= topK) {
      break;
    }
  }

  return diversified;
}

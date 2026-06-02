import { getSectionForText } from "@/lib/documents/sectionDetection";
import type { UserDocumentChunk } from "@/lib/documents/schemas";

export type ChunkTextInput = {
  documentId: string;
  ownerId?: string | null;
  workspaceId?: string | null;
  sessionId?: string | null;
  text: string;
  chunkSizeTokens?: number;
  overlapTokens?: number;
  embeddingModel?: string | null;
  embeddings?: number[][];
};

function cleanText(value: string) {
  return value
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function tokenEstimate(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

export function chunkText(input: ChunkTextInput): UserDocumentChunk[] {
  const chunkSize = input.chunkSizeTokens ?? 950;
  const overlap = input.overlapTokens ?? 120;
  const cleaned = cleanText(input.text);
  const tokens = cleaned.split(/\s+/).filter(Boolean);

  if (!tokens.length) {
    return [];
  }

  const chunks: UserDocumentChunk[] = [];
  let start = 0;

  while (start < tokens.length) {
    const end = Math.min(tokens.length, start + chunkSize);
    const text = tokens.slice(start, end).join(" ");
    const index = chunks.length;

    chunks.push({
      id: `${input.documentId}:chunk_${index}`,
      documentId: input.documentId,
      ownerId: input.ownerId ?? null,
      workspaceId: input.workspaceId ?? null,
      sessionId: input.sessionId ?? null,
      sectionTitle: getSectionForText(text),
      chunkIndex: index,
      text,
      tokenEstimate: tokenEstimate(text),
      pageStart: null,
      pageEnd: null,
      embedding: input.embeddings?.[index] ?? null,
      embeddingModel: input.embeddingModel ?? null,
      evidenceLevel: "uploaded_document_supported"
    });

    if (end >= tokens.length) {
      break;
    }

    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

import { randomUUID } from "node:crypto";
import { chunkText } from "@/lib/documents/chunkText";
import { extractTextFromUpload, hashText } from "@/lib/documents/extractText";
import type { DocumentSource, UserDocument } from "@/lib/documents/schemas";
import type { DocumentRepository } from "@/lib/documents/types";
import { createEmbeddingProvider } from "@/lib/embeddings/client";
import { validateUploadFile } from "@/lib/documents/validation";

function createDocumentId() {
  return `doc_${randomUUID()}`;
}

function now() {
  return new Date().toISOString();
}

async function createEmbeddings(texts: string[]) {
  try {
    const provider = createEmbeddingProvider();
    return {
      embeddings: await provider.embed(texts),
      embeddingModel: provider.name
    };
  } catch {
    return {
      embeddings: null,
      embeddingModel: null
    };
  }
}

export async function ingestUploadedDocument(input: {
  file: File;
  source: DocumentSource;
  repository: DocumentRepository;
}) {
  const kind = validateUploadFile(input.file);
  const id = createDocumentId();
  const timestamp = now();
  const privacyScope = input.source.ownerId ? "user" : "session";
  const bytes = new Uint8Array(await input.file.arrayBuffer());

  try {
    const extracted = await extractTextFromUpload({ bytes, kind });
    const preliminaryChunks = chunkText({
      documentId: id,
      ownerId: input.source.ownerId,
      workspaceId: input.source.workspaceId,
      sessionId: input.source.sessionId,
      text: extracted.text
    });
    const { embeddings, embeddingModel } = await createEmbeddings(
      preliminaryChunks.map((chunk) => chunk.text)
    );
    const chunks = chunkText({
      documentId: id,
      ownerId: input.source.ownerId,
      workspaceId: input.source.workspaceId,
      sessionId: input.source.sessionId,
      text: extracted.text,
      embeddings: embeddings ?? undefined,
      embeddingModel
    });
    const document: UserDocument = {
      id,
      ownerId: input.source.ownerId ?? null,
      workspaceId: input.source.workspaceId ?? null,
      sessionId: input.source.sessionId ?? null,
      filename: input.file.name,
      mimeType: input.file.type || "application/octet-stream",
      sizeBytes: input.file.size,
      status: "parsed",
      textHash: hashText(extracted.text),
      createdAt: timestamp,
      deletedAt: null,
      privacyScope,
      errorMessage: null
    };

    await input.repository.saveParsedDocument({
      document,
      chunks
    });

    return {
      document,
      chunkCount: chunks.length,
      parserName: extracted.parserName,
      qualityScore: extracted.qualityScore
    };
  } catch (error) {
    const document: UserDocument = {
      id,
      ownerId: input.source.ownerId ?? null,
      workspaceId: input.source.workspaceId ?? null,
      sessionId: input.source.sessionId ?? null,
      filename: input.file.name,
      mimeType: input.file.type || "application/octet-stream",
      sizeBytes: input.file.size,
      status: "failed",
      textHash: null,
      createdAt: timestamp,
      deletedAt: null,
      privacyScope,
      errorMessage:
        error instanceof Error ? error.message : "Could not extract document text."
    };

    await input.repository.saveParsedDocument({
      document,
      chunks: []
    });

    return {
      document,
      chunkCount: 0,
      parserName: null,
      qualityScore: 0
    };
  }
}

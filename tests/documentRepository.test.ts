import { beforeEach, describe, expect, it } from "vitest";
import { inMemoryDocumentRepository } from "@/lib/documents/inMemoryDocumentRepository";
import type { UserDocument, UserDocumentChunk } from "@/lib/documents/schemas";

function createDocument(overrides: Partial<UserDocument> = {}): UserDocument {
  return {
    id: "doc_1",
    ownerId: null,
    workspaceId: null,
    sessionId: "session_a",
    filename: "notes.md",
    mimeType: "text/markdown",
    sizeBytes: 200,
    status: "parsed",
    textHash: "hash",
    createdAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
    privacyScope: "session",
    errorMessage: null,
    ...overrides
  };
}

function createChunk(overrides: Partial<UserDocumentChunk> = {}): UserDocumentChunk {
  return {
    id: "doc_1:chunk_0",
    documentId: "doc_1",
    ownerId: null,
    workspaceId: null,
    sessionId: "session_a",
    sectionTitle: null,
    chunkIndex: 0,
    text: "retrieval augmented generation supports grounded answers",
    tokenEstimate: 6,
    pageStart: null,
    pageEnd: null,
    embedding: null,
    embeddingModel: null,
    evidenceLevel: "uploaded_document_supported",
    ...overrides
  };
}

describe("inMemoryDocumentRepository", () => {
  beforeEach(async () => {
    await inMemoryDocumentRepository.clear();
  });

  it("scopes documents and chunks to the current private session", async () => {
    await inMemoryDocumentRepository.saveParsedDocument({
      document: createDocument(),
      chunks: [createChunk()]
    });

    await expect(
      inMemoryDocumentRepository.listDocuments({
        ownerId: null,
        sessionId: "session_a"
      })
    ).resolves.toHaveLength(1);
    await expect(
      inMemoryDocumentRepository.listDocuments({
        ownerId: null,
        sessionId: "session_b"
      })
    ).resolves.toEqual([]);
    await expect(
      inMemoryDocumentRepository.listChunks({
        source: {
          ownerId: null,
          sessionId: "session_b"
        }
      })
    ).resolves.toEqual([]);
  });

  it("deletes only documents owned by the session", async () => {
    await inMemoryDocumentRepository.saveParsedDocument({
      document: createDocument(),
      chunks: [createChunk()]
    });

    await expect(
      inMemoryDocumentRepository.deleteDocument("doc_1", {
        ownerId: null,
        sessionId: "session_b"
      })
    ).resolves.toBe(false);
    await expect(
      inMemoryDocumentRepository.deleteDocument("doc_1", {
        ownerId: null,
        sessionId: "session_a"
      })
    ).resolves.toBe(true);
    await expect(
      inMemoryDocumentRepository.listDocuments({
        ownerId: null,
        sessionId: "session_a"
      })
    ).resolves.toEqual([]);
  });

  it("scopes documents and chunks to the authenticated user and workspace", async () => {
    await inMemoryDocumentRepository.saveParsedDocument({
      document: createDocument({
        ownerId: "user_1",
        workspaceId: "workspace_a",
        sessionId: null,
        privacyScope: "user"
      }),
      chunks: [
        createChunk({
          ownerId: "user_1",
          workspaceId: "workspace_a",
          sessionId: null
        })
      ]
    });

    await expect(
      inMemoryDocumentRepository.listDocuments({
        ownerId: "user_1",
        workspaceId: "workspace_a",
        sessionId: null
      })
    ).resolves.toHaveLength(1);
    await expect(
      inMemoryDocumentRepository.listDocuments({
        ownerId: "user_1",
        workspaceId: "workspace_b",
        sessionId: null
      })
    ).resolves.toEqual([]);
    await expect(
      inMemoryDocumentRepository.listChunks({
        source: {
          ownerId: "user_1",
          workspaceId: "workspace_b",
          sessionId: null
        }
      })
    ).resolves.toEqual([]);
  });
});

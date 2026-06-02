import { beforeEach, describe, expect, it } from "vitest";
import { inMemoryDocumentRepository } from "@/lib/documents/inMemoryDocumentRepository";
import type { UserDocument } from "@/lib/documents/schemas";
import { inMemoryDocumentCollectionRepository } from "@/lib/workspace/inMemoryDocumentCollectionRepository";

function document(overrides: Partial<UserDocument>): UserDocument {
  return {
    id: "doc_1",
    ownerId: null,
    workspaceId: null,
    sessionId: "doc_session_a",
    filename: "notes.md",
    mimeType: "text/markdown",
    sizeBytes: 2048,
    status: "parsed",
    textHash: "hash_1",
    createdAt: "2026-06-02T00:00:00.000Z",
    deletedAt: null,
    privacyScope: "session",
    errorMessage: null,
    ...overrides
  };
}

describe("document collections API route", () => {
  beforeEach(async () => {
    await inMemoryDocumentRepository.clear();
    await inMemoryDocumentCollectionRepository.clear();
  });

  it("saves and lists collections only for the same private document session", async () => {
    await inMemoryDocumentRepository.saveParsedDocument({
      document: document({
        id: "doc_session_a",
        sessionId: "doc_session_a",
        filename: "session-a.md"
      }),
      chunks: []
    });
    await inMemoryDocumentRepository.saveParsedDocument({
      document: document({
        id: "doc_session_b",
        sessionId: "doc_session_b",
        filename: "session-b.md"
      }),
      chunks: []
    });

    const route = await import("@/app/api/workspace/document-collections/route");
    const createResponse = await route.POST(
      new Request("http://localhost/api/workspace/document-collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "ai_brief_doc_session=doc_session_a"
        },
        body: JSON.stringify({
          title: "Session A documents",
          description: "Documents for session A.",
          documentIds: ["doc_session_a"]
        })
      })
    );
    const createPayload = await createResponse.json();
    const sameSessionResponse = await route.GET(
      new Request("http://localhost/api/workspace/document-collections", {
        headers: { cookie: "ai_brief_doc_session=doc_session_a" }
      })
    );
    const sameSessionPayload = await sameSessionResponse.json();
    const otherSessionResponse = await route.GET(
      new Request("http://localhost/api/workspace/document-collections", {
        headers: { cookie: "ai_brief_doc_session=doc_session_b" }
      })
    );
    const otherSessionPayload = await otherSessionResponse.json();

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.get("x-document-collection-scope")).toBe(
      "session"
    );
    expect(createPayload.collection).toMatchObject({
      title: "Session A documents",
      documentIds: ["doc_session_a"],
      ownerSessionId: "doc_session_a",
      visibility: "private"
    });
    expect(sameSessionPayload.collections).toEqual([
      expect.objectContaining({ id: createPayload.collection.id })
    ]);
    expect(otherSessionPayload.collections).toEqual([]);
  });

  it("rejects collections containing documents outside the current session", async () => {
    await inMemoryDocumentRepository.saveParsedDocument({
      document: document({
        id: "doc_session_b",
        sessionId: "doc_session_b",
        filename: "session-b.md"
      }),
      chunks: []
    });

    const route = await import("@/app/api/workspace/document-collections/route");
    const response = await route.POST(
      new Request("http://localhost/api/workspace/document-collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "ai_brief_doc_session=doc_session_a"
        },
        body: JSON.stringify({
          title: "Invalid collection",
          documentIds: ["doc_session_b"]
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toContain("outside this private session");
  });

  it("saves only collections in the trusted user workspace", async () => {
    await inMemoryDocumentRepository.saveParsedDocument({
      document: document({
        id: "doc_workspace_a",
        ownerId: "user_1",
        workspaceId: "workspace_a",
        sessionId: null,
        filename: "workspace-a.md",
        privacyScope: "user"
      }),
      chunks: []
    });
    await inMemoryDocumentRepository.saveParsedDocument({
      document: document({
        id: "doc_workspace_b",
        ownerId: "user_1",
        workspaceId: "workspace_b",
        sessionId: null,
        filename: "workspace-b.md",
        privacyScope: "user"
      }),
      chunks: []
    });

    const route = await import("@/app/api/workspace/document-collections/route");
    await route.POST(
      new Request("http://localhost/api/workspace/document-collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-brief-user-id": "user_1",
          "x-ai-brief-workspace-id": "workspace_a"
        },
        body: JSON.stringify({
          title: "Workspace A documents",
          documentIds: ["doc_workspace_a"]
        })
      })
    );
    await route.POST(
      new Request("http://localhost/api/workspace/document-collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-brief-user-id": "user_1",
          "x-ai-brief-workspace-id": "workspace_b"
        },
        body: JSON.stringify({
          title: "Workspace B documents",
          documentIds: ["doc_workspace_b"]
        })
      })
    );

    const response = await route.GET(
      new Request("http://localhost/api/workspace/document-collections", {
        headers: {
          "x-ai-brief-user-id": "user_1",
          "x-ai-brief-workspace-id": "workspace_a"
        }
      })
    );
    const payload = await response.json();

    expect(response.headers.get("x-document-collection-scope")).toBe("user");
    expect(payload.historyScope).toBe("user");
    expect(payload.collections).toEqual([
      expect.objectContaining({
        title: "Workspace A documents",
        ownerId: "user_1",
        workspaceId: "workspace_a",
        visibility: "workspace"
      })
    ]);
  });
});

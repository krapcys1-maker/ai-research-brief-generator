import { beforeEach, describe, expect, it } from "vitest";
import { inMemoryDocumentCollectionRepository } from "@/lib/workspace/inMemoryDocumentCollectionRepository";

describe("inMemoryDocumentCollectionRepository", () => {
  beforeEach(async () => {
    await inMemoryDocumentCollectionRepository.clear();
  });

  it("stores and filters session-owned document collections", async () => {
    const saved = await inMemoryDocumentCollectionRepository.save({
      title: "Protocol documents",
      description: "A focused document set.",
      documentIds: ["doc_1", "doc_1", "doc_2"],
      ownerSessionId: "doc_session_a"
    });
    await inMemoryDocumentCollectionRepository.save({
      title: "Other session",
      documentIds: ["doc_3"],
      ownerSessionId: "doc_session_b"
    });

    expect(saved).toMatchObject({
      title: "Protocol documents",
      documentIds: ["doc_1", "doc_2"],
      documentCount: 2,
      ownerSessionId: "doc_session_a",
      visibility: "private"
    });
    expect(
      await inMemoryDocumentCollectionRepository.list({
        ownerSessionId: "doc_session_a"
      })
    ).toEqual([expect.objectContaining({ title: "Protocol documents" })]);
  });

  it("stores and filters workspace-owned document collections", async () => {
    await inMemoryDocumentCollectionRepository.save({
      title: "Workspace A documents",
      documentIds: ["doc_workspace_a"],
      ownerId: "user_1",
      workspaceId: "workspace_a",
      createdByUserId: "user_1",
      visibility: "workspace"
    });
    await inMemoryDocumentCollectionRepository.save({
      title: "Workspace B documents",
      documentIds: ["doc_workspace_b"],
      ownerId: "user_1",
      workspaceId: "workspace_b",
      createdByUserId: "user_1",
      visibility: "workspace"
    });

    const collections = await inMemoryDocumentCollectionRepository.list({
      ownerId: "user_1",
      workspaceId: "workspace_a"
    });

    expect(collections).toEqual([
      expect.objectContaining({
        title: "Workspace A documents",
        ownerId: "user_1",
        workspaceId: "workspace_a",
        visibility: "workspace"
      })
    ]);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { inMemoryBriefCollectionRepository } from "@/lib/workspace/inMemoryBriefCollectionRepository";

describe("inMemoryBriefCollectionRepository", () => {
  beforeEach(async () => {
    await inMemoryBriefCollectionRepository.clear();
  });

  it("stores and filters session-owned brief collections", async () => {
    const saved = await inMemoryBriefCollectionRepository.save({
      title: "Clinical RAG briefs",
      description: "A focused reading set.",
      briefIds: ["brief_1", "brief_1", "brief_2"],
      ownerSessionId: "brief_session_a"
    });
    await inMemoryBriefCollectionRepository.save({
      title: "Other session",
      briefIds: ["brief_3"],
      ownerSessionId: "brief_session_b"
    });

    expect(saved).toMatchObject({
      title: "Clinical RAG briefs",
      briefIds: ["brief_1", "brief_2"],
      briefCount: 2,
      ownerSessionId: "brief_session_a",
      visibility: "private"
    });
    expect(
      await inMemoryBriefCollectionRepository.list({
        ownerSessionId: "brief_session_a"
      })
    ).toEqual([expect.objectContaining({ title: "Clinical RAG briefs" })]);
  });

  it("stores and filters workspace-owned brief collections", async () => {
    await inMemoryBriefCollectionRepository.save({
      title: "Workspace A collection",
      briefIds: ["brief_workspace_a"],
      ownerId: "user_1",
      workspaceId: "workspace_a",
      createdByUserId: "user_1",
      visibility: "workspace"
    });
    await inMemoryBriefCollectionRepository.save({
      title: "Workspace B collection",
      briefIds: ["brief_workspace_b"],
      ownerId: "user_1",
      workspaceId: "workspace_b",
      createdByUserId: "user_1",
      visibility: "workspace"
    });

    const collections = await inMemoryBriefCollectionRepository.list({
      ownerId: "user_1",
      workspaceId: "workspace_a"
    });

    expect(collections).toEqual([
      expect.objectContaining({
        title: "Workspace A collection",
        ownerId: "user_1",
        workspaceId: "workspace_a",
        visibility: "workspace"
      })
    ]);
  });
});

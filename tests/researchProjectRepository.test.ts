import { beforeEach, describe, expect, it } from "vitest";
import { inMemoryResearchProjectRepository } from "@/lib/workspace/inMemoryResearchProjectRepository";

describe("inMemoryResearchProjectRepository", () => {
  beforeEach(async () => {
    await inMemoryResearchProjectRepository.clear();
  });

  it("stores and filters session-owned research projects", async () => {
    const saved = await inMemoryResearchProjectRepository.save({
      title: "Clinical RAG",
      query: "retrieval augmented generation in clinical diagnosis",
      ownerSessionId: "brief_session_a",
      sources: ["arxiv", "openalex"]
    });
    await inMemoryResearchProjectRepository.save({
      title: "Other session",
      query: "graph neural networks",
      ownerSessionId: "brief_session_b"
    });

    expect(saved).toMatchObject({
      title: "Clinical RAG",
      ownerSessionId: "brief_session_a",
      ownerId: null,
      workspaceId: null,
      visibility: "private",
      sources: ["arxiv", "openalex"]
    });
    expect(
      await inMemoryResearchProjectRepository.list({
        ownerSessionId: "brief_session_a"
      })
    ).toEqual([expect.objectContaining({ title: "Clinical RAG" })]);
  });

  it("stores and filters workspace-owned research projects", async () => {
    await inMemoryResearchProjectRepository.save({
      title: "Workspace A project",
      query: "citation faithfulness",
      ownerId: "user_1",
      workspaceId: "workspace_a",
      createdByUserId: "user_1",
      visibility: "workspace"
    });
    await inMemoryResearchProjectRepository.save({
      title: "Workspace B project",
      query: "clinical triage",
      ownerId: "user_1",
      workspaceId: "workspace_b",
      createdByUserId: "user_1",
      visibility: "workspace"
    });

    const projects = await inMemoryResearchProjectRepository.list({
      ownerId: "user_1",
      workspaceId: "workspace_a"
    });

    expect(projects).toEqual([
      expect.objectContaining({
        title: "Workspace A project",
        ownerId: "user_1",
        workspaceId: "workspace_a",
        visibility: "workspace"
      })
    ]);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { createBrief, createPaper } from "@/tests/fixtures";
import { inMemoryBriefRepository } from "@/lib/storage/inMemoryBriefStore";

describe("inMemoryBriefRepository", () => {
  beforeEach(async () => {
    await inMemoryBriefRepository.clear();
  });

  it("saves, loads, lists, and clears brief records through the repository contract", async () => {
    const brief = createBrief({ id: "brief_repo_test" });
    const paper = createPaper();

    const saved = await inMemoryBriefRepository.saveWithPapers({
      brief,
      papers: [paper]
    });

    expect(saved.brief.id).toBe("brief_repo_test");
    expect(await inMemoryBriefRepository.getById("brief_repo_test")).toEqual(saved);
    expect(await inMemoryBriefRepository.list()).toHaveLength(1);
    expect(await inMemoryBriefRepository.listSummaries()).toEqual([
      {
        id: brief.id,
        title: brief.title,
        query: brief.query,
        generatedAt: brief.generatedAt,
        outputLanguage: brief.outputLanguage,
        createdAt: saved.createdAt,
        ownerId: null,
        workspaceId: null,
        createdByUserId: null,
        visibility: "private"
      }
    ]);

    await inMemoryBriefRepository.clear();
    expect(await inMemoryBriefRepository.getById("brief_repo_test")).toBeNull();
  });

  it("filters brief history by owner session", async () => {
    const firstBrief = createBrief({ id: "brief_session_one" });
    const secondBrief = createBrief({ id: "brief_session_two" });
    const paper = createPaper();

    await inMemoryBriefRepository.saveWithPapers({
      brief: firstBrief,
      papers: [paper],
      ownerSessionId: "session_one"
    });
    await inMemoryBriefRepository.saveWithPapers({
      brief: secondBrief,
      papers: [paper],
      ownerSessionId: "session_two"
    });

    const firstSessionSummaries = await inMemoryBriefRepository.listSummaries({
      ownerSessionId: "session_one"
    });
    const publicSummaries = await inMemoryBriefRepository.listSummaries();

    expect(firstSessionSummaries.map((item) => item.id)).toEqual([
      "brief_session_one"
    ]);
    expect(new Set(publicSummaries.map((item) => item.id))).toEqual(
      new Set(["brief_session_two", "brief_session_one"])
    );
  });

  it("stores and filters app-native ownership metadata", async () => {
    const firstBrief = createBrief({ id: "brief_workspace_one" });
    const secondBrief = createBrief({ id: "brief_workspace_two" });
    const paper = createPaper();

    const saved = await inMemoryBriefRepository.saveWithPapers({
      brief: firstBrief,
      papers: [paper],
      ownerId: "user_owner",
      workspaceId: "workspace_a",
      createdByUserId: "user_creator",
      visibility: "workspace"
    });
    await inMemoryBriefRepository.saveWithPapers({
      brief: secondBrief,
      papers: [paper],
      ownerId: "user_owner",
      workspaceId: "workspace_b",
      createdByUserId: "user_creator",
      visibility: "private"
    });

    expect(saved.ownerId).toBe("user_owner");
    expect(saved.workspaceId).toBe("workspace_a");
    expect(saved.createdByUserId).toBe("user_creator");
    expect(saved.visibility).toBe("workspace");

    const workspaceSummaries = await inMemoryBriefRepository.listSummaries({
      workspaceId: "workspace_a",
      visibility: "workspace"
    });

    expect(workspaceSummaries).toEqual([
      expect.objectContaining({
        id: "brief_workspace_one",
        ownerId: "user_owner",
        workspaceId: "workspace_a",
        createdByUserId: "user_creator",
        visibility: "workspace"
      })
    ]);
  });
});

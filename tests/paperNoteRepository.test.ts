import { beforeEach, describe, expect, it } from "vitest";
import { inMemoryPaperNoteRepository } from "@/lib/workspace/inMemoryPaperNoteRepository";

describe("inMemoryPaperNoteRepository", () => {
  beforeEach(async () => {
    await inMemoryPaperNoteRepository.clear();
  });

  it("stores and filters session-owned paper notes", async () => {
    const saved = await inMemoryPaperNoteRepository.save({
      paperId: "paper_a",
      note: "Important methods paper.",
      ownerSessionId: "brief_session_a"
    });
    await inMemoryPaperNoteRepository.save({
      paperId: "paper_b",
      note: "Other session note.",
      ownerSessionId: "brief_session_b"
    });

    expect(saved).toMatchObject({
      paperId: "paper_a",
      note: "Important methods paper.",
      ownerSessionId: "brief_session_a",
      visibility: "private"
    });
    expect(
      await inMemoryPaperNoteRepository.list({
        ownerSessionId: "brief_session_a"
      })
    ).toEqual([expect.objectContaining({ paperId: "paper_a" })]);
  });

  it("stores and filters workspace-owned paper notes", async () => {
    await inMemoryPaperNoteRepository.save({
      paperId: "paper_workspace_a",
      note: "Workspace A note.",
      ownerId: "user_1",
      workspaceId: "workspace_a",
      createdByUserId: "user_1",
      visibility: "workspace"
    });
    await inMemoryPaperNoteRepository.save({
      paperId: "paper_workspace_b",
      note: "Workspace B note.",
      ownerId: "user_1",
      workspaceId: "workspace_b",
      createdByUserId: "user_1",
      visibility: "workspace"
    });

    const notes = await inMemoryPaperNoteRepository.list({
      ownerId: "user_1",
      workspaceId: "workspace_a"
    });

    expect(notes).toEqual([
      expect.objectContaining({
        paperId: "paper_workspace_a",
        ownerId: "user_1",
        workspaceId: "workspace_a",
        visibility: "workspace"
      })
    ]);
  });
});

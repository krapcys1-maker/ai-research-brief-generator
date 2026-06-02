import { beforeEach, describe, expect, it } from "vitest";
import { inMemoryExportHistoryRepository } from "@/lib/workspace/inMemoryExportHistoryRepository";

describe("inMemoryExportHistoryRepository", () => {
  beforeEach(async () => {
    await inMemoryExportHistoryRepository.clear();
  });

  it("stores and filters session-owned export history", async () => {
    const saved = await inMemoryExportHistoryRepository.save({
      resourceType: "brief",
      resourceId: "brief_a",
      title: "Session A brief",
      format: "markdown",
      filename: "session-a.md",
      ownerSessionId: "brief_session_a"
    });
    await inMemoryExportHistoryRepository.save({
      resourceType: "brief",
      resourceId: "brief_b",
      title: "Session B brief",
      format: "markdown",
      filename: "session-b.md",
      ownerSessionId: "brief_session_b"
    });

    expect(saved).toMatchObject({
      resourceType: "brief",
      resourceId: "brief_a",
      title: "Session A brief",
      format: "markdown",
      filename: "session-a.md",
      ownerSessionId: "brief_session_a",
      visibility: "private"
    });
    expect(
      await inMemoryExportHistoryRepository.list({
        ownerSessionId: "brief_session_a"
      })
    ).toEqual([expect.objectContaining({ resourceId: "brief_a" })]);
  });

  it("stores and filters workspace-owned export history", async () => {
    await inMemoryExportHistoryRepository.save({
      resourceType: "brief",
      resourceId: "brief_workspace_a",
      title: "Workspace A brief",
      format: "markdown",
      filename: "workspace-a.md",
      ownerId: "user_1",
      workspaceId: "workspace_a",
      createdByUserId: "user_1",
      visibility: "workspace"
    });
    await inMemoryExportHistoryRepository.save({
      resourceType: "brief",
      resourceId: "brief_workspace_b",
      title: "Workspace B brief",
      format: "markdown",
      filename: "workspace-b.md",
      ownerId: "user_1",
      workspaceId: "workspace_b",
      createdByUserId: "user_1",
      visibility: "workspace"
    });

    const exports = await inMemoryExportHistoryRepository.list({
      ownerId: "user_1",
      workspaceId: "workspace_a"
    });

    expect(exports).toEqual([
      expect.objectContaining({
        resourceId: "brief_workspace_a",
        ownerId: "user_1",
        workspaceId: "workspace_a",
        visibility: "workspace"
      })
    ]);
  });
});

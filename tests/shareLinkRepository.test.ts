import { beforeEach, describe, expect, it } from "vitest";
import { inMemoryShareLinkRepository } from "@/lib/workspace/inMemoryShareLinkRepository";

describe("inMemoryShareLinkRepository", () => {
  beforeEach(async () => {
    await inMemoryShareLinkRepository.clear();
  });

  it("stores and filters session-owned share links", async () => {
    const saved = await inMemoryShareLinkRepository.save({
      resourceType: "brief",
      resourceId: "brief_a",
      title: "Session A brief",
      ownerSessionId: "brief_session_a",
      visibility: "private"
    });
    await inMemoryShareLinkRepository.save({
      resourceType: "brief",
      resourceId: "brief_b",
      title: "Session B brief",
      ownerSessionId: "brief_session_b",
      visibility: "private"
    });

    expect(saved.token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(saved).toMatchObject({
      resourceType: "brief",
      resourceId: "brief_a",
      title: "Session A brief",
      ownerSessionId: "brief_session_a",
      visibility: "private",
      revokedAt: null
    });
    expect(
      await inMemoryShareLinkRepository.list({
        ownerSessionId: "brief_session_a"
      })
    ).toEqual([expect.objectContaining({ resourceId: "brief_a" })]);
  });

  it("stores and filters workspace-owned share links", async () => {
    await inMemoryShareLinkRepository.save({
      resourceType: "brief",
      resourceId: "brief_workspace_a",
      title: "Workspace A brief",
      ownerId: "user_1",
      workspaceId: "workspace_a",
      createdByUserId: "user_1",
      visibility: "workspace"
    });
    await inMemoryShareLinkRepository.save({
      resourceType: "brief",
      resourceId: "brief_workspace_b",
      title: "Workspace B brief",
      ownerId: "user_1",
      workspaceId: "workspace_b",
      createdByUserId: "user_1",
      visibility: "workspace"
    });

    const links = await inMemoryShareLinkRepository.list({
      ownerId: "user_1",
      workspaceId: "workspace_a"
    });

    expect(links).toEqual([
      expect.objectContaining({
        resourceId: "brief_workspace_a",
        ownerId: "user_1",
        workspaceId: "workspace_a",
        visibility: "workspace"
      })
    ]);
  });
});

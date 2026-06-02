import { beforeEach, describe, expect, it } from "vitest";
import { inMemoryBriefRepository } from "@/lib/storage/inMemoryBriefStore";
import { createBrief, createPaper } from "@/tests/fixtures";
import { inMemoryShareLinkRepository } from "@/lib/workspace/inMemoryShareLinkRepository";

describe("share links API route", () => {
  beforeEach(async () => {
    await inMemoryBriefRepository.clear();
    await inMemoryShareLinkRepository.clear();
  });

  it("creates and lists share links only for the same private session", async () => {
    await inMemoryBriefRepository.saveWithPapers({
      brief: createBrief({ id: "brief_session_a", title: "Session A brief" }),
      papers: [createPaper()],
      ownerSessionId: "brief_session_a"
    });
    await inMemoryBriefRepository.saveWithPapers({
      brief: createBrief({ id: "brief_session_b", title: "Session B brief" }),
      papers: [createPaper()],
      ownerSessionId: "brief_session_b"
    });

    const route = await import("@/app/api/workspace/share-links/route");
    const createResponse = await route.POST(
      new Request("http://localhost/api/workspace/share-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "ai_brief_history_session=brief_session_a"
        },
        body: JSON.stringify({
          resourceType: "brief",
          resourceId: "brief_session_a",
          visibility: "public"
        })
      })
    );
    const createPayload = await createResponse.json();
    const sameSessionResponse = await route.GET(
      new Request("http://localhost/api/workspace/share-links", {
        headers: { cookie: "ai_brief_history_session=brief_session_a" }
      })
    );
    const sameSessionPayload = await sameSessionResponse.json();
    const otherSessionResponse = await route.GET(
      new Request("http://localhost/api/workspace/share-links", {
        headers: { cookie: "ai_brief_history_session=brief_session_b" }
      })
    );
    const otherSessionPayload = await otherSessionResponse.json();

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.get("x-share-link-scope")).toBe("session");
    expect(createPayload.link).toMatchObject({
      resourceType: "brief",
      resourceId: "brief_session_a",
      title: "Session A brief",
      ownerSessionId: "brief_session_a",
      visibility: "public"
    });
    expect(sameSessionPayload.links).toEqual([
      expect.objectContaining({ id: createPayload.link.id })
    ]);
    expect(otherSessionPayload.links).toEqual([]);
  });

  it("rejects share links for briefs outside the current private session", async () => {
    await inMemoryBriefRepository.saveWithPapers({
      brief: createBrief({ id: "brief_session_b", title: "Session B brief" }),
      papers: [createPaper()],
      ownerSessionId: "brief_session_b"
    });

    const route = await import("@/app/api/workspace/share-links/route");
    const response = await route.POST(
      new Request("http://localhost/api/workspace/share-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "ai_brief_history_session=brief_session_a"
        },
        body: JSON.stringify({
          resourceType: "brief",
          resourceId: "brief_session_b",
          visibility: "public"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toContain("outside this private session");
  });

  it("creates only share links in the trusted user workspace", async () => {
    await inMemoryBriefRepository.saveWithPapers({
      brief: createBrief({ id: "brief_workspace_a", title: "Workspace A brief" }),
      papers: [createPaper()],
      ownerId: "user_1",
      workspaceId: "workspace_a",
      createdByUserId: "user_1",
      visibility: "workspace"
    });
    await inMemoryBriefRepository.saveWithPapers({
      brief: createBrief({ id: "brief_workspace_b", title: "Workspace B brief" }),
      papers: [createPaper()],
      ownerId: "user_1",
      workspaceId: "workspace_b",
      createdByUserId: "user_1",
      visibility: "workspace"
    });

    const route = await import("@/app/api/workspace/share-links/route");
    await route.POST(
      new Request("http://localhost/api/workspace/share-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-brief-user-id": "user_1",
          "x-ai-brief-workspace-id": "workspace_a"
        },
        body: JSON.stringify({
          resourceType: "brief",
          resourceId: "brief_workspace_a",
          visibility: "workspace"
        })
      })
    );
    await route.POST(
      new Request("http://localhost/api/workspace/share-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-brief-user-id": "user_1",
          "x-ai-brief-workspace-id": "workspace_b"
        },
        body: JSON.stringify({
          resourceType: "brief",
          resourceId: "brief_workspace_b",
          visibility: "workspace"
        })
      })
    );

    const response = await route.GET(
      new Request("http://localhost/api/workspace/share-links", {
        headers: {
          "x-ai-brief-user-id": "user_1",
          "x-ai-brief-workspace-id": "workspace_a"
        }
      })
    );
    const payload = await response.json();

    expect(response.headers.get("x-share-link-scope")).toBe("user");
    expect(payload.historyScope).toBe("user");
    expect(payload.links).toEqual([
      expect.objectContaining({
        resourceId: "brief_workspace_a",
        ownerId: "user_1",
        workspaceId: "workspace_a",
        visibility: "workspace"
      })
    ]);
  });
});

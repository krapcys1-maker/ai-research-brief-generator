import { beforeEach, describe, expect, it } from "vitest";
import { inMemoryBriefRepository } from "@/lib/storage/inMemoryBriefStore";
import { createBrief, createPaper } from "@/tests/fixtures";
import { inMemoryBriefCollectionRepository } from "@/lib/workspace/inMemoryBriefCollectionRepository";

describe("brief collections API route", () => {
  beforeEach(async () => {
    await inMemoryBriefRepository.clear();
    await inMemoryBriefCollectionRepository.clear();
  });

  it("saves and lists collections only for the same private session", async () => {
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

    const route = await import("@/app/api/workspace/brief-collections/route");
    const createResponse = await route.POST(
      new Request("http://localhost/api/workspace/brief-collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "ai_brief_history_session=brief_session_a"
        },
        body: JSON.stringify({
          title: "Session A collection",
          description: "Briefs for session A.",
          briefIds: ["brief_session_a"]
        })
      })
    );
    const createPayload = await createResponse.json();
    const sameSessionResponse = await route.GET(
      new Request("http://localhost/api/workspace/brief-collections", {
        headers: { cookie: "ai_brief_history_session=brief_session_a" }
      })
    );
    const sameSessionPayload = await sameSessionResponse.json();
    const otherSessionResponse = await route.GET(
      new Request("http://localhost/api/workspace/brief-collections", {
        headers: { cookie: "ai_brief_history_session=brief_session_b" }
      })
    );
    const otherSessionPayload = await otherSessionResponse.json();

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.get("x-brief-collection-scope")).toBe(
      "session"
    );
    expect(createPayload.collection).toMatchObject({
      title: "Session A collection",
      briefIds: ["brief_session_a"],
      ownerSessionId: "brief_session_a",
      visibility: "private"
    });
    expect(sameSessionPayload.collections).toEqual([
      expect.objectContaining({ id: createPayload.collection.id })
    ]);
    expect(otherSessionPayload.collections).toEqual([]);
  });

  it("rejects collections containing briefs outside the current session", async () => {
    await inMemoryBriefRepository.saveWithPapers({
      brief: createBrief({ id: "brief_session_b", title: "Session B brief" }),
      papers: [createPaper()],
      ownerSessionId: "brief_session_b"
    });

    const route = await import("@/app/api/workspace/brief-collections/route");
    const response = await route.POST(
      new Request("http://localhost/api/workspace/brief-collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "ai_brief_history_session=brief_session_a"
        },
        body: JSON.stringify({
          title: "Invalid collection",
          briefIds: ["brief_session_b"]
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toContain("outside this private session");
  });

  it("saves only collections in the trusted user workspace", async () => {
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

    const route = await import("@/app/api/workspace/brief-collections/route");
    await route.POST(
      new Request("http://localhost/api/workspace/brief-collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-brief-user-id": "user_1",
          "x-ai-brief-workspace-id": "workspace_a"
        },
        body: JSON.stringify({
          title: "Workspace A collection",
          briefIds: ["brief_workspace_a"]
        })
      })
    );
    await route.POST(
      new Request("http://localhost/api/workspace/brief-collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-brief-user-id": "user_1",
          "x-ai-brief-workspace-id": "workspace_b"
        },
        body: JSON.stringify({
          title: "Workspace B collection",
          briefIds: ["brief_workspace_b"]
        })
      })
    );

    const response = await route.GET(
      new Request("http://localhost/api/workspace/brief-collections", {
        headers: {
          "x-ai-brief-user-id": "user_1",
          "x-ai-brief-workspace-id": "workspace_a"
        }
      })
    );
    const payload = await response.json();

    expect(response.headers.get("x-brief-collection-scope")).toBe("user");
    expect(payload.historyScope).toBe("user");
    expect(payload.collections).toEqual([
      expect.objectContaining({
        title: "Workspace A collection",
        ownerId: "user_1",
        workspaceId: "workspace_a",
        visibility: "workspace"
      })
    ]);
  });
});

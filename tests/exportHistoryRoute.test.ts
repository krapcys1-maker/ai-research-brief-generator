import { beforeEach, describe, expect, it } from "vitest";
import { BRIEF_HISTORY_SESSION_COOKIE } from "@/lib/briefs/session";
import { inMemoryBriefRepository } from "@/lib/storage/inMemoryBriefStore";
import { createBrief, createPaper } from "@/tests/fixtures";
import { inMemoryExportHistoryRepository } from "@/lib/workspace/inMemoryExportHistoryRepository";

describe("export history routes", () => {
  beforeEach(async () => {
    await inMemoryBriefRepository.clear();
    await inMemoryExportHistoryRepository.clear();
  });

  it("records successful markdown exports and lists only the same private session", async () => {
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

    const exportRoute = await import("@/app/api/export/[id]/route");
    const exportResponse = await exportRoute.GET(
      new Request("http://localhost/api/export/brief_session_a?format=markdown", {
        headers: {
          cookie: `${BRIEF_HISTORY_SESSION_COOKIE}=brief_session_a`
        }
      }),
      { params: Promise.resolve({ id: "brief_session_a" }) }
    );
    const historyRoute = await import("@/app/api/workspace/export-history/route");
    const sameSessionResponse = await historyRoute.GET(
      new Request("http://localhost/api/workspace/export-history", {
        headers: {
          cookie: `${BRIEF_HISTORY_SESSION_COOKIE}=brief_session_a`
        }
      })
    );
    const sameSessionPayload = await sameSessionResponse.json();
    const otherSessionResponse = await historyRoute.GET(
      new Request("http://localhost/api/workspace/export-history", {
        headers: {
          cookie: `${BRIEF_HISTORY_SESSION_COOKIE}=brief_session_b`
        }
      })
    );
    const otherSessionPayload = await otherSessionResponse.json();

    expect(exportResponse.status).toBe(200);
    expect(exportResponse.headers.get("content-disposition")).toContain(
      "session-a-brief.md"
    );
    expect(sameSessionResponse.headers.get("x-export-history-scope")).toBe(
      "session"
    );
    expect(sameSessionPayload.exports).toEqual([
      expect.objectContaining({
        resourceType: "brief",
        resourceId: "brief_session_a",
        title: "Session A brief",
        format: "markdown",
        filename: "session-a-brief.md",
        ownerSessionId: "brief_session_a",
        visibility: "private"
      })
    ]);
    expect(otherSessionPayload.exports).toEqual([]);
  });

  it("does not record denied markdown exports", async () => {
    await inMemoryBriefRepository.saveWithPapers({
      brief: createBrief({ id: "brief_session_a", title: "Session A brief" }),
      papers: [createPaper()],
      ownerSessionId: "brief_session_a"
    });

    const exportRoute = await import("@/app/api/export/[id]/route");
    const response = await exportRoute.GET(
      new Request("http://localhost/api/export/brief_session_a?format=markdown", {
        headers: {
          cookie: `${BRIEF_HISTORY_SESSION_COOKIE}=brief_session_b`
        }
      }),
      { params: Promise.resolve({ id: "brief_session_a" }) }
    );

    expect(response.status).toBe(403);
    expect(await inMemoryExportHistoryRepository.list()).toEqual([]);
  });

  it("records workspace-owned markdown exports for the owning trusted user", async () => {
    await inMemoryBriefRepository.saveWithPapers({
      brief: createBrief({
        id: "brief_workspace_a",
        title: "Workspace A brief"
      }),
      papers: [createPaper()],
      ownerId: "user_1",
      workspaceId: "workspace_a",
      createdByUserId: "user_1",
      visibility: "workspace"
    });
    await inMemoryBriefRepository.saveWithPapers({
      brief: createBrief({
        id: "brief_workspace_b",
        title: "Workspace B brief"
      }),
      papers: [createPaper()],
      ownerId: "user_1",
      workspaceId: "workspace_b",
      createdByUserId: "user_1",
      visibility: "workspace"
    });

    const exportRoute = await import("@/app/api/export/[id]/route");
    const exportResponse = await exportRoute.GET(
      new Request("http://localhost/api/export/brief_workspace_a?format=markdown", {
        headers: {
          "x-ai-brief-user-id": "user_1",
          "x-ai-brief-workspace-id": "workspace_a"
        }
      }),
      { params: Promise.resolve({ id: "brief_workspace_a" }) }
    );
    const historyRoute = await import("@/app/api/workspace/export-history/route");
    const response = await historyRoute.GET(
      new Request("http://localhost/api/workspace/export-history", {
        headers: {
          "x-ai-brief-user-id": "user_1",
          "x-ai-brief-workspace-id": "workspace_a"
        }
      })
    );
    const payload = await response.json();

    expect(exportResponse.status).toBe(200);
    expect(response.headers.get("x-export-history-scope")).toBe("user");
    expect(payload.historyScope).toBe("user");
    expect(payload.exports).toEqual([
      expect.objectContaining({
        resourceId: "brief_workspace_a",
        ownerId: "user_1",
        workspaceId: "workspace_a",
        visibility: "workspace"
      })
    ]);
  });
});

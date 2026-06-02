import { beforeEach, describe, expect, it } from "vitest";
import { inMemoryBriefRepository } from "@/lib/storage/inMemoryBriefStore";
import { createBrief, createPaper } from "@/tests/fixtures";
import { inMemoryPaperNoteRepository } from "@/lib/workspace/inMemoryPaperNoteRepository";

describe("paper notes API route", () => {
  beforeEach(async () => {
    await inMemoryBriefRepository.clear();
    await inMemoryPaperNoteRepository.clear();
  });

  it("saves and lists notes only for papers in the same private session", async () => {
    await inMemoryBriefRepository.saveWithPapers({
      brief: createBrief({ id: "brief_session_a" }),
      papers: [createPaper({ id: "paper_session_a" })],
      ownerSessionId: "brief_session_a"
    });
    await inMemoryBriefRepository.saveWithPapers({
      brief: createBrief({ id: "brief_session_b" }),
      papers: [createPaper({ id: "paper_session_b" })],
      ownerSessionId: "brief_session_b"
    });

    const route = await import("@/app/api/workspace/paper-notes/route");
    const createResponse = await route.POST(
      new Request("http://localhost/api/workspace/paper-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "ai_brief_history_session=brief_session_a"
        },
        body: JSON.stringify({
          paperId: "paper_session_a",
          note: "Useful for the methods section."
        })
      })
    );
    const createPayload = await createResponse.json();
    const sameSessionResponse = await route.GET(
      new Request("http://localhost/api/workspace/paper-notes", {
        headers: { cookie: "ai_brief_history_session=brief_session_a" }
      })
    );
    const sameSessionPayload = await sameSessionResponse.json();
    const otherSessionResponse = await route.GET(
      new Request("http://localhost/api/workspace/paper-notes", {
        headers: { cookie: "ai_brief_history_session=brief_session_b" }
      })
    );
    const otherSessionPayload = await otherSessionResponse.json();

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.get("x-paper-note-scope")).toBe("session");
    expect(createPayload.note).toMatchObject({
      paperId: "paper_session_a",
      ownerSessionId: "brief_session_a",
      visibility: "private"
    });
    expect(sameSessionPayload.notes).toEqual([
      expect.objectContaining({ id: createPayload.note.id })
    ]);
    expect(otherSessionPayload.notes).toEqual([]);
  });

  it("rejects notes for papers outside the current private session", async () => {
    await inMemoryBriefRepository.saveWithPapers({
      brief: createBrief({ id: "brief_session_b" }),
      papers: [createPaper({ id: "paper_session_b" })],
      ownerSessionId: "brief_session_b"
    });

    const route = await import("@/app/api/workspace/paper-notes/route");
    const response = await route.POST(
      new Request("http://localhost/api/workspace/paper-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "ai_brief_history_session=brief_session_a"
        },
        body: JSON.stringify({
          paperId: "paper_session_b",
          note: "Should not be allowed."
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toContain("outside this private session");
  });

  it("saves only notes in the trusted user workspace", async () => {
    await inMemoryBriefRepository.saveWithPapers({
      brief: createBrief({ id: "brief_workspace_a" }),
      papers: [createPaper({ id: "paper_workspace_a" })],
      ownerId: "user_1",
      workspaceId: "workspace_a",
      createdByUserId: "user_1",
      visibility: "workspace"
    });
    await inMemoryBriefRepository.saveWithPapers({
      brief: createBrief({ id: "brief_workspace_b" }),
      papers: [createPaper({ id: "paper_workspace_b" })],
      ownerId: "user_1",
      workspaceId: "workspace_b",
      createdByUserId: "user_1",
      visibility: "workspace"
    });

    const route = await import("@/app/api/workspace/paper-notes/route");
    await route.POST(
      new Request("http://localhost/api/workspace/paper-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-brief-user-id": "user_1",
          "x-ai-brief-workspace-id": "workspace_a"
        },
        body: JSON.stringify({
          paperId: "paper_workspace_a",
          note: "Workspace A note."
        })
      })
    );
    await route.POST(
      new Request("http://localhost/api/workspace/paper-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-brief-user-id": "user_1",
          "x-ai-brief-workspace-id": "workspace_b"
        },
        body: JSON.stringify({
          paperId: "paper_workspace_b",
          note: "Workspace B note."
        })
      })
    );

    const response = await route.GET(
      new Request("http://localhost/api/workspace/paper-notes", {
        headers: {
          "x-ai-brief-user-id": "user_1",
          "x-ai-brief-workspace-id": "workspace_a"
        }
      })
    );
    const payload = await response.json();

    expect(response.headers.get("x-paper-note-scope")).toBe("user");
    expect(payload.historyScope).toBe("user");
    expect(payload.notes).toEqual([
      expect.objectContaining({
        paperId: "paper_workspace_a",
        ownerId: "user_1",
        workspaceId: "workspace_a",
        visibility: "workspace"
      })
    ]);
  });
});

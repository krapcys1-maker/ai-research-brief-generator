import { beforeEach, describe, expect, it } from "vitest";
import { inMemoryResearchProjectRepository } from "@/lib/workspace/inMemoryResearchProjectRepository";

describe("research projects API route", () => {
  beforeEach(async () => {
    await inMemoryResearchProjectRepository.clear();
  });

  it("saves and lists projects only for the same private session", async () => {
    const route = await import("@/app/api/workspace/projects/route");
    const createResponse = await route.POST(
      new Request("http://localhost/api/workspace/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: "ai_brief_history_session=brief_session_a"
        },
        body: JSON.stringify({
          title: "Clinical RAG watchlist",
          query: "retrieval augmented generation in clinical diagnosis",
          description: "Track clinical grounding papers.",
          sources: ["arxiv", "openalex"]
        })
      })
    );
    const createPayload = await createResponse.json();
    const sameSessionResponse = await route.GET(
      new Request("http://localhost/api/workspace/projects", {
        headers: { cookie: "ai_brief_history_session=brief_session_a" }
      })
    );
    const sameSessionPayload = await sameSessionResponse.json();
    const otherSessionResponse = await route.GET(
      new Request("http://localhost/api/workspace/projects", {
        headers: { cookie: "ai_brief_history_session=brief_session_b" }
      })
    );
    const otherSessionPayload = await otherSessionResponse.json();

    expect(createResponse.status).toBe(201);
    expect(createResponse.headers.get("x-research-project-scope")).toBe(
      "session"
    );
    expect(createPayload.project).toMatchObject({
      title: "Clinical RAG watchlist",
      ownerSessionId: "brief_session_a",
      visibility: "private",
      sources: ["arxiv", "openalex"]
    });
    expect(sameSessionPayload.projects).toEqual([
      expect.objectContaining({ id: createPayload.project.id })
    ]);
    expect(otherSessionPayload.projects).toEqual([]);
  });

  it("lists only projects in the trusted user workspace", async () => {
    const route = await import("@/app/api/workspace/projects/route");
    await route.POST(
      new Request("http://localhost/api/workspace/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-brief-user-id": "user_1",
          "x-ai-brief-workspace-id": "workspace_a"
        },
        body: JSON.stringify({
          title: "Workspace A project",
          query: "citation faithfulness",
          sources: ["semantic_scholar"]
        })
      })
    );
    await route.POST(
      new Request("http://localhost/api/workspace/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-brief-user-id": "user_1",
          "x-ai-brief-workspace-id": "workspace_b"
        },
        body: JSON.stringify({
          title: "Workspace B project",
          query: "clinical triage",
          sources: ["openalex"]
        })
      })
    );

    const response = await route.GET(
      new Request("http://localhost/api/workspace/projects", {
        headers: {
          "x-ai-brief-user-id": "user_1",
          "x-ai-brief-workspace-id": "workspace_a"
        }
      })
    );
    const payload = await response.json();

    expect(response.headers.get("x-research-project-scope")).toBe("user");
    expect(payload.historyScope).toBe("user");
    expect(payload.projects).toEqual([
      expect.objectContaining({
        title: "Workspace A project",
        ownerId: "user_1",
        workspaceId: "workspace_a",
        visibility: "workspace"
      })
    ]);
  });
});

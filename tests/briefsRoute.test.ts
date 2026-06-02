import { afterEach, describe, expect, it, vi } from "vitest";
import { createBriefJob as mockedCreateBriefJob } from "@/lib/jobs/briefJobs";
import { BRIEF_HISTORY_SESSION_COOKIE } from "@/lib/briefs/session";
import { resetRateLimitForTests } from "@/lib/security/rateLimit";
import { getBriefRepository as mockedGetBriefRepository } from "@/lib/storage/repository";

vi.mock("@/lib/jobs/briefJobs", () => ({
  createBriefJob: vi.fn()
}));

vi.mock("@/lib/storage/repository", () => ({
  getBriefRepository: vi.fn()
}));

const createBriefJobMock = vi.mocked(mockedCreateBriefJob);
const getBriefRepositoryMock = vi.mocked(mockedGetBriefRepository);

function queuedJob() {
  return {
    id: "job_test",
    status: "queued" as const,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    attemptCount: 0,
    maxAttempts: 2,
    request: {
      query: "retrieval augmented generation",
      maxPapers: 5,
      sources: ["mock"] as const
    }
  };
}

describe("POST /api/briefs", () => {
  afterEach(() => {
    vi.resetAllMocks();
    resetRateLimitForTests();
    vi.unstubAllEnvs();
  });

  it("returns a job ID when generation is queued", async () => {
    createBriefJobMock.mockResolvedValueOnce(queuedJob());

    const { POST } = await import("@/app/api/briefs/route");
    const response = await POST(
      new Request("http://localhost/api/briefs", {
        method: "POST",
        body: JSON.stringify({
          query: "retrieval augmented generation",
          maxPapers: 5,
          sources: ["mock"]
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("4");
    expect(payload).toEqual({
      jobId: "job_test",
      status: "queued"
    });
    expect(response.headers.get("set-cookie")).toContain(
      BRIEF_HISTORY_SESSION_COOKIE
    );
    expect(createBriefJobMock).toHaveBeenCalledWith(
      {
        query: "retrieval augmented generation",
        maxPapers: 5,
        sources: ["mock"]
      },
      {
        ownerSessionId: expect.stringMatching(/^brief_session_/)
      }
    );
  });

  it("queues authenticated jobs with user and workspace ownership", async () => {
    createBriefJobMock.mockResolvedValueOnce(queuedJob());

    const { POST } = await import("@/app/api/briefs/route");
    const response = await POST(
      new Request("http://localhost/api/briefs", {
        method: "POST",
        headers: {
          "x-ai-brief-user-id": "user_alpha",
          "x-ai-brief-workspace-id": "workspace_alpha"
        },
        body: JSON.stringify({
          query: "retrieval augmented generation",
          maxPapers: 5,
          sources: ["mock"]
        })
      })
    );

    expect(response.status).toBe(202);
    expect(response.headers.get("X-Brief-History-Scope")).toBe("user");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(createBriefJobMock).toHaveBeenCalledWith(
      {
        query: "retrieval augmented generation",
        maxPapers: 5,
        sources: ["mock"]
      },
      {
        ownerId: "user_alpha",
        workspaceId: "workspace_alpha",
        createdByUserId: "user_alpha",
        visibility: "workspace"
      }
    );
  });

  it("rejects invalid generation requests before creating a job", async () => {
    const { POST } = await import("@/app/api/briefs/route");
    const response = await POST(
      new Request("http://localhost/api/briefs", {
        method: "POST",
        body: JSON.stringify({
          query: "x",
          maxPapers: 5,
          sources: ["mock"]
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.status).toBe("error");
    expect(createBriefJobMock).not.toHaveBeenCalled();
  });

  it("rate limits costly brief generation requests per client", async () => {
    vi.stubEnv("BRIEF_RATE_LIMIT_MAX", "1");
    vi.stubEnv("BRIEF_RATE_LIMIT_WINDOW_MS", "60000");
    createBriefJobMock.mockResolvedValue(queuedJob());

    const { POST } = await import("@/app/api/briefs/route");
    const requestBody = JSON.stringify({
      query: "retrieval augmented generation",
      maxPapers: 5,
      sources: ["mock"]
    });

    const firstResponse = await POST(
      new Request("http://localhost/api/briefs", {
        method: "POST",
        headers: {
          "x-forwarded-for": "203.0.113.10"
        },
        body: requestBody
      })
    );
    const secondResponse = await POST(
      new Request("http://localhost/api/briefs", {
        method: "POST",
        headers: {
          "x-forwarded-for": "203.0.113.10"
        },
        body: requestBody
      })
    );
    const payload = await secondResponse.json();

    expect(firstResponse.status).toBe(202);
    expect(secondResponse.status).toBe(429);
    expect(secondResponse.headers.get("Retry-After")).toBeTruthy();
    expect(secondResponse.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(payload.status).toBe("error");
    expect(payload.error).toContain("Too many brief generation requests");
    expect(createBriefJobMock).toHaveBeenCalledTimes(1);
  });

  it("rate limits authenticated generation per user and workspace", async () => {
    vi.stubEnv("BRIEF_RATE_LIMIT_MAX", "1");
    vi.stubEnv("BRIEF_RATE_LIMIT_WINDOW_MS", "60000");
    createBriefJobMock.mockResolvedValue(queuedJob());

    const { POST } = await import("@/app/api/briefs/route");
    const requestBody = JSON.stringify({
      query: "retrieval augmented generation",
      maxPapers: 5,
      sources: ["mock"]
    });
    const baseHeaders = {
      "x-forwarded-for": "203.0.113.10",
      "x-ai-brief-workspace-id": "workspace_alpha"
    };

    const firstUserResponse = await POST(
      new Request("http://localhost/api/briefs", {
        method: "POST",
        headers: {
          ...baseHeaders,
          "x-ai-brief-user-id": "user_alpha"
        },
        body: requestBody
      })
    );
    const secondUserResponse = await POST(
      new Request("http://localhost/api/briefs", {
        method: "POST",
        headers: {
          ...baseHeaders,
          "x-ai-brief-user-id": "user_beta"
        },
        body: requestBody
      })
    );
    const repeatedUserResponse = await POST(
      new Request("http://localhost/api/briefs", {
        method: "POST",
        headers: {
          ...baseHeaders,
          "x-ai-brief-user-id": "user_alpha"
        },
        body: requestBody
      })
    );

    expect(firstUserResponse.status).toBe(202);
    expect(secondUserResponse.status).toBe(202);
    expect(repeatedUserResponse.status).toBe(429);
    expect(createBriefJobMock).toHaveBeenCalledTimes(2);
  });

  it("returns a controlled configuration error when production rate limiting is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION", "");

    const { POST } = await import("@/app/api/briefs/route");
    const response = await POST(
      new Request("http://localhost/api/briefs", {
        method: "POST",
        body: JSON.stringify({
          query: "retrieval augmented generation",
          maxPapers: 5,
          sources: ["mock"]
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.status).toBe("configuration_error");
    expect(payload.error).toContain("shared rate limit backend");
    expect(createBriefJobMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/briefs", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns brief summaries when public history is enabled", async () => {
    vi.stubEnv("PUBLIC_BRIEF_HISTORY_ENABLED", "true");
    getBriefRepositoryMock.mockResolvedValueOnce({
      saveWithPapers: vi.fn(),
      getById: vi.fn(),
      list: vi.fn(),
      clear: vi.fn(),
      listSummaries: vi.fn().mockResolvedValue([
        {
          id: "brief_public",
          title: "Public history item",
          query: "AI agents",
          generatedAt: "2026-01-01T00:00:00.000Z",
          outputLanguage: "en",
          createdAt: "2026-01-01T00:00:00.000Z"
        }
      ])
    });

    const { GET } = await import("@/app/api/briefs/route");
    const response = await GET(new Request("http://localhost/api/briefs"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.historyScope).toBe("public");
    expect(payload.briefs).toHaveLength(1);
    expect(payload.briefs[0].id).toBe("brief_public");
  });

  it("returns session-scoped brief summaries when public history is disabled", async () => {
    vi.stubEnv("PUBLIC_BRIEF_HISTORY_ENABLED", "false");
    const repository = {
      saveWithPapers: vi.fn(),
      getById: vi.fn(),
      list: vi.fn(),
      clear: vi.fn(),
      listSummaries: vi.fn().mockResolvedValue([
        {
          id: "brief_private",
          title: "Private history item",
          query: "AI agents",
          generatedAt: "2026-01-01T00:00:00.000Z",
          outputLanguage: "en",
          createdAt: "2026-01-01T00:00:00.000Z"
        }
      ])
    };
    getBriefRepositoryMock.mockResolvedValueOnce(repository);

    const { GET } = await import("@/app/api/briefs/route");
    const response = await GET(
      new Request("http://localhost/api/briefs", {
        headers: {
          cookie: `${BRIEF_HISTORY_SESSION_COOKIE}=brief_session_existing`
        }
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(payload.historyScope).toBe("session");
    expect(payload.briefs[0].id).toBe("brief_private");
    expect(getBriefRepositoryMock).toHaveBeenCalled();
    expect(repository.listSummaries).toHaveBeenCalledWith({
      ownerSessionId: "brief_session_existing"
    });
  });

  it("returns authenticated user and workspace scoped brief summaries", async () => {
    vi.stubEnv("PUBLIC_BRIEF_HISTORY_ENABLED", "false");
    const repository = {
      saveWithPapers: vi.fn(),
      getById: vi.fn(),
      list: vi.fn(),
      clear: vi.fn(),
      listSummaries: vi.fn().mockResolvedValue([
        {
          id: "brief_workspace",
          title: "Workspace history item",
          query: "AI agents",
          generatedAt: "2026-01-01T00:00:00.000Z",
          outputLanguage: "en",
          createdAt: "2026-01-01T00:00:00.000Z",
          ownerId: "user_alpha",
          workspaceId: "workspace_alpha",
          createdByUserId: "user_alpha",
          visibility: "workspace"
        }
      ])
    };
    getBriefRepositoryMock.mockResolvedValueOnce(repository);

    const { GET } = await import("@/app/api/briefs/route");
    const response = await GET(
      new Request("http://localhost/api/briefs", {
        headers: {
          "x-ai-brief-user-id": "user_alpha",
          "x-ai-brief-workspace-id": "workspace_alpha"
        }
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Brief-History-Scope")).toBe("user");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(payload.historyScope).toBe("user");
    expect(payload.briefs[0].id).toBe("brief_workspace");
    expect(repository.listSummaries).toHaveBeenCalledWith({
      ownerId: "user_alpha",
      workspaceId: "workspace_alpha"
    });
  });
});

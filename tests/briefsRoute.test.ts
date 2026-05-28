import { afterEach, describe, expect, it, vi } from "vitest";
import { createBriefJob as mockedCreateBriefJob } from "@/lib/jobs/briefJobs";
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
    createBriefJobMock.mockReturnValueOnce(queuedJob());

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
    expect(createBriefJobMock).toHaveBeenCalledWith({
      query: "retrieval augmented generation",
      maxPapers: 5,
      sources: ["mock"]
    });
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
    createBriefJobMock.mockReturnValue(queuedJob());

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
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.briefs).toHaveLength(1);
    expect(payload.briefs[0].id).toBe("brief_public");
  });

  it("blocks brief summaries when public history is disabled", async () => {
    vi.stubEnv("PUBLIC_BRIEF_HISTORY_ENABLED", "false");

    const { GET } = await import("@/app/api/briefs/route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.status).toBe("disabled");
    expect(payload.error).toContain("disabled");
    expect(getBriefRepositoryMock).not.toHaveBeenCalled();
  });
});


import { afterEach, describe, expect, it, vi } from "vitest";
import { createBrief as mockedCreateBrief } from "@/lib/pipeline/createBrief";
import { ResearchQualityGateError } from "@/lib/pipeline/qualityGate";
import { resetRateLimitForTests } from "@/lib/security/rateLimit";
import { getBriefRepository as mockedGetBriefRepository } from "@/lib/storage/repository";
import { createBrief as createBriefFixture } from "./fixtures";

vi.mock("@/lib/pipeline/createBrief", () => ({
  createBrief: vi.fn()
}));

vi.mock("@/lib/storage/repository", () => ({
  getBriefRepository: vi.fn()
}));

const createBriefMock = vi.mocked(mockedCreateBrief);
const getBriefRepositoryMock = vi.mocked(mockedGetBriefRepository);

describe("POST /api/briefs", () => {
  afterEach(() => {
    vi.resetAllMocks();
    resetRateLimitForTests();
    vi.unstubAllEnvs();
  });

  it("returns a brief ID when creation succeeds", async () => {
    createBriefMock.mockResolvedValueOnce({
      brief: createBriefFixture({ id: "brief_test" }),
      papers: [],
      createdAt: "2026-01-01T00:00:00.000Z"
    });

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

    expect(response.status).toBe(200);
    expect(response.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("4");
    expect(payload).toEqual({
      briefId: "brief_test",
      status: "completed"
    });
  });

  it("returns a controlled provider configuration error", async () => {
    createBriefMock.mockRejectedValueOnce(
      new Error("Missing DEEPSEEK_API_KEY. Add it to .env.")
    );

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
    expect(payload.status).toBe("error");
    expect(payload.error).toContain("DEEPSEEK_API_KEY");
  });

  it("returns quality gate details when sources are too weak", async () => {
    createBriefMock.mockRejectedValueOnce(
      new ResearchQualityGateError({
        coverage: "poor",
        canSynthesize: false,
        selectedPaperCount: 0,
        livePaperCount: 0,
        mockPaperCount: 0,
        averageRelevance: 0,
        warningCount: 1,
        reasons: ["No relevant papers were available after deduplication and scoring."],
        suggestions: ["Try this broader query: stem cells burn treatment"]
      })
    );

    const { POST } = await import("@/app/api/briefs/route");
    const response = await POST(
      new Request("http://localhost/api/briefs", {
        method: "POST",
        body: JSON.stringify({
          query: "komórki macierzyste",
          maxPapers: 5,
          sources: ["mock", "openalex"]
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.status).toBe("quality_gate_failed");
    expect(payload.qualityGate.coverage).toBe("poor");
    expect(payload.qualityGate.suggestions[0]).toContain("stem cells");
  });

  it("rate limits costly brief generation requests per client", async () => {
    vi.stubEnv("BRIEF_RATE_LIMIT_MAX", "1");
    vi.stubEnv("BRIEF_RATE_LIMIT_WINDOW_MS", "60000");
    createBriefMock.mockResolvedValue({
      brief: createBriefFixture({ id: "brief_rate_limited" }),
      papers: [],
      createdAt: "2026-01-01T00:00:00.000Z"
    });

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

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(429);
    expect(secondResponse.headers.get("Retry-After")).toBeTruthy();
    expect(secondResponse.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(payload.status).toBe("error");
    expect(payload.error).toContain("Too many brief generation requests");
    expect(createBriefMock).toHaveBeenCalledTimes(1);
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
    expect(createBriefMock).not.toHaveBeenCalled();
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

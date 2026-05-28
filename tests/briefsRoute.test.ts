import { afterEach, describe, expect, it, vi } from "vitest";
import { createBrief as mockedCreateBrief } from "@/lib/pipeline/createBrief";
import { resetRateLimitForTests } from "@/lib/security/rateLimit";
import { createBrief as createBriefFixture } from "./fixtures";

vi.mock("@/lib/pipeline/createBrief", () => ({
  createBrief: vi.fn()
}));

const createBriefMock = vi.mocked(mockedCreateBrief);

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
});

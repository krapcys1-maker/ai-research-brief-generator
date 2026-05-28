import { afterEach, describe, expect, it, vi } from "vitest";
import { createBrief as mockedCreateBrief } from "@/lib/pipeline/createBrief";
import { createBrief as createBriefFixture } from "./fixtures";

vi.mock("@/lib/pipeline/createBrief", () => ({
  createBrief: vi.fn()
}));

const createBriefMock = vi.mocked(mockedCreateBrief);

describe("POST /api/briefs", () => {
  afterEach(() => {
    vi.resetAllMocks();
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
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { preflightBrief as mockedPreflightBrief } from "@/lib/pipeline/preflightBrief";
import { createPaper } from "@/tests/fixtures";

vi.mock("@/lib/pipeline/preflightBrief", () => ({
  preflightBrief: vi.fn()
}));

const preflightBriefMock = vi.mocked(mockedPreflightBrief);

describe("POST /api/briefs/preflight", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns source coverage and selected paper previews", async () => {
    preflightBriefMock.mockResolvedValueOnce({
      request: {
        query: "AI agents in software engineering",
        maxPapers: 5,
        sources: ["openalex"]
      },
      outputLanguage: "en",
      queryVariants: ["AI agents in software engineering"],
      rawPapers: [],
      dedupedPapers: [],
      scoredPapers: [],
      selectedPapers: [
        createPaper({
          id: "paper_1",
          title: "AI Agents in Software Engineering",
          source: "openalex",
          relevanceScore: 0.8,
          finalScore: 0.7
        })
      ],
      sourcesUsed: ["openalex"],
      sourceDiagnostics: [],
      warnings: [],
      searchSummary: {
        requestedSources: ["openalex"],
        sourcesUsed: ["openalex"],
        totalFound: 1,
        totalAfterDeduplication: 1,
        totalUsedInBrief: 1,
        queryVariants: ["AI agents in software engineering"],
        sourceDiagnostics: [],
        warnings: []
      },
      qualityGate: {
        coverage: "limited",
        canSynthesize: true,
        selectedPaperCount: 1,
        livePaperCount: 1,
        mockPaperCount: 0,
        averageRelevance: 0.8,
        warningCount: 0,
        reasons: [],
        suggestions: []
      }
    });

    const { POST } = await import("@/app/api/briefs/preflight/route");
    const response = await POST(
      new Request("http://localhost/api/briefs/preflight", {
        method: "POST",
        body: JSON.stringify({
          query: "AI agents in software engineering",
          maxPapers: 5,
          sources: ["openalex"]
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("completed");
    expect(payload.qualityGate.coverage).toBe("limited");
    expect(payload.papers[0]).toMatchObject({
      id: "paper_1",
      title: "AI Agents in Software Engineering",
      source: "openalex"
    });
  });
});

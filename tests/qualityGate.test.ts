import { describe, expect, it } from "vitest";
import { evaluateResearchQuality } from "@/lib/pipeline/qualityGate";
import { createPaper } from "@/tests/fixtures";

describe("evaluateResearchQuality", () => {
  it("blocks synthesis when no relevant papers were selected", () => {
    const result = evaluateResearchQuality({
      request: {
        query: "stem cells burn treatment",
        maxPapers: 10,
        sources: ["mock", "openalex"]
      },
      selected: [],
      warnings: ["openalex returned no papers."],
      queryVariants: ["stem cells burn treatment"]
    });

    expect(result.canSynthesize).toBe(false);
    expect(result.coverage).toBe("poor");
    expect(result.reasons[0]).toContain("No relevant papers");
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("marks strong live-source coverage as good", () => {
    const selected = Array.from({ length: 6 }, (_, index) =>
      createPaper({
        id: `paper_${index}`,
        source: "openalex",
        relevanceScore: 0.7
      })
    );

    const result = evaluateResearchQuality({
      request: {
        query: "CRISPR gene therapy safety",
        maxPapers: 10,
        sources: ["openalex"]
      },
      selected,
      warnings: [],
      queryVariants: ["CRISPR gene therapy safety"]
    });

    expect(result.canSynthesize).toBe(true);
    expect(result.coverage).toBe("good");
    expect(result.livePaperCount).toBe(6);
  });

  it("allows limited but usable coverage", () => {
    const selected = [
      createPaper({
        id: "paper_1",
        source: "openalex",
        relevanceScore: 0.6
      }),
      createPaper({
        id: "paper_2",
        source: "openalex",
        relevanceScore: 0.4
      })
    ];

    const result = evaluateResearchQuality({
      request: {
        query: "niche research question",
        maxPapers: 10,
        sources: ["openalex"]
      },
      selected,
      warnings: [],
      queryVariants: ["niche research question"]
    });

    expect(result.canSynthesize).toBe(true);
    expect(result.coverage).toBe("limited");
  });
});

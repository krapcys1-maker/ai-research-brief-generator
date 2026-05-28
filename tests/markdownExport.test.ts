import { describe, expect, it } from "vitest";
import { researchBriefToMarkdown } from "@/lib/export/markdown";
import { createBrief, createPaper } from "@/tests/fixtures";

describe("researchBriefToMarkdown", () => {
  it("includes search diagnostics and paper score breakdowns", () => {
    const markdown = researchBriefToMarkdown({
      brief: createBrief({
        searchSummary: {
          requestedSources: ["mock", "arxiv", "openalex"],
          sourcesUsed: ["mock", "openalex"],
          totalFound: 12,
          totalAfterDeduplication: 8,
          totalUsedInBrief: 1,
          queryVariants: [
            "retrieval augmented generation",
            "grounded generation healthcare"
          ],
          sourceDiagnostics: [
            {
              source: "mock",
              query: "retrieval augmented generation",
              status: "success",
              resultCount: 4,
              cached: true
            },
            {
              source: "semantic_scholar",
              query: "grounded generation healthcare",
              status: "failed",
              resultCount: 0,
              cached: false,
              message: "rate limited"
            }
          ],
          warnings: ["semantic_scholar failed: rate limited"]
        }
      }),
      papers: [
        createPaper({
          source: "openalex",
          citationCount: 42,
          influentialCitationCount: 7,
          relevanceScore: 0.91,
          citationScore: 0.72,
          recencyScore: 0.83,
          completenessScore: 1,
          sourceQualityScore: 0.9,
          identifierScore: 0.8,
          finalScore: 0.86
        })
      ]
    });

    expect(markdown).toContain("## Search Summary");
    expect(markdown).toContain("- Requested sources: mock, arxiv, openalex");
    expect(markdown).toContain("- Successful sources: mock, openalex");
    expect(markdown).toContain("### Query Variants");
    expect(markdown).toContain("- grounded generation healthcare");
    expect(markdown).toContain("### Source Diagnostics");
    expect(markdown).toContain(
      "| mock | success | 4 | yes | retrieval augmented generation |  |"
    );
    expect(markdown).toContain(
      "| semantic_scholar | failed | 0 | no | grounded generation healthcare | rate limited |"
    );
    expect(markdown).toContain("- Warnings: semantic_scholar failed: rate limited");
    expect(markdown).toContain("- Source: openalex");
    expect(markdown).toContain("- Influential citation count: 7");
    expect(markdown).toContain("- Final score: 0.86");
    expect(markdown).toContain(
      "- Score breakdown: relevance 0.91, citations 0.72, recency 0.83, completeness 1.00, source 0.90, identifiers 0.80"
    );
  });
});

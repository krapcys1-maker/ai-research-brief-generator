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
          abstract: "A useful abstract for export coverage.",
          doi: "10.1000/example",
          pdfUrl: "https://example.org/paper.pdf",
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

    expect(markdown).toContain("## Evidence Boundary");
    expect(markdown).toContain(
      "This brief is grounded in selected paper metadata"
    );
    expect(markdown).toContain("- Papers with abstracts: 1/1");
    expect(markdown).toContain("- Papers with PDF links: 1/1");
    expect(markdown).toContain("- Papers with DOI: 1/1");
    expect(markdown).toContain("## Source Quality");
    expect(markdown).toContain("**Weak source base:**");
    expect(markdown).toContain("- Strong query matches: 1");
    expect(markdown).toContain("- Direct query-title/abstract matches:");
    expect(markdown).toContain("- Weak query-title/abstract matches:");
    expect(markdown).toContain("**Evidence:**");
    expect(markdown).toContain(
      "- [paper_1] (direct) retrieval grounded generation supports clinical evaluation and reliability"
    );
    expect(markdown).toContain(
      "- DOI: [10.1000/example](https://doi.org/10.1000/example)"
    );
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
    expect(markdown).toContain("- Role:");
    expect(markdown).toContain("- Why read this:");
    expect(markdown).toContain("- Query alignment:");
    expect(markdown).toContain("- Query alignment detail:");
    expect(markdown).toContain("- Strengths:");
    expect(markdown).toContain("- Influential citation count: 7");
    expect(markdown).toContain("- Final score: 0.86");
    expect(markdown).toContain(
      "- Score breakdown: relevance 0.91, citations 0.72, recency 0.83, completeness 1.00, source 0.90, identifiers 0.80"
    );
  });
});

import { describe, expect, it } from "vitest";
import { preflightBrief } from "@/lib/pipeline/preflightBrief";
import { createPaper } from "@/tests/fixtures";

describe("preflightBrief", () => {
  it("checks sources and returns quality gate details without synthesis", async () => {
    const result = await preflightBrief(
      {
        query: "AI agents in software engineering",
        maxPapers: 5,
        sources: ["openalex"]
      },
      {
        search: async ({ query }) => ({
          papers: [
            createPaper({
              id: "paper_1",
              title: "AI Agents in Software Engineering",
              abstract: "Autonomous agents support software development.",
              source: "openalex",
              openAlexId: "W1",
              relevanceScore: undefined
            }),
            createPaper({
              id: "paper_2",
              title: "AI Agents for Software Engineering Testing",
              abstract: "AI agents generate and evaluate software engineering tests.",
              source: "openalex",
              openAlexId: "W2",
              doi: "10.1000/paper-2",
              sourceUrls: ["https://example.org/paper-2"],
              relevanceScore: undefined
            })
          ],
          sourcesUsed: ["openalex"],
          warnings: [],
          sourceDiagnostics: [
            {
              source: "openalex",
              query,
              status: "success",
              resultCount: 2,
              cached: false
            }
          ]
        })
      }
    );

    expect(result.selectedPapers).toHaveLength(2);
    expect(result.qualityGate.canSynthesize).toBe(true);
    expect(result.searchSummary.totalUsedInBrief).toBe(2);
    expect(result.queryVariants[0]).toBe("AI agents in software engineering");
  });

  it("returns a poor gate when source search fails or returns no papers", async () => {
    const result = await preflightBrief(
      {
        query: "zzzxqv nonexistent topic",
        maxPapers: 5,
        sources: ["openalex"]
      },
      {
        search: async () => {
          throw new Error("All query variants failed or returned no papers.");
        }
      }
    );

    expect(result.selectedPapers).toHaveLength(0);
    expect(result.qualityGate.coverage).toBe("poor");
    expect(result.qualityGate.canSynthesize).toBe(false);
    expect(result.warnings[0]).toContain("All query variants failed");
  });
});

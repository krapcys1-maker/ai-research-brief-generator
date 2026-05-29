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

  it("adds metadata warnings to the preflight summary and quality gate", async () => {
    const result = await preflightBrief(
      {
        query: "how transformers work",
        maxPapers: 5,
        sources: ["openalex"]
      },
      {
        search: async () => ({
          papers: [
            createPaper({
              id: "openalex:W2626778328",
              title: "Attention Is All You Need",
              abstract: "Transformer architectures use self-attention.",
              source: "openalex",
              openAlexId: "W2626778328",
              doi: "10.1000/unexpected",
              sourceUrls: ["https://openalex.org/W2626778328"],
              year: 2025
            }),
            createPaper({
              id: "paper_2",
              title: "Transformer Attention Mechanisms",
              abstract: "Self-attention supports transformer language models.",
              source: "openalex",
              openAlexId: "W2"
            })
          ],
          sourcesUsed: ["openalex"],
          warnings: [],
          sourceDiagnostics: []
        })
      }
    );

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("metadata warning:"),
        expect.stringContaining("normally cited as a 2017 paper")
      ])
    );
    expect(result.searchSummary.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("metadata warning:")])
    );
    expect(result.qualityGate.warningCount).toBeGreaterThan(0);
  });
});

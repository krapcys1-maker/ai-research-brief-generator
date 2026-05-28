import { describe, expect, it, beforeEach } from "vitest";
import { createBrief } from "@/lib/pipeline/createBrief";
import { inMemoryBriefRepository } from "@/lib/storage/inMemoryBriefStore";
import type { ResearchBrief } from "@/lib/ai/schemas";
import type { SynthesizeBriefInput } from "@/lib/ai/synthesizeBrief";

function createSyntheticBrief(input: SynthesizeBriefInput): ResearchBrief {
  const firstPaper = input.papers[0];

  if (!firstPaper) {
    throw new Error("Test expected at least one paper.");
  }

  return {
    id: input.id,
    query: input.query,
    outputLanguage: input.outputLanguage,
    generatedAt: "2026-01-01T00:00:00.000Z",
    title:
      input.outputLanguage === "pl"
        ? "Testowy brief badawczy"
        : "Test research brief",
    tldr:
      input.outputLanguage === "pl"
        ? "To jest testowy brief oparty na źródłach."
        : "This is a source-grounded test brief.",
    executiveSummary: {
      paragraph:
        input.outputLanguage === "pl"
          ? "Wybrane prace wspierają syntetyczny wniosek testowy."
          : "Selected papers support the synthetic test conclusion.",
      sourcePaperIds: [firstPaper.id]
    },
    keyFindings: [
      {
        finding: input.outputLanguage === "pl" ? "Wniosek testowy" : "Test finding",
        explanation:
          input.outputLanguage === "pl"
            ? "Wniosek zawiera poprawne źródło."
            : "The finding includes a valid source.",
        confidence: "medium",
        sourcePaperIds: [firstPaper.id],
        caveats: []
      }
    ],
    majorThemes: [
      {
        theme: input.outputLanguage === "pl" ? "Temat testowy" : "Test theme",
        description:
          input.outputLanguage === "pl"
            ? "Opis tematu jest uziemiony w źródle."
            : "The theme description is grounded in the source.",
        sourcePaperIds: [firstPaper.id]
      }
    ],
    influentialPapers: [
      {
        paperId: firstPaper.id,
        reason:
          input.outputLanguage === "pl"
            ? "Pierwsza wybrana praca."
            : "The first selected paper."
      }
    ],
    researchGaps: [
      {
        gap: input.outputLanguage === "pl" ? "Luka testowa" : "Test gap",
        whyItMatters:
          input.outputLanguage === "pl"
            ? "Luka ma znaczenie dla dalszych badań."
            : "The gap matters for future work.",
        sourcePaperIds: [firstPaper.id]
      }
    ],
    controversiesOrUncertainties: [
      {
        issue:
          input.outputLanguage === "pl"
            ? "Niepewność testowa"
            : "Test uncertainty",
        explanation:
          input.outputLanguage === "pl"
            ? "Niepewność ma poprawne źródło."
            : "The uncertainty includes a valid source.",
        sourcePaperIds: [firstPaper.id]
      }
    ],
    suggestedNextQuestions: [
      input.outputLanguage === "pl"
        ? "Jak zweryfikować te wyniki?"
        : "How should these results be verified?"
    ],
    searchSummary: input.searchSummary,
    bibliography: input.papers.map((paper) => ({
      paperId: paper.id,
      title: paper.title,
      authors: paper.authors,
      year: paper.year,
      url: paper.sourceUrls[0] ?? null,
      doi: paper.doi
    }))
  };
}

describe("createBrief", () => {
  beforeEach(async () => {
    await inMemoryBriefRepository.clear();
  });

  it("runs the mock pipeline and stores a grounded brief without calling AI", async () => {
    const record = await createBrief(
      {
        query: "retrieval augmented generation in medical diagnosis",
        maxPapers: 5,
        sources: ["mock"]
      },
      {
        synthesize: async (input) => createSyntheticBrief(input)
      }
    );

    expect(record.brief.id).toMatch(/^brief_/);
    expect(record.papers.length).toBeGreaterThan(0);
    expect(record.brief.searchSummary.requestedSources).toEqual(["mock"]);
    expect(record.brief.searchSummary.sourcesUsed).toEqual(["mock"]);
    expect(record.brief.searchSummary.totalUsedInBrief).toBe(record.papers.length);
    expect(
      (await inMemoryBriefRepository.getById(record.brief.id))?.brief.id
    ).toBe(record.brief.id);
  });

  it("detects Polish output language before synthesis", async () => {
    const record = await createBrief(
      {
        query: "wykrywanie halucynacji w modelach jezykowych",
        maxPapers: 5,
        sources: ["mock"]
      },
      {
        synthesize: async (input) => createSyntheticBrief(input)
      }
    );

    expect(record.brief.outputLanguage).toBe("pl");
    expect(record.brief.title).toBe("Testowy brief badawczy");
    expect(
      record.brief.searchSummary.queryVariants.some((variant) =>
        variant.includes("detection hallucination")
      )
    ).toBe(true);
  });

  it("stores per-source query diagnostics from source search", async () => {
    const record = await createBrief(
      {
        query: "retrieval augmented generation",
        maxPapers: 5,
        sources: ["mock", "openalex"]
      },
      {
        search: async ({ query }) => ({
          papers: [
            {
              id: "paper_1",
              title: "Retrieval-Augmented Generation for Medical Diagnosis",
              abstract: "A study about grounded generation in clinical settings.",
              authors: ["Ada Researcher"],
              year: 2024,
              publishedAt: "2024-01-01",
              doi: "10.1000/example",
              arxivId: null,
              semanticScholarId: null,
              openAlexId: null,
              sourceUrls: ["https://example.org/paper"],
              pdfUrl: null,
              venue: "Example Journal",
              citationCount: 10,
              influentialCitationCount: 1,
              source: "mock"
            }
          ],
          sourcesUsed: ["mock"],
          warnings: ["openalex returned no papers."],
          sourceDiagnostics: [
            {
              source: "mock",
              query,
              status: "success",
              resultCount: 1,
              cached: false
            },
            {
              source: "openalex",
              query,
              status: "empty",
              resultCount: 0,
              cached: false,
              message: "No papers returned."
            }
          ]
        }),
        synthesize: async (input) => createSyntheticBrief(input)
      }
    );

    expect(record.brief.searchSummary.sourceDiagnostics).toHaveLength(2);
    expect(record.brief.searchSummary.sourceDiagnostics[1]).toMatchObject({
      source: "openalex",
      status: "empty",
      resultCount: 0
    });
  });
});

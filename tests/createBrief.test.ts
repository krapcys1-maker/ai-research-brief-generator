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

  const evidence = [
    {
      paperId: firstPaper.id,
      evidenceText: firstPaper.abstract ?? firstPaper.title,
      supportLevel: "direct" as const
    }
  ];

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
      sourcePaperIds: [firstPaper.id],
      evidence
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
        evidence,
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
        sourcePaperIds: [firstPaper.id],
        evidence
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
        sourcePaperIds: [firstPaper.id],
        evidence
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
        sourcePaperIds: [firstPaper.id],
        evidence
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

  it("stores generated briefs with an owner session when provided", async () => {
    const record = await createBrief(
      {
        query: "retrieval augmented generation",
        maxPapers: 5,
        sources: ["mock"]
      },
      {
        synthesize: async (input) => createSyntheticBrief(input)
      },
      {
        ownerSessionId: "brief_session_pipeline"
      }
    );

    expect(record.ownerSessionId).toBe("brief_session_pipeline");
    expect(
      await inMemoryBriefRepository.listSummaries({
        ownerSessionId: "brief_session_pipeline"
      })
    ).toHaveLength(1);
    expect(
      await inMemoryBriefRepository.listSummaries({
        ownerSessionId: "brief_session_other"
      })
    ).toEqual([]);
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
              abstract:
                "A study about retrieval grounded generation in clinical evaluation and reliability.",
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
            },
            {
              id: "paper_2",
              title: "Retrieval-Augmented Generation for Clinical Question Answering",
              abstract:
                "A second retrieval grounded generation study for clinical evaluation.",
              authors: ["Ben Researcher"],
              year: 2024,
              publishedAt: "2024-02-01",
              doi: "10.1000/example-2",
              arxivId: null,
              semanticScholarId: null,
              openAlexId: "W123",
              sourceUrls: ["https://example.org/paper-2"],
              pdfUrl: null,
              venue: "Example Journal",
              citationCount: 8,
              influentialCitationCount: 1,
              source: "openalex"
            }
          ],
          sourcesUsed: ["mock", "openalex"],
          warnings: [],
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
              status: "success",
              resultCount: 1,
              cached: false
            }
          ]
        }),
        synthesize: async (input) => createSyntheticBrief(input)
      }
    );

    expect(record.brief.searchSummary.sourceDiagnostics).toHaveLength(2);
    expect(record.brief.searchSummary.sourceDiagnostics[1]).toMatchObject({
      source: "openalex",
      status: "success",
      resultCount: 1
    });
  });

  it("prioritizes relevant live papers over weak mock fallback papers", async () => {
    const record = await createBrief(
      {
        query: "Jak dzialaja transformery w sieciach ai",
        maxPapers: 5,
        sources: ["mock", "arxiv"]
      },
      {
        search: async ({ query }) => ({
          papers: [
            {
              id: "mock_irrelevant",
              title: "Federated Learning for Healthcare Informatics",
              abstract: "A privacy-preserving healthcare training review.",
              authors: ["Ada Researcher"],
              year: 2024,
              publishedAt: "2024-01-01",
              doi: "10.1000/mock",
              arxivId: null,
              semanticScholarId: null,
              openAlexId: null,
              sourceUrls: ["https://example.org/mock"],
              pdfUrl: null,
              venue: "Mock Journal",
              citationCount: 9000,
              influentialCitationCount: 900,
              source: "mock"
            },
            {
              id: "arxiv_transformer",
              title: "Transformer Attention Mechanisms in Language Models",
              abstract:
                "Transformers use self-attention networks for sequence modeling.",
              authors: ["Grace Researcher"],
              year: 2024,
              publishedAt: "2024-02-01",
              doi: null,
              arxivId: "2401.00001",
              semanticScholarId: null,
              openAlexId: null,
              sourceUrls: ["https://arxiv.org/abs/2401.00001"],
              pdfUrl: "https://arxiv.org/pdf/2401.00001",
              venue: "arXiv",
              citationCount: 5,
              influentialCitationCount: 1,
              source: "arxiv"
            },
            {
              id: "arxiv_transformer_2",
              title: "Self Attention Networks for Transformer Language Models",
              abstract:
                "A second paper about transformers, self-attention, and language model networks.",
              authors: ["Alan Researcher"],
              year: 2024,
              publishedAt: "2024-03-01",
              doi: null,
              arxivId: "2401.00002",
              semanticScholarId: null,
              openAlexId: null,
              sourceUrls: ["https://arxiv.org/abs/2401.00002"],
              pdfUrl: "https://arxiv.org/pdf/2401.00002",
              venue: "arXiv",
              citationCount: 4,
              influentialCitationCount: 1,
              source: "arxiv"
            }
          ],
          sourcesUsed: ["mock", "arxiv"],
          warnings: [],
          sourceDiagnostics: [
            {
              source: "mock",
              query,
              status: "success",
              resultCount: 1,
              cached: false
            },
            {
              source: "arxiv",
              query,
              status: "success",
              resultCount: 1,
              cached: false
            }
          ]
        }),
        synthesize: async (input) => createSyntheticBrief(input)
      }
    );

    expect(record.papers[0]?.id).toMatch(/^arxiv_transformer/);
    expect(record.papers[0]?.source).toBe("arxiv");
    expect(record.papers[0]?.relevanceScore).toBeGreaterThan(0);
    expect(record.brief.searchSummary.warnings).not.toContain(
      "brief quality warning: selected papers are mock/demo records only, even though live sources were requested."
    );
  });

  it("limits AI synthesis to top papers while keeping preflight source search broad", async () => {
    let synthesisPaperCount = 0;
    const papers = Array.from({ length: 8 }, (_, index) => ({
      id: `openalex_${index + 1}`,
      title: `Retrieval-Augmented Generation for Medical Diagnosis ${index + 1}`,
      abstract:
        "Retrieval augmented generation supports medical diagnosis research with grounded evidence and clinical evaluation.",
      authors: [`Researcher ${index + 1}`],
      year: 2024,
      publishedAt: "2024-01-01",
      doi: `10.1000/rag-${index + 1}`,
      arxivId: null,
      semanticScholarId: null,
      openAlexId: `W${index + 1}`,
      sourceUrls: [`https://example.org/rag-${index + 1}`],
      pdfUrl: null,
      venue: "Example Journal",
      citationCount: 20 - index,
      influentialCitationCount: 2,
      source: "openalex" as const
    }));

    const record = await createBrief(
      {
        query: "retrieval augmented generation in medical diagnosis",
        maxPapers: 8,
        sources: ["openalex"]
      },
      {
        search: async ({ query }) => ({
          papers,
          sourcesUsed: ["openalex"],
          warnings: [],
          sourceDiagnostics: [
            {
              source: "openalex",
              query,
              status: "success",
              resultCount: papers.length,
              cached: false
            }
          ]
        }),
        synthesize: async (input) => {
          synthesisPaperCount = input.papers.length;
          return createSyntheticBrief(input);
        }
      }
    );

    expect(synthesisPaperCount).toBe(5);
    expect(record.papers).toHaveLength(5);
    expect(record.brief.searchSummary.totalFound).toBe(8);
    expect(record.brief.searchSummary.totalUsedInBrief).toBe(5);
    expect(record.brief.searchSummary.warnings).toContain(
      "brief synthesis limited to the top 5 selected papers for reliable structured generation."
    );
  });
});

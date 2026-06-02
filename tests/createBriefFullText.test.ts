import { beforeEach, describe, expect, it } from "vitest";
import type { ResearchBrief } from "@/lib/ai/schemas";
import type { SynthesizeBriefInput } from "@/lib/ai/synthesizeBrief";
import { createBrief } from "@/lib/pipeline/createBrief";
import { inMemoryBriefRepository } from "@/lib/storage/inMemoryBriefStore";
import type { NormalizedPaper } from "@/lib/sources/types";

function syntheticBrief(input: SynthesizeBriefInput): ResearchBrief {
  const paper = input.papers[0];
  if (!paper) {
    throw new Error("paper required");
  }

  return {
    id: input.id,
    query: input.query,
    outputLanguage: input.outputLanguage,
    generatedAt: "2026-01-01T00:00:00.000Z",
    title: "Full-text resilient brief",
    tldr: "The brief still works when full-text ingestion fails.",
    executiveSummary: {
      paragraph: "The selected paper supports the brief.",
      sourcePaperIds: [paper.id],
      evidence: [
        {
          paperId: paper.id,
          evidenceText: paper.abstract ?? paper.title,
          supportLevel: "direct",
          evidenceLevel: paper.abstract ? "abstract_supported" : "metadata_only"
        }
      ]
    },
    keyFindings: [
      {
        finding: "Full-text failures do not block synthesis.",
        explanation: "The brief can fall back to abstracts.",
        confidence: "medium",
        sourcePaperIds: [paper.id],
        evidence: [
          {
            paperId: paper.id,
            evidenceText: paper.abstract ?? paper.title,
            supportLevel: "direct",
            evidenceLevel: paper.abstract ? "abstract_supported" : "metadata_only"
          }
        ],
        caveats: []
      }
    ],
    majorThemes: [
      {
        theme: "Resilience",
        description: "The pipeline keeps abstract fallback.",
        sourcePaperIds: [paper.id],
        evidence: [
          {
            paperId: paper.id,
            evidenceText: paper.abstract ?? paper.title,
            supportLevel: "direct",
            evidenceLevel: paper.abstract ? "abstract_supported" : "metadata_only"
          }
        ]
      }
    ],
    influentialPapers: [{ paperId: paper.id, reason: "Selected top paper." }],
    researchGaps: [
      {
        gap: "Full-text coverage",
        whyItMatters: "Not every PDF can be parsed.",
        sourcePaperIds: [paper.id],
        evidence: [
          {
            paperId: paper.id,
            evidenceText: paper.abstract ?? paper.title,
            supportLevel: "direct",
            evidenceLevel: paper.abstract ? "abstract_supported" : "metadata_only"
          }
        ]
      }
    ],
    controversiesOrUncertainties: [
      {
        issue: "Evidence boundary",
        explanation: "Abstract fallback is weaker than parsed full text.",
        sourcePaperIds: [paper.id],
        evidence: [
          {
            paperId: paper.id,
            evidenceText: paper.abstract ?? paper.title,
            supportLevel: "direct",
            evidenceLevel: paper.abstract ? "abstract_supported" : "metadata_only"
          }
        ]
      }
    ],
    suggestedNextQuestions: ["Which papers have parsed full text?"],
    searchSummary: input.searchSummary,
    bibliography: input.papers.map((item) => ({
      paperId: item.id,
      title: item.title,
      authors: item.authors,
      year: item.year,
      url: item.sourceUrls[0] ?? null,
      doi: item.doi
    }))
  };
}

function paper(): NormalizedPaper {
  return {
    id: "arxiv:2401.00001",
    title: "Transformer Methods",
    abstract: "Transformers use attention in language models.",
    authors: ["Ada Researcher"],
    year: 2024,
    publishedAt: "2024-01-01",
    doi: null,
    arxivId: "2401.00001",
    semanticScholarId: null,
    openAlexId: null,
    sourceUrls: ["https://arxiv.org/abs/2401.00001"],
    pdfUrl: "https://arxiv.org/pdf/2401.00001",
    venue: "arXiv",
    citationCount: 1,
    influentialCitationCount: 0,
    source: "arxiv"
  };
}

function paperWithId(id: string): NormalizedPaper {
  return {
    ...paper(),
    id,
    title: `Transformer Methods ${id}`,
    arxivId: id.replace("arxiv:", ""),
    sourceUrls: [`https://arxiv.org/abs/${id.replace("arxiv:", "")}`],
    pdfUrl: `https://arxiv.org/pdf/${id.replace("arxiv:", "")}`
  };
}

describe("createBrief full-text resilience", () => {
  beforeEach(async () => {
    await inMemoryBriefRepository.clear();
  });

  it("does not fail brief generation when full-text ingestion fails", async () => {
    const record = await createBrief(
      {
        query: "transformer methods",
        maxPapers: 5,
        sources: ["arxiv"]
      },
      {
        search: async ({ query }) => ({
          papers: [
            paperWithId("arxiv:2401.00001"),
            paperWithId("arxiv:2401.00002"),
            paperWithId("arxiv:2401.00003")
          ],
          sourcesUsed: ["arxiv"],
          warnings: [],
          sourceDiagnostics: [
            {
              source: "arxiv",
              query,
              status: "success",
              resultCount: 1,
              cached: false
            }
          ]
        }),
        ingestFullText: async (papers) =>
          papers.map((item) => ({
            ...item,
            fullTextStatus: "failed",
            fullTextErrorMessage: "PDF request timed out"
          })),
        synthesize: async (input) => syntheticBrief(input)
      }
    );

    expect(record.brief.id).toMatch(/^brief_/);
    expect(record.papers[0].fullTextStatus).toBe("failed");
    expect(record.brief.title).toBe("Full-text resilient brief");
  });
});

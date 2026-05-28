import type { ResearchBrief } from "@/lib/ai/schemas";
import type { NormalizedPaper } from "@/lib/sources/types";

const defaultEvidence = [
  {
    paperId: "paper_1",
    evidenceText: "grounded generation in clinical settings",
    supportLevel: "direct" as const
  }
];

export function createPaper(overrides: Partial<NormalizedPaper> = {}): NormalizedPaper {
  return {
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
    source: "mock",
    ...overrides
  };
}

export function createBrief(overrides: Partial<ResearchBrief> = {}): ResearchBrief {
  return {
    id: "brief_1",
    query: "retrieval augmented generation",
    outputLanguage: "en",
    generatedAt: "2026-01-01T00:00:00.000Z",
    title: "Grounded Generation Brief",
    tldr: "Grounding improves verifiability.",
    executiveSummary: {
      paragraph: "Evidence supports retrieval grounding.",
      sourcePaperIds: ["paper_1"],
      evidence: defaultEvidence
    },
    keyFindings: [
      {
        finding: "Retrieval helps grounding.",
        explanation: "Retrieved sources can support generated claims.",
        confidence: "medium",
        sourcePaperIds: ["paper_1"],
        evidence: defaultEvidence,
        caveats: []
      }
    ],
    majorThemes: [
      {
        theme: "Grounding",
        description: "Systems cite retrieved documents.",
        sourcePaperIds: ["paper_1"],
        evidence: defaultEvidence
      }
    ],
    influentialPapers: [
      {
        paperId: "paper_1",
        reason: "It is the selected seed paper."
      }
    ],
    researchGaps: [
      {
        gap: "Clinical evaluation",
        whyItMatters: "Deployment requires validated clinical workflows.",
        sourcePaperIds: ["paper_1"],
        evidence: defaultEvidence
      }
    ],
    controversiesOrUncertainties: [
      {
        issue: "Evaluation reliability",
        explanation: "Metrics may not capture clinical safety.",
        sourcePaperIds: ["paper_1"],
        evidence: defaultEvidence
      }
    ],
    suggestedNextQuestions: ["How should citations be audited?"],
    searchSummary: {
      requestedSources: ["mock"],
      sourcesUsed: ["mock"],
      totalFound: 1,
      totalAfterDeduplication: 1,
      totalUsedInBrief: 1,
      queryVariants: ["retrieval augmented generation"],
      sourceDiagnostics: [
        {
          source: "mock",
          query: "retrieval augmented generation",
          status: "success",
          resultCount: 1,
          cached: false
        }
      ],
      warnings: []
    },
    bibliography: [
      {
        paperId: "paper_1",
        title: "Retrieval-Augmented Generation for Medical Diagnosis",
        authors: ["Ada Researcher"],
        year: 2024,
        url: "https://example.org/paper",
        doi: "10.1000/example"
      }
    ],
    ...overrides
  };
}

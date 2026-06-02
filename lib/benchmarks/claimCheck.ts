import { compareClaimsWithScience } from "@/lib/claimCheck/compare";
import type {
  ClaimCheckReport,
  ClaimEvidenceBoundary,
  ClaimClassification
} from "@/lib/claimCheck/schemas";
import type {
  FullTextRepository,
  PaperFullText,
  PaperTextChunk
} from "@/lib/fulltext/types";
import type { SearchAllSourcesResult } from "@/lib/sources";
import type { NormalizedPaper, ResearchSource } from "@/lib/sources/types";

export type ClaimCheckBenchmarkCase = {
  name: string;
  claim: string;
  expectedClassification: ClaimClassification;
  papers: NormalizedPaper[];
  requiresEvidence?: boolean;
  requiresSimilarWork?: boolean;
  requiresCaveats?: boolean;
  expectedEvidenceBoundary?: ClaimEvidenceBoundary;
  fullTextChunks?: PaperTextChunk[];
};

export type ClaimCheckCaseResult = {
  name: string;
  claim: string;
  expectedClassification: ClaimClassification;
  actualClassification: ClaimClassification;
  classificationHit: boolean;
  evidenceSnippetCount: number;
  relatedPaperCount: number;
  caveatCount: number;
  evidenceBoundary: string;
  evidenceRequirementMet: boolean;
  similarWorkRequirementMet: boolean;
  caveatRequirementMet: boolean;
  evidenceBoundaryRequirementMet: boolean;
};

export type ClaimCheckBenchmarkResult = {
  caseCount: number;
  classificationAccuracy: number;
  evidenceRequirementFailures: number;
  similarWorkRequirementFailures: number;
  caveatRequirementFailures: number;
  evidenceBoundaryRequirementFailures: number;
  results: ClaimCheckCaseResult[];
};

function createBenchmarkPaper(
  overrides: Partial<NormalizedPaper> & Pick<NormalizedPaper, "id" | "title" | "abstract">
): NormalizedPaper {
  const { id, title, abstract, ...rest } = overrides;

  return {
    id,
    title,
    abstract,
    authors: ["Benchmark Author"],
    year: 2024,
    publishedAt: "2024-01-01",
    doi: null,
    arxivId: null,
    semanticScholarId: null,
    openAlexId: null,
    sourceUrls: [`https://example.org/${id}`],
    pdfUrl: null,
    venue: "Benchmark Fixture Journal",
    citationCount: 10,
    influentialCitationCount: 1,
    source: "mock",
    ...rest
  };
}

function liveSourcePaper(
  overrides: Partial<NormalizedPaper> & Pick<NormalizedPaper, "id" | "title" | "abstract">
): NormalizedPaper {
  return createBenchmarkPaper({
    authors: ["Recorded Fixture Author"],
    citationCount: 24,
    influentialCitationCount: 3,
    sourceUrls: [`https://example.org/${overrides.id}`],
    venue: "Recorded Fixture Venue",
    ...overrides
  });
}

function fullTextChunk(input: {
  id: string;
  paperId: string;
  text: string;
  sectionTitle?: string;
  chunkIndex?: number;
}): PaperTextChunk {
  return {
    id: input.id,
    paperId: input.paperId,
    fullTextId: `fulltext_${input.paperId}`,
    sectionTitle: input.sectionTitle ?? "Methods",
    chunkIndex: input.chunkIndex ?? 0,
    text: input.text,
    tokenEstimate: input.text.split(/\s+/).filter(Boolean).length,
    pageStart: 1,
    pageEnd: 1,
    evidenceLevel: "full_text_supported"
  };
}

export const claimCheckBenchmarkCases: ClaimCheckBenchmarkCase[] = [
  {
    name: "supported claim with direct retrieved evidence",
    claim: "RAG reduces hallucinations in clinical AI systems.",
    expectedClassification: "supported",
    requiresEvidence: true,
    papers: [
      createBenchmarkPaper({
        id: "claim_supported_rag",
        title: "Grounded Generation Evaluation in Medicine",
        abstract:
          "RAG reduces hallucinations in clinical AI systems by grounding answers in retrieved medical references."
      })
    ]
  },
  {
    name: "partially supported claim with related but incomplete evidence",
    claim: "AI nutrition coaching improves glycemic control in pregnant patients.",
    expectedClassification: "partially_supported",
    requiresEvidence: true,
    requiresCaveats: true,
    papers: [
      createBenchmarkPaper({
        id: "claim_partial_glycemic",
        title: "Digital Coaching for Diabetes Management",
        abstract:
          "Digital coaching for glycemic control has been studied in diabetes management and patient self-monitoring workflows."
      })
    ]
  },
  {
    name: "contradicted claim with conflicting retrieved evidence",
    claim: "RAG improves clinical reliability in hospital diagnosis.",
    expectedClassification: "contradicted",
    requiresEvidence: true,
    requiresCaveats: true,
    papers: [
      createBenchmarkPaper({
        id: "claim_contradicted_rag",
        title: "Clinical Reliability Evaluation of Retrieval Systems",
        abstract:
          "The study reports that RAG does not improve clinical reliability in hospital diagnosis under the evaluated workflow."
      })
    ]
  },
  {
    name: "insufficient evidence when retrieval returns no papers",
    claim: "Quantum graph prompts improve clinical neonatal sepsis triage.",
    expectedClassification: "insufficient_evidence",
    papers: []
  },
  {
    name: "too broad overclaim with absolute wording",
    claim: "RAG always eliminates all hallucinations in every clinical setting.",
    expectedClassification: "too_broad",
    requiresCaveats: true,
    papers: [
      createBenchmarkPaper({
        id: "claim_overbroad_rag",
        title: "Retrieval Grounding for Clinical Language Models",
        abstract:
          "Retrieval grounding can reduce unsupported answers, but safety depends on retrieval quality and clinical context."
      })
    ]
  },
  {
    name: "non-scientific note is not treated as a scientific claim",
    claim: "Hello and thank you for reading this project note.",
    expectedClassification: "not_scientific_claim",
    requiresCaveats: true,
    papers: []
  },
  {
    name: "close prior work is classified as already known or done",
    claim: "RAG improves clinical reliability",
    expectedClassification: "already_known_or_done",
    requiresEvidence: true,
    requiresSimilarWork: true,
    papers: [
      createBenchmarkPaper({
        id: "claim_prior_work_rag",
        title: "RAG improves clinical reliability",
        abstract:
          "RAG improves clinical reliability in controlled evaluation by grounding answers in retrieved evidence."
      })
    ]
  },
  {
    name: "possible dead end uses cautious wording",
    claim: "This AI approach is impossible for clinical diagnosis.",
    expectedClassification: "possible_dead_end",
    requiresEvidence: true,
    requiresCaveats: true,
    papers: [
      createBenchmarkPaper({
        id: "claim_dead_end_clinical",
        title: "Limitations of AI Approaches for Clinical Diagnosis",
        abstract:
          "This AI approach has weak evidence and uncertain clinical diagnosis utility in available studies."
      })
    ]
  },
  {
    name: "recorded arXiv clinical RAG claim is abstract-supported",
    claim: "Clinical RAG systems use citations to support diagnosis.",
    expectedClassification: "supported",
    expectedEvidenceBoundary: "abstract_supported",
    requiresEvidence: true,
    papers: [
      liveSourcePaper({
        id: "arxiv_live_clinical_rag_claim",
        title: "Retrieval-Augmented Generation & Clinical QA",
        abstract:
          "A clinical RAG system uses citations and retrieval augmented generation to support diagnosis in clinical question answering.",
        arxivId: "2401.12345",
        doi: "10.48550/arXiv.2401.12345",
        pdfUrl: "https://arxiv.org/pdf/2401.12345v2",
        source: "arxiv",
        venue: "arXiv cs.CL"
      })
    ]
  },
  {
    name: "recorded Semantic Scholar citation faithfulness claim is abstract-supported",
    claim:
      "Medical RAG citation faithfulness can be benchmarked with citation support evidence.",
    expectedClassification: "supported",
    expectedEvidenceBoundary: "abstract_supported",
    requiresEvidence: true,
    papers: [
      liveSourcePaper({
        id: "semantic_live_citation_faithfulness_claim",
        title: "Evaluating Citation Faithfulness in Medical RAG",
        abstract:
          "A benchmark for citation support evaluates citation faithfulness in medical retrieval augmented generation.",
        doi: "10.1000/semantic",
        semanticScholarId: "abc123",
        source: "semantic_scholar",
        venue: "ACL"
      })
    ]
  },
  {
    name: "recorded full-text transformer claim uses full-text boundary",
    claim: "Self-attention heads weight token relationships in transformer models.",
    expectedClassification: "supported",
    expectedEvidenceBoundary: "full_text_supported",
    requiresEvidence: true,
    papers: [
      liveSourcePaper({
        id: "arxiv_fulltext_attention_claim",
        title: "Attention Is All You Need",
        abstract:
          "The Transformer is a sequence transduction architecture based on attention mechanisms.",
        arxivId: "1706.03762",
        doi: "10.48550/arXiv.1706.03762",
        fullTextChunkCount: 1,
        fullTextQualityScore: 0.94,
        fullTextSourceType: "arxiv",
        fullTextStatus: "parsed",
        pdfUrl: "https://arxiv.org/pdf/1706.03762",
        source: "arxiv",
        year: 2017
      })
    ],
    fullTextChunks: [
      fullTextChunk({
        id: "chunk_attention_self_heads",
        paperId: "arxiv_fulltext_attention_claim",
        text:
          "Self-attention heads weight token relationships in transformer models and connect sequence positions through attention distributions."
      })
    ]
  }
];

function sourcesForCase(benchmarkCase: ClaimCheckBenchmarkCase): ResearchSource[] {
  const sources = [
    ...new Set(
      benchmarkCase.papers
        .map((paper) => paper.source)
        .filter((source): source is ResearchSource => source !== "merged")
    )
  ];

  return sources.length ? sources : ["mock"];
}

function searchForCase(
  benchmarkCase: ClaimCheckBenchmarkCase
): SearchAllSourcesResult {
  const sources = sourcesForCase(benchmarkCase);

  return {
    papers: benchmarkCase.papers,
    sourcesUsed: benchmarkCase.papers.length ? sources : [],
    warnings: [],
    sourceDiagnostics: [
      {
        source: sources[0] ?? "mock",
        query: benchmarkCase.claim,
        status: benchmarkCase.papers.length ? "success" : "empty",
        resultCount: benchmarkCase.papers.length,
        cached: false
      }
    ]
  };
}

function fullTextRepositoryForCase(
  benchmarkCase: ClaimCheckBenchmarkCase
): FullTextRepository | undefined {
  if (!benchmarkCase.fullTextChunks?.length) {
    return undefined;
  }

  return {
    async save(input) {
      return input.fullText;
    },
    async getByPaperId(paperId) {
      const hasChunks = benchmarkCase.fullTextChunks?.some(
        (chunk) => chunk.paperId === paperId
      );

      if (!hasChunks) {
        return null;
      }

      const timestamp = new Date(0).toISOString();
      return {
        id: `fulltext_${paperId}`,
        paperId,
        status: "parsed",
        sourceType: "arxiv",
        sourceUrl: `https://example.org/${paperId}.pdf`,
        parserName: "benchmark-fixture",
        textHash: `hash_${paperId}`,
        extractedAt: timestamp,
        errorMessage: null,
        qualityScore: 0.94,
        createdAt: timestamp,
        updatedAt: timestamp
      } satisfies PaperFullText;
    },
    async getChunksByPaperIds(paperIds) {
      const ids = new Set(paperIds);
      return (benchmarkCase.fullTextChunks ?? []).filter((chunk) =>
        ids.has(chunk.paperId)
      );
    },
    async clear() {
      return undefined;
    }
  };
}

function findItem(report: ClaimCheckReport, claim: string) {
  const item = report.items.find((candidate) => candidate.claimText === claim);

  if (!item) {
    throw new Error(`Claim check report did not include benchmark claim: ${claim}`);
  }

  return item;
}

export async function evaluateClaimCheckCase(
  benchmarkCase: ClaimCheckBenchmarkCase
): Promise<ClaimCheckCaseResult> {
  const report = await compareClaimsWithScience({
    request: {
      claims: [benchmarkCase.claim],
      sources: sourcesForCase(benchmarkCase),
      maxPapers: 5
    },
    dependencies: {
      fullTextRepository: fullTextRepositoryForCase(benchmarkCase),
      search: async () => searchForCase(benchmarkCase)
    }
  });
  const item = findItem(report, benchmarkCase.claim);
  const evidenceSnippetCount = item.evidenceSnippets.length;
  const relatedPaperCount = item.relatedPapers.length;
  const caveatCount = item.caveats.length;
  const evidenceRequirementMet =
    !benchmarkCase.requiresEvidence || evidenceSnippetCount > 0;
  const similarWorkRequirementMet =
    !benchmarkCase.requiresSimilarWork ||
    (relatedPaperCount > 0 && report.similarWork.length > 0);
  const caveatRequirementMet = !benchmarkCase.requiresCaveats || caveatCount > 0;
  const evidenceBoundaryRequirementMet =
    !benchmarkCase.expectedEvidenceBoundary ||
    item.evidenceBoundary === benchmarkCase.expectedEvidenceBoundary;

  return {
    name: benchmarkCase.name,
    claim: benchmarkCase.claim,
    expectedClassification: benchmarkCase.expectedClassification,
    actualClassification: item.classification,
    classificationHit: item.classification === benchmarkCase.expectedClassification,
    evidenceSnippetCount,
    relatedPaperCount,
    caveatCount,
    evidenceBoundary: item.evidenceBoundary,
    evidenceRequirementMet,
    similarWorkRequirementMet,
    caveatRequirementMet,
    evidenceBoundaryRequirementMet
  };
}

export async function evaluateClaimCheckCases(
  cases = claimCheckBenchmarkCases
): Promise<ClaimCheckBenchmarkResult> {
  const results = await Promise.all(cases.map(evaluateClaimCheckCase));
  const classificationAccuracy =
    results.filter((result) => result.classificationHit).length /
    Math.max(1, results.length);
  const evidenceRequirementFailures = results.filter(
    (result) => !result.evidenceRequirementMet
  ).length;
  const similarWorkRequirementFailures = results.filter(
    (result) => !result.similarWorkRequirementMet
  ).length;
  const caveatRequirementFailures = results.filter(
    (result) => !result.caveatRequirementMet
  ).length;
  const evidenceBoundaryRequirementFailures = results.filter(
    (result) => !result.evidenceBoundaryRequirementMet
  ).length;

  return {
    caseCount: results.length,
    classificationAccuracy,
    evidenceRequirementFailures,
    similarWorkRequirementFailures,
    caveatRequirementFailures,
    evidenceBoundaryRequirementFailures,
    results
  };
}

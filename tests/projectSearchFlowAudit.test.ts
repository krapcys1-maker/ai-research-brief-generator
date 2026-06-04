import { describe, expect, it } from "vitest";
import {
  auditSearchFlow,
  rankCandidatePapersForFullText
} from "@/lib/project-research";
import type { EvidenceCollectionResult } from "@/lib/project-research/evidenceCollector";
import type { NormalizedPaper, SourceSearchDiagnostic } from "@/lib/sources/types";

function paper(overrides: Partial<NormalizedPaper> & Pick<NormalizedPaper, "id" | "title">): NormalizedPaper {
  return {
    abstract: "agent evaluation reliability paper",
    arxivId: null,
    authors: ["Audit Author"],
    citationCount: 10,
    doi: null,
    id: overrides.id,
    influentialCitationCount: 1,
    openAlexId: null,
    pdfUrl: null,
    publishedAt: "2026-01-01",
    semanticScholarId: null,
    source: "semantic_scholar",
    sourceUrls: [`https://example.com/${overrides.id}`],
    title: overrides.title,
    venue: "Audit Venue",
    year: 2026,
    ...overrides
  };
}

function evidenceResult(overrides: Partial<EvidenceCollectionResult> = {}): EvidenceCollectionResult {
  return {
    reviewedPapers: [],
    bucketMetrics: [
      {
        bucketId: "agent_reliability",
        candidateCount: 3,
        reviewedCount: 3,
        usefulReviewedCount: 1,
        parsedCount: 1,
        topPaperIds: ["metadata_only", "pdf_candidate", "arxiv_candidate"],
        coverageReady: true
      }
    ],
    requiredReadyCount: 1,
    requiredBucketCount: 1,
    missingRequiredBuckets: [],
    canBuildReadyBrief: true,
    ...overrides
  };
}

function diagnostics(resultCount = 2): SourceSearchDiagnostic[] {
  return [
    {
      cached: false,
      query: "agent run replay evaluation",
      resultCount,
      source: "semantic_scholar",
      status: resultCount > 0 ? "success" : "empty"
    }
  ];
}

describe("search flow audit", () => {
  it("ranks legal full-text candidates before metadata-only papers", () => {
    const ranked = rankCandidatePapersForFullText({
      bucketMetrics: evidenceResult().bucketMetrics,
      papers: [
        paper({ id: "metadata_only", title: "Metadata Only", citationCount: 900 }),
        paper({
          id: "pdf_candidate",
          title: "PDF Candidate",
          citationCount: 5,
          pdfUrl: "https://example.com/pdf-candidate.pdf"
        }),
        paper({
          id: "arxiv_candidate",
          title: "Arxiv Candidate",
          arxivId: "2601.00001",
          citationCount: 3
        })
      ]
    });

    expect(ranked.map((candidate) => candidate.id)).toEqual([
      "pdf_candidate",
      "arxiv_candidate",
      "metadata_only"
    ]);
  });

  it("flags weak search flow when candidates cannot reach legal full text", () => {
    const candidate = paper({ id: "metadata_only", title: "Metadata Only" });
    const audit = auditSearchFlow({
      candidatePapers: [candidate],
      dedupedPapers: [candidate],
      evidenceCollection: evidenceResult(),
      fullTextAttempts: [
        {
          paper: candidate,
          fullText: {
            status: "unavailable"
          }
        }
      ],
      queryVariants: ["agent run replay evaluation"],
      rawPapers: [candidate],
      sourceDiagnostics: diagnostics()
    });

    expect(audit.verdict).toBe("needs_review");
    expect(audit.candidateWithFullTextCandidateCount).toBe(0);
    expect(audit.parsedFullTextCount).toBe(0);
    expect(audit.warnings).toContain(
      "Few candidate papers have legal full-text/PDF candidates."
    );
    expect(audit.warnings).toContain(
      "Full-text ingestion attempted papers but parsed none."
    );
  });

  it("passes when source search, bucket coverage and full-text parsing are healthy", () => {
    const candidate = paper({
      id: "pdf_candidate",
      title: "PDF Candidate",
      pdfUrl: "https://example.com/pdf-candidate.pdf"
    });
    const audit = auditSearchFlow({
      candidatePapers: [candidate],
      dedupedPapers: [candidate],
      evidenceCollection: evidenceResult({
        bucketMetrics: [
          {
            bucketId: "agent_reliability",
            candidateCount: 1,
            reviewedCount: 1,
            usefulReviewedCount: 1,
            parsedCount: 1,
            topPaperIds: ["pdf_candidate"],
            coverageReady: true
          }
        ]
      }),
      fullTextAttempts: [
        {
          paper: candidate,
          fullText: {
            status: "parsed"
          }
        }
      ],
      queryVariants: ["agent run replay evaluation"],
      rawPapers: [candidate],
      sourceDiagnostics: diagnostics()
    });

    expect(audit.verdict).toBe("pass");
    expect(audit.successfulQueryCount).toBe(1);
    expect(audit.requiredBucketCandidateCoverage).toBe(1);
    expect(audit.candidateWithFullTextCandidateCount).toBe(1);
    expect(audit.parsedFullTextCount).toBe(1);
    expect(audit.warnings).toEqual([]);
  });

  it("flags source fragility when multiple configured sources yield one contributor", () => {
    const candidate = paper({
      id: "pdf_candidate",
      title: "PDF Candidate",
      pdfUrl: "https://example.com/pdf-candidate.pdf",
      source: "openalex"
    });
    const audit = auditSearchFlow({
      candidatePapers: [candidate],
      dedupedPapers: [candidate],
      evidenceCollection: evidenceResult({
        bucketMetrics: [
          {
            bucketId: "agent_reliability",
            candidateCount: 1,
            reviewedCount: 1,
            usefulReviewedCount: 1,
            parsedCount: 1,
            topPaperIds: ["pdf_candidate"],
            coverageReady: true
          }
        ]
      }),
      fullTextAttempts: [
        {
          paper: candidate,
          fullText: {
            status: "parsed"
          }
        }
      ],
      queryVariants: ["agent sandbox"],
      rawPapers: [candidate],
      sourceDiagnostics: [
        {
          cached: false,
          query: "agent sandbox",
          resultCount: 0,
          source: "arxiv",
          status: "failed",
          message: "rate limited"
        },
        {
          cached: false,
          query: "agent sandbox",
          resultCount: 0,
          source: "semantic_scholar",
          status: "failed",
          message: "rate limited"
        },
        {
          cached: false,
          query: "agent sandbox",
          resultCount: 3,
          source: "openalex",
          status: "success"
        }
      ]
    });

    expect(audit.verdict).toBe("needs_review");
    expect(audit.warnings).toContain("Search relies on a single contributing source.");
  });
});

import { describe, expect, it } from "vitest";
import {
  getPaperInsight,
  getSourceQualitySummary
} from "@/lib/pipeline/paperInsights";
import { createPaper } from "@/tests/fixtures";

describe("paperInsights", () => {
  it("explains why a paper is worth reading from deterministic metadata", () => {
    const insight = getPaperInsight(
      createPaper({
        title: "Benchmarking Retrieval-Augmented Generation in Medicine",
        source: "openalex",
        abstract: "A benchmark paper.",
        doi: "10.1000/benchmark",
        year: 2025,
        relevanceScore: 0.72,
        citationCount: 20
      }),
      2026,
      "retrieval augmented generation medicine"
    );

    expect(insight.role).toBe("Benchmark or evaluation");
    expect(insight.queryAlignment?.label).toBe("Direct topic match");
    expect(insight.queryAlignment?.matchedTerms).toContain("retrieval");
    expect(insight.whyRead).toContain("direct query-title/abstract alignment");
    expect(insight.strengths).toContain("DOI available");
    expect(insight.limitations).toEqual([]);
  });

  it("flags weak source limitations", () => {
    const insight = getPaperInsight(
      createPaper({
        source: "mock",
        abstract: null,
        doi: null,
        arxivId: null,
        semanticScholarId: null,
        openAlexId: null,
        relevanceScore: 0.1,
        year: 2000,
        citationCount: 0
      }),
      2026
    );

    expect(insight.limitations).toContain(
      "weak query match, so verify whether it really fits"
    );
    expect(insight.limitations).toContain(
      "mock/demo source, useful for testing but weaker evidence"
    );
    expect(insight.limitations).toContain(
      "no abstract available, so grounding is metadata-heavy"
    );
  });

  it("summarizes source quality signals across selected papers", () => {
    const summary = getSourceQualitySummary([
      createPaper({
        title: "Retrieval-Augmented Generation for Medicine",
        source: "openalex",
        abstract: "Retrieval augmented generation for medical evidence.",
        doi: "10.1000/a",
        relevanceScore: 0.8
      }),
      createPaper({
        title: "Augmented Generation for Clinical Question Answering",
        source: "arxiv",
        abstract: "Generation systems retrieve clinical and medical evidence.",
        doi: null,
        arxivId: "2401.00001",
        relevanceScore: 0.55
      }),
      createPaper({
        source: "mock",
        abstract: null,
        doi: null,
        relevanceScore: 0.1
      })
    ], "retrieval augmented generation medicine");

    expect(summary.metrics.totalPapers).toBe(3);
    expect(summary.metrics.livePapers).toBe(2);
    expect(summary.metrics.papersWithAbstracts).toBe(2);
    expect(summary.metrics.highRelevancePapers).toBe(2);
    expect(summary.metrics.strongQueryAlignmentPapers).toBeGreaterThan(0);
    expect(summary.cautions).toContain("few DOI-backed identifiers");
  });
});

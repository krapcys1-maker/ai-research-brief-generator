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
      2026
    );

    expect(insight.role).toBe("Benchmark or evaluation");
    expect(insight.whyRead).toContain("strong title/abstract match");
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
        source: "openalex",
        abstract: "A useful abstract.",
        doi: "10.1000/a",
        relevanceScore: 0.8
      }),
      createPaper({
        source: "arxiv",
        abstract: "Another useful abstract.",
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
    ]);

    expect(summary.metrics.totalPapers).toBe(3);
    expect(summary.metrics.livePapers).toBe(2);
    expect(summary.metrics.papersWithAbstracts).toBe(2);
    expect(summary.metrics.highRelevancePapers).toBe(2);
    expect(summary.cautions).toContain("few DOI-backed identifiers");
  });
});

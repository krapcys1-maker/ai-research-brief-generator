import { describe, expect, it } from "vitest";
import {
  buildProjectResearchBrief,
  buildProjectResearchPlan,
  collectProjectEvidenceFromPapers
} from "@/lib/project-research";
import type {
  EvidenceBucket,
  ProjectIdeaInput
} from "@/lib/project-research/types";
import type { NormalizedPaper } from "@/lib/sources/types";

function paperForBucket(bucket: EvidenceBucket, index: number): NormalizedPaper {
  return {
    id: `collector_${bucket.id}_${index}`,
    title: `${bucket.label} ${bucket.keywords.join(" ")}`,
    abstract: `${bucket.query}. ${bucket.targetQuestions.join(" ")}`,
    authors: ["Benchmark Author"],
    year: 2025,
    publishedAt: "2025-01-01",
    doi: `10.1000/${bucket.id}.${index}`,
    arxivId: null,
    semanticScholarId: `${bucket.id}-${index}`,
    openAlexId: null,
    sourceUrls: [`https://example.com/${bucket.id}/${index}`],
    pdfUrl: `https://example.com/${bucket.id}/${index}.pdf`,
    venue: "Collector Test Venue",
    citationCount: 42,
    influentialCitationCount: 7,
    source: "semantic_scholar",
    fullTextStatus: "parsed"
  };
}

function thinPaperForBucket(bucket: EvidenceBucket): NormalizedPaper {
  return {
    ...paperForBucket(bucket, 1),
    id: `collector_thin_${bucket.id}`,
    abstract: null,
    doi: null,
    arxivId: null,
    semanticScholarId: null,
    openAlexId: null,
    pdfUrl: null,
    fullTextStatus: "unavailable"
  };
}

const tradingIdea: ProjectIdeaInput = {
  title: "AI Trading Bot",
  description:
    "Bot tradingowy na gieldzie uzywajacy AI, backtestow i kontroli ryzyka.",
  constraints: ["najpierw paper trading"],
  preferredDomains: ["algorithmic trading"],
  outputLanguage: "pl"
};

describe("collectProjectEvidenceFromPapers", () => {
  it("maps normalized papers to reviewed papers with complete bucket coverage", () => {
    const { researchPlan } = buildProjectResearchPlan(tradingIdea);
    const papers = researchPlan.evidenceBuckets.flatMap((bucket) => [
      paperForBucket(bucket, 1),
      paperForBucket(bucket, 2)
    ]);

    const result = collectProjectEvidenceFromPapers({
      researchPlan,
      papers,
      maxPapersPerBucket: 2
    });

    expect(result.canBuildReadyBrief).toBe(true);
    expect(result.requiredReadyCount).toBe(result.requiredBucketCount);
    expect(result.missingRequiredBuckets).toEqual([]);
    expect(result.bucketMetrics.every((metric) => metric.coverageReady)).toBe(true);
    expect(result.reviewedPapers.length).toBeGreaterThanOrEqual(
      researchPlan.evidenceBuckets.length
    );

    const brief = buildProjectResearchBrief({
      idea: tradingIdea,
      reviewedPapers: result.reviewedPapers,
      generatedAt: "2026-06-03T14:00:00.000Z"
    });

    expect(brief.readyForArchitecture).toBe(true);
  });

  it("does not mark metadata-only papers as enough for ready coverage", () => {
    const { researchPlan } = buildProjectResearchPlan(tradingIdea);
    const papers = researchPlan.evidenceBuckets.map(thinPaperForBucket);

    const result = collectProjectEvidenceFromPapers({
      researchPlan,
      papers,
      maxPapersPerBucket: 2
    });

    expect(result.canBuildReadyBrief).toBe(false);
    expect(result.requiredReadyCount).toBe(0);
    expect(result.missingRequiredBuckets).toEqual(
      researchPlan.evidenceBuckets.map((bucket) => bucket.id)
    );
    expect(
      result.reviewedPapers.every((paper) => paper.usefulForProject === false)
    ).toBe(true);
  });

  it("keeps bucket IDs compatible with ProjectResearchBrief validation", () => {
    const { researchPlan } = buildProjectResearchPlan(tradingIdea);
    const papers = researchPlan.evidenceBuckets.flatMap((bucket) => [
      paperForBucket(bucket, 1),
      paperForBucket(bucket, 2)
    ]);

    const result = collectProjectEvidenceFromPapers({ researchPlan, papers });
    const planBucketIds = new Set(
      researchPlan.evidenceBuckets.map((bucket) => bucket.id)
    );

    expect(
      result.reviewedPapers.every((paper) =>
        paper.bucketIds.every((bucketId) => planBucketIds.has(bucketId))
      )
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildProjectResearchBrief,
  buildProjectResearchPlan,
  projectResearchBriefToMarkdown
} from "@/lib/project-research";
import { ProjectResearchBriefSchema } from "@/lib/project-research/schemas";
import type {
  ProjectIdeaInput,
  ReviewedPaper
} from "@/lib/project-research/types";

function paperForBucket(
  bucketId: string,
  index: number,
  overrides: Partial<ReviewedPaper> = {}
): ReviewedPaper {
  return {
    paperId: `paper_${bucketId}_${index}`,
    title: `Evidence for ${bucketId} ${index}`,
    year: 2025,
    url: `https://example.com/${bucketId}/${index}`,
    doi: null,
    bucketIds: [bucketId],
    fullTextStatus: "parsed",
    usefulForProject: true,
    evidenceStrength: "full_text_partial",
    keyMethods: [`method for ${bucketId}`],
    limitations: [`limitation for ${bucketId}`],
    implementationImplications: [`use ${bucketId} as an architecture input`],
    riskImplications: [`risk from ${bucketId}`],
    ...overrides
  };
}

function papersForRequiredBuckets(idea: ProjectIdeaInput) {
  const { researchPlan } = buildProjectResearchPlan(idea);
  return researchPlan.evidenceBuckets.flatMap((bucket) => [
    paperForBucket(bucket.id, 1),
    paperForBucket(bucket.id, 2)
  ]);
}

const tradingIdea: ProjectIdeaInput = {
  title: "AI Trading Bot",
  description:
    "Bot tradingowy na gieldzie uzywajacy AI, backtestow i kontroli ryzyka.",
  constraints: ["najpierw paper trading"],
  preferredDomains: ["algorithmic trading"],
  outputLanguage: "pl"
};

const repoIdea: ProjectIdeaInput = {
  title: "Repo Optimizer AI",
  description:
    "Aplikacja skanujaca repozytoria, robiaca code review i wykrywajaca bugi.",
  constraints: ["MVP tylko rekomenduje zmiany"],
  preferredDomains: ["software engineering", "LLM code review"],
  outputLanguage: "pl"
};

describe("buildProjectResearchBrief", () => {
  it("creates a valid ready ProjectResearchBrief when every required bucket has evidence", () => {
    const brief = buildProjectResearchBrief({
      idea: tradingIdea,
      reviewedPapers: papersForRequiredBuckets(tradingIdea),
      generatedAt: "2026-06-03T12:00:00.000Z"
    });

    expect(ProjectResearchBriefSchema.parse(brief)).toEqual(brief);
    expect(brief.readyForPrd).toBe(true);
    expect(brief.readyForArchitecture).toBe(true);
    expect(brief.evidenceCoverage.requiredCoveredCount).toBe(
      brief.evidenceCoverage.requiredBucketCount
    );
    expect(brief.evidenceCoverage.missingRequiredBuckets).toEqual([]);
    expect(brief.audit.score).toBeGreaterThanOrEqual(90);
    expect(brief.projectInsights.every((insight) => insight.sourcePaperIds.length > 0)).toBe(
      true
    );
  });

  it("blocks PRD and architecture when required buckets are missing", () => {
    const { researchPlan } = buildProjectResearchPlan(repoIdea);
    const partialPapers = [
      paperForBucket(researchPlan.evidenceBuckets[0].id, 1),
      paperForBucket(researchPlan.evidenceBuckets[0].id, 2)
    ];

    const brief = buildProjectResearchBrief({
      idea: repoIdea,
      reviewedPapers: partialPapers,
      generatedAt: "2026-06-03T12:00:00.000Z"
    });

    expect(brief.readyForPrd).toBe(false);
    expect(brief.readyForArchitecture).toBe(false);
    expect(brief.readiness.architecture).toBe("needs_more_research");
    expect(brief.evidenceCoverage.requiredCoveredCount).toBe(1);
    expect(brief.evidenceCoverage.missingRequiredBuckets.length).toBeGreaterThan(0);
    expect(brief.audit.mustFixBeforeArchitecture).toContain(
      "nie generowac architektury do czasu pelnego coverage"
    );
  });

  it("exports the generated brief to markdown with readiness and audit", () => {
    const brief = buildProjectResearchBrief({
      idea: tradingIdea,
      reviewedPapers: papersForRequiredBuckets(tradingIdea),
      generatedAt: "2026-06-03T12:00:00.000Z"
    });

    const markdown = projectResearchBriefToMarkdown(brief);

    expect(markdown).toContain("# AI Trading Bot");
    expect(markdown).toContain("## Evidence Coverage");
    expect(markdown).toContain("Required buckets covered: 5/5");
    expect(markdown).toContain("## Recommended Technical Direction");
    expect(markdown).toContain("## Audit");
  });
});

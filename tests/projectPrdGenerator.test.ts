import { describe, expect, it } from "vitest";
import {
  buildProjectResearchBrief,
  buildProjectResearchPlan
} from "@/lib/project-research";
import {
  generateProjectPrd,
  projectPrdToMarkdown,
  ProjectPrdSchema
} from "@/lib/project-prd";
import type {
  ProjectIdeaInput,
  ReviewedPaper
} from "@/lib/project-research";

function paperForBucket(bucketId: string, index: number): ReviewedPaper {
  return {
    paperId: `prd_${bucketId}_${index}`,
    title: `PRD evidence for ${bucketId} ${index}`,
    year: 2025,
    url: `https://example.com/prd/${bucketId}/${index}`,
    doi: `10.1000/prd.${bucketId}.${index}`,
    bucketIds: [bucketId],
    fullTextStatus: "parsed",
    usefulForProject: true,
    evidenceStrength: "full_text_partial",
    keyMethods: [`method for ${bucketId}`],
    limitations: [`limitation for ${bucketId}`],
    implementationImplications: [`support ${bucketId} in product scope`],
    riskImplications: [`risk from ${bucketId}`]
  };
}

function fullEvidenceForIdea(idea: ProjectIdeaInput) {
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

describe("generateProjectPrd", () => {
  it("generates a ready evidence-backed PRD from a ready ProjectResearchBrief", () => {
    const brief = buildProjectResearchBrief({
      idea: tradingIdea,
      reviewedPapers: fullEvidenceForIdea(tradingIdea),
      generatedAt: "2026-06-03T15:00:00.000Z"
    });

    const prd = generateProjectPrd({
      brief,
      generatedAt: "2026-06-03T15:05:00.000Z"
    });

    expect(ProjectPrdSchema.parse(prd)).toEqual(prd);
    expect(prd.status).toBe("ready");
    expect(prd.requirements.length).toBeGreaterThanOrEqual(3);
    expect(prd.blockers).toEqual([]);
    expect(prd.traceability.requirementCount).toBe(prd.requirements.length);
    expect(prd.traceability.requirementsWithPaperSources).toBe(
      prd.requirements.length
    );
    expect(prd.traceability.sourcePaperIds.length).toBeGreaterThan(0);
  });

  it("blocks PRD generation when research brief is not ready", () => {
    const { researchPlan } = buildProjectResearchPlan(tradingIdea);
    const brief = buildProjectResearchBrief({
      idea: tradingIdea,
      reviewedPapers: [
        paperForBucket(researchPlan.evidenceBuckets[0].id, 1),
        paperForBucket(researchPlan.evidenceBuckets[0].id, 2)
      ],
      generatedAt: "2026-06-03T15:00:00.000Z"
    });

    const prd = generateProjectPrd({
      brief,
      generatedAt: "2026-06-03T15:05:00.000Z"
    });

    expect(prd.status).toBe("blocked");
    expect(prd.requirements).toEqual([]);
    expect(prd.blockers.length).toBeGreaterThan(0);
    expect(prd.audit.score).toBeLessThanOrEqual(55);
  });

  it("exports PRD markdown with requirements, traceability, and audit", () => {
    const brief = buildProjectResearchBrief({
      idea: tradingIdea,
      reviewedPapers: fullEvidenceForIdea(tradingIdea),
      generatedAt: "2026-06-03T15:00:00.000Z"
    });
    const prd = generateProjectPrd({ brief });

    const markdown = projectPrdToMarkdown(prd);

    expect(markdown).toContain("# AI Trading Bot PRD");
    expect(markdown).toContain("## Requirements");
    expect(markdown).toContain("## Traceability");
    expect(markdown).toContain("Requirements with paper sources");
    expect(markdown).toContain("## Audit");
  });

  it("rejects ready PRDs with requirements that have no paper sources", () => {
    const brief = buildProjectResearchBrief({
      idea: tradingIdea,
      reviewedPapers: fullEvidenceForIdea(tradingIdea),
      generatedAt: "2026-06-03T15:00:00.000Z"
    });
    const prd = generateProjectPrd({ brief });

    expect(() =>
      ProjectPrdSchema.parse({
        ...prd,
        requirements: [
          {
            ...prd.requirements[0],
            sourcePaperIds: []
          }
        ],
        traceability: {
          ...prd.traceability,
          requirementCount: 1,
          requirementsWithPaperSources: 0
        }
      })
    ).toThrow(/needs sourcePaperIds/);
  });
});

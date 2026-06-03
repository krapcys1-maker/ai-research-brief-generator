import { describe, expect, it } from "vitest";
import {
  generateProjectArchitecture,
  projectArchitectureToMarkdown,
  ProjectArchitectureSchema
} from "@/lib/project-architecture";
import {
  generateProjectPrd
} from "@/lib/project-prd";
import {
  buildProjectResearchBrief,
  buildProjectResearchPlan
} from "@/lib/project-research";
import type {
  ProjectIdeaInput,
  ReviewedPaper
} from "@/lib/project-research";

function paperForBucket(bucketId: string, index: number): ReviewedPaper {
  return {
    paperId: `arch_${bucketId}_${index}`,
    title: `Architecture evidence for ${bucketId} ${index}`,
    year: 2025,
    url: `https://example.com/arch/${bucketId}/${index}`,
    doi: `10.1000/arch.${bucketId}.${index}`,
    bucketIds: [bucketId],
    fullTextStatus: "parsed",
    usefulForProject: true,
    evidenceStrength: "full_text_partial",
    keyMethods: [`method for ${bucketId}`],
    limitations: [`limitation for ${bucketId}`],
    implementationImplications: [`support ${bucketId} in architecture`],
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

describe("generateProjectArchitecture", () => {
  it("generates ready architecture from ready PRD and research brief", () => {
    const brief = buildProjectResearchBrief({
      idea: tradingIdea,
      reviewedPapers: fullEvidenceForIdea(tradingIdea),
      generatedAt: "2026-06-03T16:00:00.000Z"
    });
    const prd = generateProjectPrd({ brief });

    const architecture = generateProjectArchitecture({
      prd,
      brief,
      generatedAt: "2026-06-03T16:05:00.000Z"
    });

    expect(ProjectArchitectureSchema.parse(architecture)).toEqual(architecture);
    expect(architecture.status).toBe("ready");
    expect(architecture.components.length).toBeGreaterThan(0);
    expect(architecture.decisions.length).toBeGreaterThan(0);
    expect(architecture.blockers).toEqual([]);
    expect(architecture.traceability.componentCount).toBe(
      architecture.components.length
    );
    expect(architecture.traceability.componentsWithRequirements).toBe(
      architecture.components.length
    );
    expect(architecture.traceability.decisionsWithPaperSources).toBe(
      architecture.decisions.length
    );
  });

  it("blocks architecture when PRD is blocked", () => {
    const { researchPlan } = buildProjectResearchPlan(tradingIdea);
    const brief = buildProjectResearchBrief({
      idea: tradingIdea,
      reviewedPapers: [
        paperForBucket(researchPlan.evidenceBuckets[0].id, 1),
        paperForBucket(researchPlan.evidenceBuckets[0].id, 2)
      ],
      generatedAt: "2026-06-03T16:00:00.000Z"
    });
    const prd = generateProjectPrd({ brief });

    const architecture = generateProjectArchitecture({ prd, brief });

    expect(prd.status).toBe("blocked");
    expect(architecture.status).toBe("blocked");
    expect(architecture.components).toEqual([]);
    expect(architecture.blockers.length).toBeGreaterThan(0);
    expect(architecture.audit.score).toBeLessThanOrEqual(55);
  });

  it("exports architecture markdown with components, decisions, and traceability", () => {
    const brief = buildProjectResearchBrief({
      idea: tradingIdea,
      reviewedPapers: fullEvidenceForIdea(tradingIdea),
      generatedAt: "2026-06-03T16:00:00.000Z"
    });
    const prd = generateProjectPrd({ brief });
    const architecture = generateProjectArchitecture({ prd, brief });

    const markdown = projectArchitectureToMarkdown(architecture);

    expect(markdown).toContain("# AI Trading Bot Architecture");
    expect(markdown).toContain("## Components");
    expect(markdown).toContain("## Decisions");
    expect(markdown).toContain("## Traceability");
    expect(markdown).toContain("## Audit");
  });

  it("rejects traceability count drift", () => {
    const brief = buildProjectResearchBrief({
      idea: tradingIdea,
      reviewedPapers: fullEvidenceForIdea(tradingIdea),
      generatedAt: "2026-06-03T16:00:00.000Z"
    });
    const prd = generateProjectPrd({ brief });
    const architecture = generateProjectArchitecture({ prd, brief });

    expect(() =>
      ProjectArchitectureSchema.parse({
        ...architecture,
        traceability: {
          ...architecture.traceability,
          componentCount: architecture.traceability.componentCount + 1
        }
      })
    ).toThrow(/Traceability counts/);
  });
});

import { describe, expect, it } from "vitest";
import { proposeHandoffFlagResolutions } from "@/lib/project-research";
import type {
  ProjectIdeaHandoffContext,
  ReviewedPaper
} from "@/lib/project-research";

const handoffContext: ProjectIdeaHandoffContext = {
  ideaId: "idea_repo_mri",
  title: "Repo MRI",
  readiness: "needs_review",
  score: 93,
  sourceEvidenceQuality: 0.48,
  reviewFlags: ["Manual review: single-source idea has weak issue-level evidence."],
  strengths: ["ProjectIdeaInput schema is valid."],
  weaknesses: ["Source evidence quality is weak; verify source fit before research."],
  requiredFixes: []
};

function paper(id: string, strength: ReviewedPaper["evidenceStrength"]): ReviewedPaper {
  return {
    paperId: id,
    title: `Evidence ${id}`,
    year: 2025,
    url: `https://example.com/${id}`,
    doi: null,
    bucketIds: ["architecture_patterns"],
    fullTextStatus: strength.startsWith("full_text") ? "parsed" : "not_checked",
    usefulForProject: true,
    evidenceStrength: strength,
    keyMethods: ["method"],
    limitations: ["limitation"],
    implementationImplications: ["implementation implication"],
    riskImplications: ["risk implication"]
  };
}

describe("handoff flag resolution proposal", () => {
  it("proposes replacing weak source evidence when research coverage and parsed full text are strong", () => {
    const resolutions = proposeHandoffFlagResolutions({
      handoffContext,
      requiredCoveredCount: 4,
      requiredBucketCount: 4,
      requiredBucketsWithoutParsedFullText: [],
      parsedFullTextCount: 3,
      minParsedPapers: 3,
      reviewedPapers: [
        paper("strong_1", "full_text_strong"),
        paper("partial_1", "full_text_partial")
      ]
    });

    expect(resolutions).toHaveLength(1);
    expect(resolutions[0]?.status).toBe("replaced_by_stronger_evidence");
    expect(resolutions[0]?.evidenceIds).toContain("strong_1");
  });

  it("keeps flags unresolved when required research evidence is incomplete", () => {
    const resolutions = proposeHandoffFlagResolutions({
      handoffContext,
      requiredCoveredCount: 2,
      requiredBucketCount: 4,
      requiredBucketsWithoutParsedFullText: ["risk_governance"],
      parsedFullTextCount: 1,
      minParsedPapers: 3,
      reviewedPapers: [paper("abstract_1", "abstract_supported")]
    });

    expect(resolutions).toHaveLength(1);
    expect(resolutions[0]?.status).toBe("unresolved");
    expect(resolutions[0]?.rationale).toContain("required coverage incomplete");
    expect(resolutions[0]?.rationale).toContain("parsed full-text below target");
  });

  it("does not create proposal rows when there are no review flags", () => {
    const resolutions = proposeHandoffFlagResolutions({
      handoffContext: { ...handoffContext, reviewFlags: [] },
      requiredCoveredCount: 4,
      requiredBucketCount: 4,
      requiredBucketsWithoutParsedFullText: [],
      parsedFullTextCount: 3,
      minParsedPapers: 3,
      reviewedPapers: [paper("strong_1", "full_text_strong")]
    });

    expect(resolutions).toEqual([]);
  });
});

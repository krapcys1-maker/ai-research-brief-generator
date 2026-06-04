import { describe, expect, it } from "vitest";
import { buildAgentReflection } from "@/lib/project-research";
import type { SearchFlowAudit } from "@/lib/project-research";

function searchFlow(overrides: Partial<SearchFlowAudit> = {}): SearchFlowAudit {
  return {
    candidatePaperCount: 4,
    candidateWithFullTextCandidateCount: 3,
    dedupedPaperCount: 12,
    emptyQueryCount: 0,
    failedFullTextCount: 0,
    failedQueryCount: 0,
    parsedFullTextCount: 3,
    queryVariantCount: 6,
    rawPaperCount: 24,
    requiredBucketCandidateCoverage: 1,
    sourceResultCounts: {
      arxiv: 2,
      openalex: 10,
      semantic_scholar: 2
    },
    successfulQueryCount: 4,
    attemptedFullTextCount: 3,
    topCandidateIds: ["paper_1"],
    unavailableFullTextCount: 0,
    verdict: "pass",
    warnings: [],
    ...overrides
  };
}

describe("buildAgentReflection", () => {
  it("marks a fully healthy full-pass iteration as ready", () => {
    const reflection = buildAgentReflection({
      architectureJudgeScore: 94,
      architectureJudgeVerdict: "pass",
      handoffUnresolvedProposalCount: 0,
      ideaTitle: "Agent Sandbox Health Monitor",
      iteration: 1,
      minParsedPapers: 3,
      missingRequiredBuckets: [],
      parsedFullTextCount: 3,
      requiredBucketCount: 4,
      requiredBucketsWithoutParsedFullText: [],
      requiredCoveredCount: 4,
      searchFlowAudit: searchFlow()
    });

    expect(reflection.verdict).toBe("ready");
    expect(reflection.findings).toContain(
      "All full-pass gates look ready from the agent reflection viewpoint."
    );
  });

  it("forces agent review when research depends on one contributing source", () => {
    const reflection = buildAgentReflection({
      architectureJudgeScore: 94,
      architectureJudgeVerdict: "pass",
      handoffUnresolvedProposalCount: 0,
      ideaTitle: "Agent Sandbox Health Monitor",
      iteration: 1,
      minParsedPapers: 3,
      missingRequiredBuckets: [],
      parsedFullTextCount: 3,
      requiredBucketCount: 4,
      requiredBucketsWithoutParsedFullText: [],
      requiredCoveredCount: 4,
      searchFlowAudit: searchFlow({
        sourceResultCounts: {
          arxiv: 0,
          openalex: 24,
          semantic_scholar: 0
        },
        verdict: "needs_review",
        warnings: ["Search relies on a single contributing source."]
      })
    });

    expect(reflection.verdict).toBe("needs_human_or_external_input");
    expect(reflection.interventions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stage: "source_search",
          appliedInPipeline: true
        }),
        expect.objectContaining({
          stage: "final_gate",
          appliedInPipeline: true
        })
      ])
    );
  });
});

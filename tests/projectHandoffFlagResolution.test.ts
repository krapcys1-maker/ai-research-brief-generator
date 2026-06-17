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
      idea: {
        title: "LLM Context Budget QA Monitor",
        description:
          "Monitor context compression, token budget tradeoffs, agent task success, and RAG evidence loss.",
        constraints: [],
        preferredDomains: ["llm developer tools"],
        outputLanguage: "pl"
      },
      handoffContext,
      requiredBucketIds: ["context_compression_fidelity"],
      requiredCoveredCount: 4,
      requiredBucketCount: 4,
      requiredBucketsWithoutParsedFullText: [],
      parsedFullTextCount: 3,
      minParsedPapers: 3,
      reviewedPapers: [
        {
          ...paper("strong_1", "full_text_strong"),
          title: "Context compression fidelity for large language model agents",
          fullTextStatus: "parsed",
          bucketIds: ["context_compression_fidelity"]
        },
        {
          ...paper("partial_1", "full_text_partial"),
          title: "Token budget tradeoffs in long context language models",
          fullTextStatus: "parsed",
          bucketIds: ["context_compression_fidelity"]
        }
      ],
      paperTextsById: {
        strong_1:
          "large language model context compression fidelity retention agent workflow",
        partial_1: "token budget context compression large language model"
      }
    });

    expect(resolutions).toHaveLength(1);
    expect(resolutions[0]?.status).toBe("replaced_by_stronger_evidence");
    expect(resolutions[0]?.evidenceIds).toContain("strong_1");
  });

  it("keeps flags unresolved when required research evidence is incomplete", () => {
    const resolutions = proposeHandoffFlagResolutions({
      idea: {
        title: "LLM Context Budget QA Monitor",
        description:
          "Monitor context compression, token budget tradeoffs, agent task success, and RAG evidence loss.",
        constraints: [],
        preferredDomains: ["llm developer tools"],
        outputLanguage: "pl"
      },
      handoffContext,
      requiredBucketIds: ["risk_governance"],
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
      idea: {
        title: "LLM Context Budget QA Monitor",
        description: "Monitor context compression evidence loss.",
        constraints: [],
        preferredDomains: ["llm developer tools"],
        outputLanguage: "pl"
      },
      handoffContext: { ...handoffContext, reviewFlags: [] },
      requiredBucketIds: ["context_compression_fidelity"],
      requiredCoveredCount: 4,
      requiredBucketCount: 4,
      requiredBucketsWithoutParsedFullText: [],
      parsedFullTextCount: 3,
      minParsedPapers: 3,
      reviewedPapers: [paper("strong_1", "full_text_strong")]
    });

    expect(resolutions).toEqual([]);
  });

  it("does not resolve flags when parsed full-text is topically weak", () => {
    const resolutions = proposeHandoffFlagResolutions({
      idea: {
        title: "LLM Context Budget QA Monitor",
        description: "Monitor context compression and RAG evidence loss.",
        constraints: [],
        preferredDomains: ["llm developer tools"],
        outputLanguage: "pl"
      },
      handoffContext,
      requiredBucketIds: ["context_compression_fidelity"],
      requiredCoveredCount: 1,
      requiredBucketCount: 1,
      requiredBucketsWithoutParsedFullText: [],
      parsedFullTextCount: 1,
      minParsedPapers: 1,
      reviewedPapers: [
        {
          ...paper("weak_match", "full_text_partial"),
          title: "X-ray computed tomography",
          fullTextStatus: "parsed",
          bucketIds: ["context_compression_fidelity"]
        }
      ],
      paperTextsById: {
        weak_match: "x-ray computed tomography imaging reconstruction"
      }
    });

    expect(resolutions[0]?.status).toBe("unresolved");
    expect(resolutions[0]?.rationale).toContain(
      "missing relevant parsed full-text evidence"
    );
  });

  it("does not resolve agent task success with a generic LLM technical report", () => {
    const resolutions = proposeHandoffFlagResolutions({
      idea: {
        title: "LLM Context Budget QA Monitor",
        description:
          "Monitor context compression, agent task success, tool use and RAG evidence loss.",
        constraints: [],
        preferredDomains: ["agent reliability", "llm context engineering"],
        outputLanguage: "pl"
      },
      handoffContext,
      requiredBucketIds: ["agent_task_success"],
      requiredCoveredCount: 1,
      requiredBucketCount: 1,
      requiredBucketsWithoutParsedFullText: [],
      parsedFullTextCount: 1,
      minParsedPapers: 1,
      reviewedPapers: [
        {
          ...paper("qwen_report", "full_text_partial"),
          title: "Qwen Technical Report",
          fullTextStatus: "parsed",
          bucketIds: ["agent_task_success"]
        }
      ],
      paperTextsById: {
        qwen_report:
          "large language model pretraining benchmark parameter scaling model evaluation"
      }
    });

    expect(resolutions[0]?.status).toBe("unresolved");
  });
});

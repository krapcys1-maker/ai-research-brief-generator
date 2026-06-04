import { describe, expect, it } from "vitest";
import {
  buildProjectResearchPlan,
  judgePaperRelevance
} from "@/lib/project-research";
import type { ReviewedPaper } from "@/lib/project-research";

const idea = {
  title: "LLM Context Budget QA Monitor",
  description:
    "Monitor context compression, token budget tradeoffs, fact retention, agent task success and RAG evidence loss.",
  constraints: ["MVP must be evidence-backed"],
  preferredDomains: ["LLM context engineering", "RAG evaluation", "agent reliability"],
  outputLanguage: "pl"
};

function paper(input: {
  id: string;
  title: string;
  bucketId: string;
  text: string;
}): ReviewedPaper {
  return {
    paperId: input.id,
    title: input.title,
    year: 2025,
    url: `https://example.com/${input.id}`,
    doi: null,
    bucketIds: [input.bucketId],
    fullTextStatus: "parsed",
    usefulForProject: true,
    evidenceStrength: "full_text_partial",
    keyMethods: [input.text],
    limitations: [],
    implementationImplications: [],
    riskImplications: []
  };
}

describe("paper relevance judge", () => {
  it("keeps a paper that directly matches a context compression bucket", () => {
    const { researchPlan } = buildProjectResearchPlan(idea);
    const result = judgePaperRelevance({
      idea,
      researchPlan,
      reviewedPapers: [
        paper({
          id: "prompt_compression",
          title: "Understanding and Improving Information Preservation in Prompt Compression for LLMs",
          bucketId: "context_compression_fidelity",
          text: "context compression information loss fact retention faithfulness prompt compression"
        })
      ]
    });

    expect(result.judgments[0]?.decision).toBe("keep");
    expect(result.filteredReviewedPapers[0]?.usefulForProject).toBe(true);
  });

  it("marks a generic LLM report as not useful for agent task success", () => {
    const { researchPlan } = buildProjectResearchPlan(idea);
    const result = judgePaperRelevance({
      idea,
      researchPlan,
      reviewedPapers: [
        paper({
          id: "qwen_report",
          title: "Qwen Technical Report",
          bucketId: "agent_task_success",
          text: "large language model pretraining scaling parameters benchmark evaluation"
        })
      ]
    });

    expect(result.judgments[0]?.decision).toBe("reject");
    expect(result.filteredReviewedPapers[0]?.usefulForProject).toBe(false);
  });

  it("does not confirm generated bucket keywords when source text is unrelated", () => {
    const selfHostedIdea = {
      title: "Self-Hosted AI Workspace Policy Auditor",
      description:
        "Audit a private AI workspace for self-hosted deployment readiness, governance, secrets and local data boundaries.",
      constraints: ["MVP must avoid copying an existing repository"],
      preferredDomains: ["self hosted AI", "workspace governance", "security audit"],
      outputLanguage: "pl"
    };
    const { researchPlan } = buildProjectResearchPlan(selfHostedIdea);
    const result = judgePaperRelevance({
      idea: selfHostedIdea,
      researchPlan,
      reviewedPapers: [
        paper({
          id: "bim_blockchain",
          title:
            "Blockchain and Building Information Modeling: Review and Applications in Post-Disaster Recovery",
          bucketId: "self_hosted_security_controls",
          text: "self-hosted AI security controls secrets management local data"
        })
      ],
      paperTextsById: {
        bim_blockchain:
          "Building information modeling blockchain construction post disaster recovery civil engineering"
      }
    });

    expect(result.judgments[0]?.decision).toBe("reject");
    expect(result.filteredReviewedPapers[0]?.usefulForProject).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  generateProjectArchitecture,
  judgeProjectArchitecture,
  ProjectArchitectureJudgeSchema,
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

const documentConversionIdea: ProjectIdeaInput = {
  title: "Document Conversion QA Harness",
  description:
    "QA harness for Markdown, PDF and Office document conversion before RAG ingestion.",
  constraints: [
    "MVP: ingest converted Markdown outputs and source document metadata",
    "MVP: detect table, citation, encoding, and structure regressions",
    "MVP: produce conversion quality reports with reproducible fixture cases"
  ],
  preferredDomains: ["document AI", "RAG ingestion", "conversion quality"],
  outputLanguage: "pl"
};

const shortVideoIdea: ProjectIdeaInput = {
  title: "AI Short-Video Content QA Console",
  description:
    "System for content operations teams that audits AI-generated short-video scripts, prompts, voiceover text, render metadata, brand safety, unsupported claims, repetition, source grounding, and publishing risk before export or upload.",
  constraints: [
    "MVP audits quality and publishing risk instead of generating video",
    "requires evidence gates before publishing recommendations",
    "human approval before public release"
  ],
  preferredDomains: ["AI media", "content operations", "publishing QA"],
  outputLanguage: "pl"
};

const agentApprovalIdea: ProjectIdeaInput = {
  title: "Agent Action Approval UX Console",
  description:
    "System for AI agent product teams that reviews tool calls, command approval events, blocked automation, recovery paths, risk explanations, command confirmation failures, and tool-use governance before agent releases.",
  constraints: [
    "MVP reviews approval flow quality instead of building another agent",
    "human approval remains mandatory for risky commands",
    "classify approval failures by risk, UI state and recovery path"
  ],
  preferredDomains: ["AI agent safety", "approval UX", "tool-use governance"],
  outputLanguage: "pl"
};

const providerCompatibilityIdea: ProjectIdeaInput = {
  title: "AI CLI Provider Compatibility Monitor",
  description:
    "Teams switching between AI coding CLIs and third-party providers hit confusing auth, capability, proxy behavior, and model-routing failures that are hard to diagnose.",
  constraints: [
    "do not clone the source repository",
    "MVP: ingest provider configs, CLI health checks, and failed conversation logs",
    "MVP: classify failures by auth, capability mismatch, proxy behavior, and model routing",
    "MVP: produce provider compatibility reports and suggested fallback routes"
  ],
  preferredDomains: ["AI developer tools", "provider routing", "CLI reliability"],
  outputLanguage: "pl"
};

const agentSandboxIdea: ProjectIdeaInput = {
  title: "Agent Sandbox Health Monitor",
  description:
    "Agent Sandbox Health Monitor helps AI agent platform teams solve a narrower adjacent workflow inspired by NemoClaw. Problem: Teams running AI agents inside sandboxes need to catch startup failures, network misconfiguration, capability drops, and unsafe policy drift before live runs.",
  constraints: [
    "MVP: ingest sandbox startup logs, policy config, network checks, and failed run traces",
    "MVP: detect startup failures, blocked capabilities, unsafe tool exposure, and environment drift",
    "MVP: produce sandbox health reports with reproducible checks and release blockers"
  ],
  preferredDomains: ["AI agents", "sandbox reliability", "agent safety"],
  outputLanguage: "pl"
};

const repoMriIdea: ProjectIdeaInput = {
  title: "Repo MRI",
  description:
    "Developer tool that turns a repository into an explainable code map with files, symbols, imports, calls, tests and a Bug Path mode from issue or stacktrace to likely files, symbols, tests and hypotheses.",
  constraints: [
    "do not build a generic chat with repo",
    "deterministic index and code knowledge graph before LLM summaries",
    "MVP must show evidence, line ranges, confidence and unknowns"
  ],
  preferredDomains: ["software engineering", "static analysis", "code intelligence"],
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

  it("generates layered architecture for a discovered shortlist idea", () => {
    const brief = buildProjectResearchBrief({
      idea: documentConversionIdea,
      reviewedPapers: fullEvidenceForIdea(documentConversionIdea),
      generatedAt: "2026-06-03T16:00:00.000Z"
    });
    const prd = generateProjectPrd({ brief });

    const architecture = generateProjectArchitecture({
      prd,
      brief,
      generatedAt: "2026-06-03T16:05:00.000Z"
    });
    const componentTypes = new Set(
      architecture.components.map((component) => component.componentType)
    );
    const componentNames = architecture.components
      .map((component) => component.name)
      .join(" ");

    expect(architecture.status).toBe("ready");
    expect(architecture.audit.score).toBeGreaterThanOrEqual(90);
    expect(componentTypes.size).toBeGreaterThanOrEqual(5);
    expect(componentNames).toContain("Document Fixture Intake Adapter");
    expect(componentNames).toContain("Structure And RAG Quality AI Evaluator");
    expect(architecture.testStrategy.join(" ")).toContain("golden fixtures");
    expect(architecture.audit.verdict).toContain("document_conversion_qa");
    expect(judgeProjectArchitecture({ architecture, prd, brief }).verdict).toBe(
      "pass"
    );
    expect(architecture.traceability.decisionsWithPaperSources).toBe(
      architecture.decisions.length
    );
  });

  it("keeps document conversion blueprint when anti-clone constraints mention source repositories", () => {
    const noisyDocumentConversionIdea: ProjectIdeaInput = {
      ...documentConversionIdea,
      constraints: [
        "do not clone the source repository",
        "do not automate irreversible actions in MVP",
        ...documentConversionIdea.constraints
      ]
    };
    const brief = buildProjectResearchBrief({
      idea: noisyDocumentConversionIdea,
      reviewedPapers: fullEvidenceForIdea(noisyDocumentConversionIdea),
      generatedAt: "2026-06-03T16:00:00.000Z"
    });
    const prd = generateProjectPrd({ brief });

    const architecture = generateProjectArchitecture({
      prd,
      brief,
      generatedAt: "2026-06-03T16:05:00.000Z"
    });
    const componentNames = architecture.components
      .map((component) => component.name)
      .join(" ");

    expect(componentNames).toContain("Document Fixture Intake Adapter");
    expect(componentNames).toContain("Structure And RAG Quality AI Evaluator");
    expect(componentNames).not.toContain("Repository And Issue Intake Adapter");
    expect(architecture.audit.verdict).toContain("document_conversion_qa");
  });

  it("fails schema-valid but generic architecture mutations", () => {
    const brief = buildProjectResearchBrief({
      idea: documentConversionIdea,
      reviewedPapers: fullEvidenceForIdea(documentConversionIdea),
      generatedAt: "2026-06-03T16:00:00.000Z"
    });
    const prd = generateProjectPrd({ brief });
    const architecture = generateProjectArchitecture({ prd, brief });
    const genericArchitecture = ProjectArchitectureSchema.parse({
      ...architecture,
      summary:
        "Generic evidence-backed AI product with broad project readiness components.",
      components: architecture.components.map((component, index) => ({
        ...component,
        name:
          index < 4
            ? ["Project Evidence Store", "Evidence Quality AI Evaluator", "Project Readiness Report API", "Generic AI Assistant"][index]
            : component.name,
        responsibility:
          index < 4
            ? "Generic project evidence processing without domain workflow specificity."
            : component.responsibility
      }))
    });

    const judge = judgeProjectArchitecture({
      architecture: genericArchitecture,
      prd,
      brief
    });

    expect(ProjectArchitectureJudgeSchema.parse(judge)).toEqual(judge);
    expect(judge.verdict).toBe("fail");
    expect(judge.genericComponentCount).toBeGreaterThan(0);
    expect(judge.requiredFixes.join(" ")).toContain("generic");
  });

  it("generates non-generic architecture for live short-video QA ideas", () => {
    const brief = buildProjectResearchBrief({
      idea: shortVideoIdea,
      reviewedPapers: fullEvidenceForIdea(shortVideoIdea),
      generatedAt: "2026-06-03T16:00:00.000Z"
    });
    const prd = generateProjectPrd({ brief });

    const architecture = generateProjectArchitecture({
      prd,
      brief,
      generatedAt: "2026-06-03T16:05:00.000Z"
    });
    const judge = judgeProjectArchitecture({ architecture, prd, brief });
    const componentNames = architecture.components
      .map((component) => component.name)
      .join(" ");

    expect(componentNames).toContain(
      "Script Prompt Voiceover And Render Metadata Intake Adapter"
    );
    expect(componentNames).toContain(
      "Script Repetition Grounding And Publishing Risk AI Evaluator"
    );
    expect(architecture.audit.verdict).toContain("ai_media_publishing_qa");
    expect(judge.verdict).toBe("pass");
    expect(judge.score).toBeGreaterThanOrEqual(90);
    expect(judge.genericComponentCount).toBe(0);
  });

  it("generates non-generic architecture for live agent approval ideas", () => {
    const brief = buildProjectResearchBrief({
      idea: agentApprovalIdea,
      reviewedPapers: fullEvidenceForIdea(agentApprovalIdea),
      generatedAt: "2026-06-03T16:00:00.000Z"
    });
    const prd = generateProjectPrd({ brief });

    const architecture = generateProjectArchitecture({
      prd,
      brief,
      generatedAt: "2026-06-03T16:05:00.000Z"
    });
    const judge = judgeProjectArchitecture({ architecture, prd, brief });
    const componentNames = architecture.components
      .map((component) => component.name)
      .join(" ");

    expect(componentNames).toContain(
      "Tool Call Command And Approval Event Intake Adapter"
    );
    expect(componentNames).toContain("Command Risk Explanation AI Evaluator");
    expect(architecture.audit.verdict).toContain(
      "agent_action_approval_governance"
    );
    expect(judge.verdict).toBe("pass");
    expect(judge.score).toBeGreaterThanOrEqual(90);
    expect(judge.genericComponentCount).toBe(0);
  });

  it("generates Repo MRI code-intelligence architecture for the GPT baseline idea", () => {
    const brief = buildProjectResearchBrief({
      idea: repoMriIdea,
      reviewedPapers: fullEvidenceForIdea(repoMriIdea),
      generatedAt: "2026-06-03T16:00:00.000Z"
    });
    const prd = generateProjectPrd({ brief });

    const architecture = generateProjectArchitecture({
      prd,
      brief,
      generatedAt: "2026-06-03T16:05:00.000Z"
    });
    const judge = judgeProjectArchitecture({ architecture, prd, brief });
    const componentNames = architecture.components
      .map((component) => component.name)
      .join(" ");
    const decisions = architecture.decisions
      .map((decision) => decision.decision)
      .join(" ");

    expect(componentNames).toContain("Safe Repository Scanner");
    expect(componentNames).toContain("Code Knowledge Graph Store");
    expect(componentNames).toContain("Bug Path Engine");
    expect(decisions).toContain("Code Knowledge Graph");
    expect(architecture.audit.verdict).toContain("repo_mri_code_intelligence");
    expect(architecture.summary).toContain("Bug Path");
    expect(judge.verdict).toBe("pass");
    expect(judge.score).toBeGreaterThanOrEqual(90);
    expect(judge.genericComponentCount).toBe(0);
  });

  it("keeps provider compatibility blueprint when anti-clone constraints mention source repositories", () => {
    const brief = buildProjectResearchBrief({
      idea: providerCompatibilityIdea,
      reviewedPapers: fullEvidenceForIdea(providerCompatibilityIdea),
      generatedAt: "2026-06-03T16:00:00.000Z"
    });
    const prd = generateProjectPrd({ brief });

    const architecture = generateProjectArchitecture({
      prd,
      brief,
      generatedAt: "2026-06-03T16:05:00.000Z"
    });
    const judge = judgeProjectArchitecture({ architecture, prd, brief });
    const componentNames = architecture.components
      .map((component) => component.name)
      .join(" ");

    expect(componentNames).toContain("Provider Config And Log Intake Adapter");
    expect(componentNames).toContain("Failure Classification AI Evaluator");
    expect(componentNames).not.toContain("Repository And Issue Intake Adapter");
    expect(architecture.audit.verdict).toContain("ai_cli_provider_reliability");
    expect(judge.verdict).toBe("pass");
    expect(judge.genericComponentCount).toBe(0);
  });

  it("generates non-generic architecture for agent sandbox health ideas", () => {
    const brief = buildProjectResearchBrief({
      idea: agentSandboxIdea,
      reviewedPapers: fullEvidenceForIdea(agentSandboxIdea),
      generatedAt: "2026-06-03T16:00:00.000Z"
    });
    const prd = generateProjectPrd({ brief });

    const architecture = generateProjectArchitecture({
      prd,
      brief,
      generatedAt: "2026-06-03T16:05:00.000Z"
    });
    const judge = judgeProjectArchitecture({ architecture, prd, brief });
    const componentNames = architecture.components
      .map((component) => component.name)
      .join(" ");

    expect(componentNames).toContain(
      "Sandbox Log Policy Network And Tool Capability Intake Adapter"
    );
    expect(componentNames).toContain(
      "Runtime Trust Failure And Preflight Gate AI Evaluator"
    );
    expect(architecture.audit.verdict).toContain(
      "agent_sandbox_runtime_health"
    );
    expect(judge.verdict).toBe("pass");
    expect(judge.score).toBeGreaterThanOrEqual(90);
    expect(judge.genericComponentCount).toBe(0);
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

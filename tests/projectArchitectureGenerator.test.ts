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

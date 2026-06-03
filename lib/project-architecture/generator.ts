import { ProjectArchitectureSchema } from "@/lib/project-architecture/schemas";
import type {
  ProjectArchitecture,
  ProjectArchitectureComponent,
  ProjectArchitectureDecision,
  ProjectArchitectureRisk
} from "@/lib/project-architecture/types";
import type { ProjectPrd, ProjectPrdRequirement } from "@/lib/project-prd";
import type { ProjectResearchBrief } from "@/lib/project-research";

type GenerateProjectArchitectureInput = {
  prd: ProjectPrd;
  brief: ProjectResearchBrief;
  generatedAt?: string;
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function componentTypeForRequirement(requirement: ProjectPrdRequirement) {
  if (requirement.requirementType === "validation") {
    return "ops" as const;
  }

  if (requirement.requirementType === "risk_control") {
    return "ops" as const;
  }

  const text = `${requirement.title} ${requirement.description}`.toLowerCase();
  if (text.includes("ai") || text.includes("model") || text.includes("llm")) {
    return "ai" as const;
  }

  if (text.includes("data") || text.includes("dataset") || text.includes("backtest")) {
    return "data" as const;
  }

  return "backend" as const;
}

function componentFromRequirement(
  requirement: ProjectPrdRequirement,
  index: number
): ProjectArchitectureComponent {
  return {
    id: `cmp_${index + 1}_${requirement.id}`,
    name: requirement.title.slice(0, 80),
    responsibility: requirement.description,
    componentType: componentTypeForRequirement(requirement),
    inputs: ["validated user/project input", "evidence-backed configuration"],
    outputs: ["auditable project decision signal"],
    sourceRequirementIds: [requirement.id],
    sourcePaperIds: requirement.sourcePaperIds
  };
}

function decisionFromRequirement(
  requirement: ProjectPrdRequirement,
  index: number
): ProjectArchitectureDecision {
  return {
    id: `adr_${index + 1}_${requirement.id}`,
    decision: `Implement ${requirement.title}`,
    rationale: requirement.description,
    tradeoffs: [
      "keeps architecture traceable to PRD",
      "may need refinement after implementation benchmark results"
    ],
    sourceRequirementIds: [requirement.id],
    sourcePaperIds: requirement.sourcePaperIds
  };
}

function risksFromPrd(prd: ProjectPrd): ProjectArchitectureRisk[] {
  return prd.risks.slice(0, 8).map((risk) => ({
    id: `arch_${risk.id}`,
    risk: risk.risk,
    mitigation: risk.mitigation,
    sourceRequirementIds: [],
    sourcePaperIds: risk.sourcePaperIds
  }));
}

function buildTraceability(
  components: ProjectArchitectureComponent[],
  decisions: ProjectArchitectureDecision[]
) {
  return {
    componentCount: components.length,
    componentsWithRequirements: components.filter(
      (component) => component.sourceRequirementIds.length > 0
    ).length,
    decisionCount: decisions.length,
    decisionsWithPaperSources: decisions.filter(
      (decision) => decision.sourcePaperIds.length > 0
    ).length,
    sourceRequirementIds: unique([
      ...components.flatMap((component) => component.sourceRequirementIds),
      ...decisions.flatMap((decision) => decision.sourceRequirementIds)
    ]),
    sourcePaperIds: unique([
      ...components.flatMap((component) => component.sourcePaperIds),
      ...decisions.flatMap((decision) => decision.sourcePaperIds)
    ])
  };
}

function blockedArchitecture(
  input: GenerateProjectArchitectureInput,
  blockers: string[]
): ProjectArchitecture {
  const architecture: ProjectArchitecture = {
    id: `arch_${input.prd.id.replace(/^prd_/, "")}`,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    sourcePrdId: input.prd.id,
    sourceBriefId: input.brief.id,
    status: "blocked",
    systemName: input.prd.productName,
    summary: "Architecture generation is blocked until PRD and research are ready.",
    components: [],
    decisions: [],
    risks: [],
    testStrategy: [],
    blockers,
    traceability: buildTraceability([], []),
    audit: {
      score: Math.min(55, input.prd.audit.score, input.brief.audit.score),
      verdict: "Architecture blocked before unsupported technical decisions.",
      strengths: ["blocked state prevents architecture without evidence"],
      weaknesses: blockers
    }
  };

  return ProjectArchitectureSchema.parse(architecture);
}

export function generateProjectArchitecture(
  input: GenerateProjectArchitectureInput
): ProjectArchitecture {
  const blockers = [
    ...(input.prd.status !== "ready" ? ["ProjectPRD is not ready."] : []),
    ...(!input.brief.readyForArchitecture
      ? ["ProjectResearchBrief is not ready for architecture."]
      : []),
    ...input.brief.audit.mustFixBeforeArchitecture,
    ...input.prd.blockers
  ];

  if (blockers.length > 0) {
    return blockedArchitecture(input, unique(blockers));
  }

  const requirements = input.prd.requirements.slice(0, 10);
  const components = requirements.map(componentFromRequirement);
  const decisions = requirements.slice(0, 8).map(decisionFromRequirement);
  const traceability = buildTraceability(components, decisions);
  const architecture: ProjectArchitecture = {
    id: `arch_${input.prd.id.replace(/^prd_/, "")}`,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    sourcePrdId: input.prd.id,
    sourceBriefId: input.brief.id,
    status: "ready",
    systemName: input.prd.productName,
    summary:
      "Architecture generated from evidence-backed PRD requirements and ProjectResearchBrief decisions.",
    components,
    decisions,
    risks: risksFromPrd(input.prd),
    testStrategy: [
      "Run project-research benchmarks before architecture generation.",
      "Add contract tests for every generated component boundary.",
      "Keep PRD requirement IDs in implementation tasks for traceability.",
      "Block deployment if evidence-backed risk controls are not implemented."
    ],
    blockers: [],
    traceability,
    audit: {
      score: Math.min(
        100,
        Math.round(
          input.prd.audit.score * 0.55 +
            input.brief.audit.score * 0.25 +
            traceability.componentsWithRequirements * 2
        )
      ),
      verdict:
        "Architecture is traceable to PRD requirements and research evidence.",
      strengths: [
        "components map back to PRD requirements",
        "architecture decisions keep paper source traceability"
      ],
      weaknesses:
        traceability.decisionsWithPaperSources === decisions.length
          ? []
          : ["some architecture decisions do not cite source papers"]
    }
  };

  return ProjectArchitectureSchema.parse(architecture);
}

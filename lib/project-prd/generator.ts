import { ProjectPrdSchema } from "@/lib/project-prd/schemas";
import type {
  ProjectPrd,
  ProjectPrdRequirement,
  ProjectPrdRisk
} from "@/lib/project-prd/types";
import type {
  ProjectResearchBrief,
  ProjectResearchInsight
} from "@/lib/project-research";

type GenerateProjectPrdInput = {
  brief: ProjectResearchBrief;
  generatedAt?: string;
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function requirementFromInsight(
  insight: ProjectResearchInsight,
  index: number
): ProjectPrdRequirement {
  return {
    id: `req_${index + 1}_${insight.id}`,
    title: insight.claim.slice(0, 120),
    description: insight.explanation,
    priority: index < 3 ? "must" : "should",
    requirementType:
      insight.insightType === "risk"
        ? "risk_control"
        : insight.insightType === "validation"
          ? "validation"
          : "functional",
    acceptanceCriteria: [
      `Requirement is implemented with source traceability to ${insight.sourcePaperIds.join(", ")}.`,
      "Output can be reviewed by a human before it affects project decisions."
    ],
    sourceInsightIds: [insight.id],
    sourcePaperIds: insight.sourcePaperIds,
    evidenceStrength: insight.evidenceStrength
  };
}

function requirementsFromDirection(
  brief: ProjectResearchBrief,
  startIndex: number
): ProjectPrdRequirement[] {
  const direction = brief.recommendedTechnicalDirection;

  return direction.approach.slice(0, 4).map((step, index) => ({
    id: `req_direction_${startIndex + index + 1}`,
    title: step.slice(0, 120),
    description: `Product must support this evidence-backed implementation direction: ${step}`,
    priority: index === 0 ? "must" : "should",
    requirementType: "functional" as const,
    acceptanceCriteria: [
      "Requirement is present in the MVP scope or explicitly deferred.",
      "Implementation decision references the same source papers as the research direction."
    ],
    sourceInsightIds: [],
    sourcePaperIds: direction.sourcePaperIds,
    evidenceStrength: direction.evidenceStrength
  }));
}

function risksFromBrief(brief: ProjectResearchBrief): ProjectPrdRisk[] {
  return brief.risks.slice(0, 8).map((risk) => ({
    id: `prd_${risk.id}`,
    risk: risk.risk,
    mitigation: risk.mitigation,
    severity: risk.severity,
    sourcePaperIds: risk.sourcePaperIds
  }));
}

function buildTraceability(requirements: ProjectPrdRequirement[]) {
  return {
    requirementCount: requirements.length,
    requirementsWithPaperSources: requirements.filter(
      (requirement) => requirement.sourcePaperIds.length > 0
    ).length,
    sourcePaperIds: unique(
      requirements.flatMap((requirement) => requirement.sourcePaperIds)
    ),
    sourceInsightIds: unique(
      requirements.flatMap((requirement) => requirement.sourceInsightIds)
    )
  };
}

function blockedPrd(
  input: GenerateProjectPrdInput,
  blockers: string[]
): ProjectPrd {
  const brief = input.brief;
  const prd: ProjectPrd = {
    id: `prd_${brief.normalizedIdea.ideaId.replace(/^idea_/, "")}`,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    sourceBriefId: brief.id,
    status: "blocked",
    productName: brief.normalizedIdea.title,
    problem: brief.normalizedIdea.problem,
    targetUsers: brief.normalizedIdea.targetUsers,
    goals: [],
    nonGoals: brief.normalizedIdea.nonGoals,
    evidenceSummary: brief.researchSummary,
    requirements: [],
    risks: [],
    openQuestions: [
      ...brief.evidenceCoverage.missingRequiredBuckets.map(
        (bucketId) => `What evidence is needed to cover ${bucketId}?`
      ),
      ...brief.gaps.map((gap) => gap.gap)
    ],
    blockers,
    traceability: buildTraceability([]),
    audit: {
      score: Math.min(55, brief.audit.score),
      verdict: "PRD blocked until ProjectResearchBrief is ready.",
      strengths: ["blocked state prevents unsupported product requirements"],
      weaknesses: blockers
    }
  };

  return ProjectPrdSchema.parse(prd);
}

export function generateProjectPrd(input: GenerateProjectPrdInput): ProjectPrd {
  const brief = input.brief;
  const blockers = [
    ...(!brief.readyForPrd ? ["ProjectResearchBrief is not ready for PRD."] : []),
    ...brief.evidenceCoverage.missingRequiredBuckets.map(
      (bucketId) => `Missing required evidence bucket: ${bucketId}`
    ),
    ...brief.audit.mustFixBeforePrd
  ];

  if (blockers.length > 0) {
    return blockedPrd(input, unique(blockers));
  }

  const insightRequirements = brief.projectInsights
    .filter(
      (insight) => insight.usableForPrd && insight.sourcePaperIds.length > 0
    )
    .slice(0, 8)
    .map(requirementFromInsight);
  const directionRequirements = requirementsFromDirection(
    brief,
    insightRequirements.length
  );
  const requirements = [...insightRequirements, ...directionRequirements];
  const traceability = buildTraceability(requirements);
  const prd: ProjectPrd = {
    id: `prd_${brief.normalizedIdea.ideaId.replace(/^idea_/, "")}`,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    sourceBriefId: brief.id,
    status: "ready",
    productName: brief.normalizedIdea.title,
    problem: brief.normalizedIdea.problem,
    targetUsers: brief.normalizedIdea.targetUsers,
    goals: brief.researchPlan.researchGoals.slice(0, 6),
    nonGoals: brief.normalizedIdea.nonGoals,
    evidenceSummary: brief.researchSummary,
    requirements,
    risks: risksFromBrief(brief),
    openQuestions: brief.gaps.map((gap) => gap.gap),
    blockers: [],
    traceability,
    audit: {
      score: Math.min(
        100,
        Math.round(brief.audit.score * 0.75 + traceability.requirementsWithPaperSources * 3)
      ),
      verdict:
        "PRD is evidence-backed and can be used as input for architecture planning.",
      strengths: [
        "requirements cite paper-backed research insights",
        "risks and open questions are carried from ProjectResearchBrief"
      ],
      weaknesses:
        traceability.requirementsWithPaperSources === requirements.length
          ? []
          : ["some requirements do not cite source papers"]
    }
  };

  return ProjectPrdSchema.parse(prd);
}

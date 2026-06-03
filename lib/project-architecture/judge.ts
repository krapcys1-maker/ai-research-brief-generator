import { ProjectArchitectureJudgeSchema } from "@/lib/project-architecture/schemas";
import type {
  ProjectArchitecture,
  ProjectArchitectureJudge
} from "@/lib/project-architecture/types";
import type { ProjectPrd } from "@/lib/project-prd";
import type { ProjectResearchBrief } from "@/lib/project-research";

type JudgeProjectArchitectureInput = {
  architecture: ProjectArchitecture;
  prd: ProjectPrd;
  brief: ProjectResearchBrief;
};

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function ratio(numerator: number, denominator: number) {
  if (denominator === 0) {
    return 1;
  }

  return Math.max(0, Math.min(1, numerator / denominator));
}

function textTerms(value: string) {
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "before",
    "after",
    "system",
    "project",
    "product",
    "quality",
    "monitor",
    "assistant",
    "using",
    "uzywajacy",
    "oraz",
    "przed"
  ]);

  return unique(
    value
      .toLowerCase()
      .replace(/[^a-z0-9ąćęłńóśźż]+/gi, " ")
      .split(/\s+/)
      .filter((term) => term.length >= 4 && !stopWords.has(term))
  );
}

function sourceRequirementIds(architecture: ProjectArchitecture) {
  return unique([
    ...architecture.components.flatMap((component) => component.sourceRequirementIds),
    ...architecture.decisions.flatMap((decision) => decision.sourceRequirementIds),
    ...architecture.risks.flatMap((risk) => risk.sourceRequirementIds)
  ]);
}

function sourcePaperIds(architecture: ProjectArchitecture) {
  return unique([
    ...architecture.components.flatMap((component) => component.sourcePaperIds),
    ...architecture.decisions.flatMap((decision) => decision.sourcePaperIds),
    ...architecture.risks.flatMap((risk) => risk.sourcePaperIds)
  ]);
}

function genericComponentCount(architecture: ProjectArchitecture) {
  const genericPhrases = [
    "project evidence",
    "decision evidence",
    "evidence quality",
    "project readiness",
    "generic",
    "ai evaluator",
    "report api"
  ];

  return architecture.components.filter((component) => {
    const text = `${component.name} ${component.responsibility}`.toLowerCase();
    const hasSpecificQualifier = [
      "document",
      "conversion",
      "context",
      "provider",
      "session",
      "workspace",
      "trading",
      "strategy",
      "technical debt",
      "refactor",
      "clinical",
      "medical",
      "data",
      "lesson",
      "misconception",
      "drawdown",
      "overfit",
      "backtest",
      "market",
      "debt",
      "repository",
      "refactor",
      "clinical",
      "citation",
      "claim support",
      "structure",
      "rag",
      "fidelity",
      "retention",
      "cli",
      "compatibility",
      "capability",
      "failure",
      "policy",
      "security",
      "readiness"
    ].some((term) => text.includes(term));

    return genericPhrases.some((phrase) => text.includes(phrase)) && !hasSpecificQualifier;
  }).length;
}

function specificTermCoverage(input: JudgeProjectArchitectureInput) {
  const expectedTerms = unique([
    ...textTerms(input.prd.productName),
    ...textTerms(input.prd.problem),
    ...input.prd.targetUsers.flatMap(textTerms),
    ...input.brief.normalizedIdea.domains.flatMap(textTerms)
  ]).slice(0, 18);
  const architectureText = [
    input.architecture.systemName,
    input.architecture.summary,
    ...input.architecture.components.map(
      (component) => `${component.name} ${component.responsibility}`
    ),
    ...input.architecture.decisions.map(
      (decision) => `${decision.decision} ${decision.rationale}`
    ),
    ...input.architecture.risks.map((risk) => `${risk.risk} ${risk.mitigation}`)
  ]
    .join(" ")
    .toLowerCase();
  const matchedTerms = expectedTerms.filter((term) =>
    architectureText.includes(term.toLowerCase())
  );

  return ratio(matchedTerms.length, Math.min(expectedTerms.length, 8));
}

function rounded(value: number, decimals = 3) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function judgeProjectArchitecture(
  input: JudgeProjectArchitectureInput
): ProjectArchitectureJudge {
  const architecture = input.architecture;
  const requirementIds = input.prd.requirements.map((requirement) => requirement.id);
  const referencedRequirementIds = sourceRequirementIds(architecture);
  const referencedPaperIds = sourcePaperIds(architecture);
  const usefulPaperIds = input.brief.reviewedPapers
    .filter((paper) => paper.usefulForProject)
    .map((paper) => paper.paperId);
  const requirementCoverage = ratio(
    requirementIds.filter((id) => referencedRequirementIds.includes(id)).length,
    requirementIds.length
  );
  const componentTraceabilityCoverage = ratio(
    architecture.traceability.componentsWithRequirements,
    architecture.traceability.componentCount
  );
  const decisionPaperCoverage = ratio(
    architecture.traceability.decisionsWithPaperSources,
    architecture.traceability.decisionCount
  );
  const componentTypeDiversity = new Set(
    architecture.components.map((component) => component.componentType)
  ).size;
  const genericCount = genericComponentCount(architecture);
  const paperEvidenceCoverage = ratio(
    usefulPaperIds.filter((id) => referencedPaperIds.includes(id)).length,
    Math.min(usefulPaperIds.length, 8)
  );
  const riskCoverage = ratio(
    architecture.risks.filter(
      (risk) => risk.sourcePaperIds.length > 0 || risk.sourceRequirementIds.length > 0
    ).length,
    Math.max(1, input.prd.risks.length)
  );
  const termCoverage = specificTermCoverage(input);
  const score = Math.round(
    requirementCoverage * 22 +
      componentTraceabilityCoverage * 14 +
      decisionPaperCoverage * 16 +
      Math.min(componentTypeDiversity / 5, 1) * 12 +
      paperEvidenceCoverage * 14 +
      riskCoverage * 10 +
      termCoverage * 12 -
      genericCount * 12
  );
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const requiredFixes: string[] = [];

  if (requirementCoverage >= 0.9) {
    strengths.push("Architecture covers nearly all PRD requirements.");
  } else {
    weaknesses.push("Architecture misses PRD requirement coverage.");
    requiredFixes.push("Map every must/should PRD requirement to components or decisions.");
  }

  if (decisionPaperCoverage >= 0.9) {
    strengths.push("Architecture decisions cite research papers.");
  } else {
    weaknesses.push("Some architecture decisions lack paper evidence.");
    requiredFixes.push("Attach paper evidence to architecture decisions.");
  }

  if (componentTypeDiversity >= 5) {
    strengths.push("Architecture has healthy component type diversity.");
  } else {
    weaknesses.push("Component type diversity is too narrow.");
    requiredFixes.push("Separate frontend, backend, data, AI, integration and ops responsibilities.");
  }

  if (genericCount === 0) {
    strengths.push("No generic fallback components detected.");
  } else {
    weaknesses.push("Generic fallback components detected.");
    requiredFixes.push("Replace generic components with domain-specific workflow components.");
  }

  if (paperEvidenceCoverage >= 0.5) {
    strengths.push("Architecture uses a meaningful share of reviewed paper evidence.");
  } else {
    weaknesses.push("Architecture uses too little reviewed paper evidence.");
    requiredFixes.push("Reference useful reviewed papers across components, decisions and risks.");
  }

  if (termCoverage >= 0.45) {
    strengths.push("Architecture language stays specific to the PRD and research brief.");
  } else {
    weaknesses.push("Architecture language is too generic for the project.");
    if (termCoverage < 0.35) {
      requiredFixes.push("Use project-specific workflow terms from the PRD and research brief.");
    }
  }

  const normalizedScore = Math.max(0, Math.min(100, score));
  const verdict =
    architecture.status === "blocked"
      ? "needs_review"
      : requiredFixes.length > 0 || normalizedScore < 80
        ? "fail"
        : normalizedScore >= 90
          ? "pass"
          : "needs_review";

  return ProjectArchitectureJudgeSchema.parse({
    architectureId: architecture.id,
    sourcePrdId: input.prd.id,
    sourceBriefId: input.brief.id,
    score: normalizedScore,
    verdict,
    requirementCoverage: rounded(requirementCoverage),
    componentTraceabilityCoverage: rounded(componentTraceabilityCoverage),
    decisionPaperCoverage: rounded(decisionPaperCoverage),
    componentTypeDiversity,
    genericComponentCount: genericCount,
    paperEvidenceCoverage: rounded(paperEvidenceCoverage),
    riskCoverage: rounded(riskCoverage),
    specificTermCoverage: rounded(termCoverage),
    strengths,
    weaknesses,
    requiredFixes: unique(requiredFixes)
  });
}

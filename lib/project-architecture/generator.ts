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

type ComponentSeed = {
  id: string;
  name: string;
  responsibility: string;
  componentType: ProjectArchitectureComponent["componentType"];
  inputs: string[];
  outputs: string[];
};

type DecisionSeed = {
  id: string;
  decision: string;
  rationale: string;
  tradeoffs: string[];
};

type Blueprint = {
  profile: string;
  summary: string;
  components: ComponentSeed[];
  decisions: DecisionSeed[];
  testStrategy: string[];
  risks: string[];
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function textForArchitecture(input: GenerateProjectArchitectureInput) {
  return [
    input.prd.productName,
    input.prd.problem,
    input.prd.targetUsers.join(" "),
    input.prd.goals.join(" "),
    input.brief.normalizedIdea.domains.join(" "),
    input.brief.normalizedIdea.assumptions.join(" "),
    input.brief.normalizedIdea.nonGoals.join(" ")
  ]
    .join(" ")
    .toLowerCase();
}

function sourceRequirementIds(prd: ProjectPrd) {
  return prd.requirements.map((requirement) => requirement.id);
}

function sourcePaperIds(prd: ProjectPrd, brief: ProjectResearchBrief) {
  return unique([
    ...prd.traceability.sourcePaperIds,
    ...brief.reviewedPapers.map((paper) => paper.paperId)
  ]).slice(0, 12);
}

function seedToComponent(input: {
  seed: ComponentSeed;
  index: number;
  requirementIds: string[];
  paperIds: string[];
}): ProjectArchitectureComponent {
  return {
    id: `cmp_blueprint_${input.index + 1}_${input.seed.id}`,
    name: input.seed.name,
    responsibility: input.seed.responsibility,
    componentType: input.seed.componentType,
    inputs: input.seed.inputs,
    outputs: input.seed.outputs,
    sourceRequirementIds: input.requirementIds.slice(0, 5),
    sourcePaperIds: input.paperIds.slice(0, 8)
  };
}

function seedToDecision(input: {
  seed: DecisionSeed;
  index: number;
  requirementIds: string[];
  paperIds: string[];
}): ProjectArchitectureDecision {
  return {
    id: `adr_blueprint_${input.index + 1}_${input.seed.id}`,
    decision: input.seed.decision,
    rationale: input.seed.rationale,
    tradeoffs: input.seed.tradeoffs,
    sourceRequirementIds: input.requirementIds.slice(0, 5),
    sourcePaperIds: input.paperIds.slice(0, 8)
  };
}

function commonBlueprint(input: {
  profile: string;
  noun: string;
  intake: string;
  evidence: string;
  evaluator: string;
  report: string;
}): Blueprint {
  return {
    profile: input.profile,
    summary: `System architecture centers on a narrow ${input.noun} workflow: evidence intake, versioned evaluation, human review, and deployment-quality audit outputs.`,
    components: [
      {
        id: "intake_adapter",
        name: `${input.intake} Intake Adapter`,
        responsibility:
          "Ingest source artifacts, normalize metadata, preserve provenance, and reject unsupported or unsafe inputs before analysis.",
        componentType: "integration",
        inputs: ["source artifacts", "project configuration", "provenance metadata"],
        outputs: ["normalized analysis jobs", "input validation findings"]
      },
      {
        id: "evidence_store",
        name: `${input.evidence} Evidence Store`,
        responsibility:
          "Persist source artifacts, extracted signals, fixtures, evaluation runs, and cited evidence with immutable IDs.",
        componentType: "data",
        inputs: ["normalized jobs", "evaluation outputs", "review decisions"],
        outputs: ["versioned evidence records", "traceable run history"]
      },
      {
        id: "ai_evaluator",
        name: `${input.evaluator} AI Evaluator`,
        responsibility:
          "Classify failures, compare evidence against expected behavior, and produce explainable diagnostics bounded by source evidence.",
        componentType: "ai",
        inputs: ["evidence records", "evaluation policy", "benchmark fixtures"],
        outputs: ["diagnostic findings", "confidence and evidence links"]
      },
      {
        id: "report_api",
        name: `${input.report} Report API`,
        responsibility:
          "Expose scored findings, remediation tasks, and audit trails through stable API contracts for UI and automation clients.",
        componentType: "backend",
        inputs: ["diagnostic findings", "risk scores", "review state"],
        outputs: ["report payloads", "exportable project inputs"]
      },
      {
        id: "review_console",
        name: "Human Review Console",
        responsibility:
          "Let users inspect evidence, approve recommendations, dismiss false positives, and export only reviewed decisions.",
        componentType: "frontend",
        inputs: ["report payloads", "source excerpts", "review actions"],
        outputs: ["human decisions", "approved remediation queue"]
      },
      {
        id: "quality_gate",
        name: "Benchmark And Release Quality Gate",
        responsibility:
          "Run regression suites, block low-evidence outputs, monitor drift, and keep release readiness tied to measurable thresholds.",
        componentType: "ops",
        inputs: ["fixtures", "run metrics", "audit thresholds"],
        outputs: ["pass/fail gates", "quality trend reports"]
      }
    ],
    decisions: [
      {
        id: "immutable_evidence",
        decision: "Store every finding as an immutable evidence-backed run artifact.",
        rationale:
          "Architecture quality depends on being able to trace each recommendation back to source input, evaluation policy, and benchmark result.",
        tradeoffs: [
          "more storage and schema discipline",
          "much stronger auditability and repeatable debugging"
        ]
      },
      {
        id: "human_review_before_action",
        decision: "Require human review before recommendations affect external systems.",
        rationale:
          "The product is a diagnostic and planning system, so trust depends on reviewable evidence rather than automatic irreversible action.",
        tradeoffs: [
          "slower automation in MVP",
          "lower operational risk and clearer accountability"
        ]
      },
      {
        id: "benchmark_first_quality",
        decision: "Treat benchmark fixtures as first-class product data.",
        rationale:
          "The system must improve through repeatable cases, not ad hoc prompt changes or anecdotal inspection.",
        tradeoffs: [
          "requires ongoing fixture curation",
          "makes quality measurable across releases"
        ]
      }
    ],
    testStrategy: [
      "Run schema and contract tests for each component boundary.",
      "Maintain golden fixtures for happy path, edge cases, and known regressions.",
      "Score every architecture run for traceability, component diversity, decision evidence coverage, and risk coverage.",
      "Block release if benchmark quality drops below configured thresholds.",
      "Run red-team tests for prompt injection, unsafe inputs, missing evidence, and false-positive remediation."
    ],
    risks: [
      "AI diagnostics may look plausible while missing source evidence.",
      "Fixture sets can overfit to known examples and miss new failure modes.",
      "Users may treat recommendations as automated decisions unless review boundaries are explicit."
    ]
  };
}

function architectureBlueprint(input: GenerateProjectArchitectureInput): Blueprint {
  const text = textForArchitecture(input);

  if (
    text.includes("document conversion") ||
    text.includes("markdown") ||
    text.includes("rag ingestion") ||
    text.includes("conversion quality")
  ) {
    return commonBlueprint({
      profile: "document_conversion_qa",
      noun: "document conversion QA",
      intake: "Document Fixture",
      evidence: "Conversion QA",
      evaluator: "Structure And RAG Quality",
      report: "Conversion Regression"
    });
  }

  if (
    text.includes("context budget") ||
    text.includes("context compression") ||
    text.includes("token") ||
    text.includes("fact retention")
  ) {
    return commonBlueprint({
      profile: "llm_context_quality",
      noun: "LLM context quality",
      intake: "Original And Compressed Context",
      evidence: "Context Fidelity",
      evaluator: "Fact Retention And Task Success",
      report: "Context Budget"
    });
  }

  if (
    text.includes("provider compatibility") ||
    text.includes("provider routing") ||
    text.includes("cli reliability") ||
    text.includes("model routing")
  ) {
    return commonBlueprint({
      profile: "ai_cli_provider_reliability",
      noun: "AI CLI provider reliability",
      intake: "Provider Config And Log",
      evidence: "Provider Capability",
      evaluator: "Failure Classification",
      report: "Compatibility"
    });
  }

  if (
    text.includes("session reliability") ||
    text.includes("desktop sessions") ||
    text.includes("conversation continuity") ||
    text.includes("agent session")
  ) {
    return commonBlueprint({
      profile: "agent_session_reliability",
      noun: "agent session reliability",
      intake: "Session Event",
      evidence: "Session Graph",
      evaluator: "Lifecycle Consistency",
      report: "Recovery And QA"
    });
  }

  if (
    text.includes("self-hosted") ||
    text.includes("workspace governance") ||
    text.includes("policy auditor") ||
    text.includes("deployment readiness")
  ) {
    return commonBlueprint({
      profile: "self_hosted_ai_governance",
      noun: "self-hosted AI governance",
      intake: "Workspace Config",
      evidence: "Policy Control",
      evaluator: "Security And Readiness",
      report: "Remediation"
    });
  }

  return commonBlueprint({
    profile: "generic_evidence_backed_ai_product",
    noun: "evidence-backed AI product",
    intake: "Project Evidence",
    evidence: "Decision",
    evaluator: "Evidence Quality",
    report: "Project Readiness"
  });
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

function blueprintRisks(input: {
  blueprint: Blueprint;
  requirementIds: string[];
  paperIds: string[];
  existingCount: number;
}): ProjectArchitectureRisk[] {
  return input.blueprint.risks.slice(0, 4).map((risk, index) => ({
    id: `arch_blueprint_risk_${input.existingCount + index + 1}`,
    risk,
    mitigation:
      index === 0
        ? "Require cited evidence and confidence for every diagnostic finding."
        : index === 1
          ? "Expand benchmark fixtures from real failures and track coverage drift."
          : "Keep human approval, audit logs, and non-goals visible in every release gate.",
    sourceRequirementIds: input.requirementIds.slice(0, 5),
    sourcePaperIds: input.paperIds.slice(0, 8)
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
  const blueprint = architectureBlueprint(input);
  const requirementIds = sourceRequirementIds(input.prd);
  const paperIds = sourcePaperIds(input.prd, input.brief);
  const blueprintComponents = blueprint.components.map((seed, index) =>
    seedToComponent({ seed, index, requirementIds, paperIds })
  );
  const requirementComponents = requirements
    .slice(0, 6)
    .map(componentFromRequirement);
  const components = [...blueprintComponents, ...requirementComponents];
  const blueprintDecisions = blueprint.decisions.map((seed, index) =>
    seedToDecision({ seed, index, requirementIds, paperIds })
  );
  const requirementDecisions = requirements.slice(0, 5).map(decisionFromRequirement);
  const decisions = [...blueprintDecisions, ...requirementDecisions];
  const traceability = buildTraceability(components, decisions);
  const componentTypes = new Set(components.map((component) => component.componentType));
  const architecture: ProjectArchitecture = {
    id: `arch_${input.prd.id.replace(/^prd_/, "")}`,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    sourcePrdId: input.prd.id,
    sourceBriefId: input.brief.id,
    status: "ready",
    systemName: input.prd.productName,
    summary: blueprint.summary,
    components,
    decisions,
    risks: [
      ...risksFromPrd(input.prd),
      ...blueprintRisks({
        blueprint,
        requirementIds,
        paperIds,
        existingCount: input.prd.risks.length
      })
    ].slice(0, 10),
    testStrategy: blueprint.testStrategy,
    blockers: [],
    traceability,
    audit: {
      score: Math.min(
        100,
        Math.round(
          input.prd.audit.score * 0.55 +
            input.brief.audit.score * 0.25 +
            traceability.componentsWithRequirements * 1.2 +
            componentTypes.size * 2
        )
      ),
      verdict:
        `Architecture uses ${blueprint.profile} blueprint and is traceable to PRD requirements and research evidence.`,
      strengths: [
        "components map back to PRD requirements",
        "architecture decisions keep paper source traceability",
        "system blueprint separates intake, data, AI evaluation, backend, frontend and ops gates"
      ],
      weaknesses: [
        ...(traceability.decisionsWithPaperSources === decisions.length
          ? []
          : ["some architecture decisions do not cite source papers"]),
        ...(componentTypes.size >= 5
          ? []
          : ["architecture has weak component type diversity"])
      ]
    }
  };

  return ProjectArchitectureSchema.parse(architecture);
}

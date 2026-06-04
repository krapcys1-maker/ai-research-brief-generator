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
    sourceRequirementIds: input.requirementIds,
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
    sourceRequirementIds: input.requirementIds,
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
    text.includes("repo mri") ||
    text.includes("bug path") ||
    text.includes("code knowledge graph") ||
    text.includes("code graph") ||
    text.includes("repository map") ||
    text.includes("code intelligence")
  ) {
    return {
      profile: "repo_mri_code_intelligence",
      summary:
        "System architecture centers on an evidence-first code intelligence workflow: safe repository indexing, deterministic graph construction, hybrid retrieval, Bug Path localization, and LLM summaries only after bounded evidence retrieval.",
      components: [
        {
          id: "safe_repo_scanner",
          name: "Safe Repository Scanner",
          responsibility:
            "Scan a local repository, apply ignore and secret-deny policies, fingerprint files, and reject generated, binary, dependency and private inputs before parsing.",
          componentType: "integration",
          inputs: ["repository path", "ignore policy", "file size limits"],
          outputs: ["scan manifest", "safe source files", "rejected input report"]
        },
        {
          id: "deterministic_parser",
          name: "Deterministic Parser And Symbol Extractor",
          responsibility:
            "Extract files, symbols, imports, calls, tests and line ranges through deterministic parser logic instead of LLM-generated facts.",
          componentType: "backend",
          inputs: ["safe source files", "language detection"],
          outputs: ["symbols", "imports", "call edges", "test links", "parser confidence"]
        },
        {
          id: "code_knowledge_graph",
          name: "Code Knowledge Graph Store",
          responsibility:
            "Persist repository entities, graph edges, chunks, confidence and provenance so every retrieval result can cite concrete evidence.",
          componentType: "data",
          inputs: ["parsed symbols", "edges", "chunks", "file fingerprints"],
          outputs: ["queryable graph", "FTS index", "traceable evidence records"]
        },
        {
          id: "hybrid_retriever",
          name: "Hybrid Code Retriever",
          responsibility:
            "Combine exact path matching, symbol search, FTS, optional vector search and bounded graph expansion to return ranked evidence.",
          componentType: "backend",
          inputs: ["natural language query", "symbol/path hints", "graph neighbors"],
          outputs: ["ranked candidates", "score sources", "evidence snippets"]
        },
        {
          id: "bug_path_engine",
          name: "Bug Path Engine",
          responsibility:
            "Parse issue text or stacktraces, map file and line hints to symbols, expand to callers/callees/tests, and rank likely debugging paths with unknowns.",
          componentType: "ai",
          inputs: ["issue text", "stacktrace", "retrieval candidates", "graph evidence"],
          outputs: ["candidate paths", "confidence", "likely tests", "next actions", "unknowns"]
        },
        {
          id: "evidence_ui_api",
          name: "Evidence UI And API",
          responsibility:
            "Expose search, stats and Bug Path outputs as structured JSON and UI views that show evidence, confidence, line ranges and next actions.",
          componentType: "frontend",
          inputs: ["ranked candidates", "graph records", "review actions"],
          outputs: ["evidence-first UI", "API payloads", "demo-ready reports"]
        },
        {
          id: "evaluation_harness",
          name: "Golden Query And Bug Fixture Harness",
          responsibility:
            "Run retrieval and bug localization fixtures, track Recall@k, top candidate hit rate, evidence completeness and false-confidence failures.",
          componentType: "ops",
          inputs: ["fixture repos", "golden queries", "bug fixtures"],
          outputs: ["quality report", "regression gates", "release blockers"]
        }
      ],
      decisions: [
        {
          id: "graph_first",
          decision: "Use a Code Knowledge Graph as the canonical source of repository truth.",
          rationale:
            "Bug localization and repository understanding require relationships between files, symbols, imports, calls and tests; chunk-only RAG cannot defend those facts.",
          tradeoffs: [
            "harder parser and schema work",
            "much stronger explainability and evaluation surface"
          ]
        },
        {
          id: "deterministic_before_llm",
          decision: "Build scanner, parser, graph, retrieval and Bug Path without depending on LLM-generated repository facts.",
          rationale:
            "LLMs may summarize retrieved evidence, but they must not create canonical code edges or source facts.",
          tradeoffs: [
            "slower MVP than a chat demo",
            "less hallucination risk and a stronger portfolio proof"
          ]
        },
        {
          id: "sqlite_first",
          decision: "Use SQLite with FTS5 for the first local vertical slice.",
          rationale:
            "The first proof needs zero infrastructure and fast local tests before adding Postgres, pgvector or graph databases.",
          tradeoffs: [
            "limited multi-user production scaling",
            "fast demo setup and repeatable fixture tests"
          ]
        },
        {
          id: "mcp_later",
          decision: "Add MCP or agent integrations only after stable local search and Bug Path APIs exist.",
          rationale:
            "The product value is code intelligence, not an early protocol wrapper with extra security and permission complexity.",
          tradeoffs: [
            "less trendy first milestone",
            "safer and clearer core product boundary"
          ]
        }
      ],
      testStrategy: [
        "Run scanner tests for ignore policy, secret-deny files, binaries and dependency folders.",
        "Run parser fixture tests for Python and TypeScript symbols, imports, calls and line ranges.",
        "Run golden query tests for file and symbol Recall@5.",
        "Run Bug Path fixtures for top-1 file hit, top-3 symbol hit, likely test detection and unknown reporting.",
        "Block release if any answer lacks path, line range, evidence, confidence and source snippet."
      ],
      risks: [
        "LLM summaries may invent repository facts if evidence boundaries are not enforced.",
        "Weak parsers can create false graph edges and destroy trust.",
        "Large graph visualizations can become unreadable without bounded neighborhoods and filters.",
        "Scanner mistakes can leak secrets or index private dependency artifacts."
      ]
    };
  }

  if (
    text.includes("trading") ||
    text.includes("backtest") ||
    text.includes("paper trading") ||
    text.includes("algorithmic")
  ) {
    return commonBlueprint({
      profile: "trading_strategy_risk_simulator",
      noun: "trading strategy risk simulation",
      intake: "Market Strategy And Backtest",
      evidence: "Trading Risk Scenario",
      evaluator: "Drawdown And Overfit",
      report: "Paper Trading Risk"
    });
  }

  if (
    text.includes("medical") ||
    text.includes("clinical") ||
    text.includes("healthcare") ||
    text.includes("diagnostic")
  ) {
    return commonBlueprint({
      profile: "clinical_documentation_evidence_auditor",
      noun: "clinical documentation evidence audit",
      intake: "Clinical Document",
      evidence: "Clinical Citation",
      evaluator: "Uncertainty And Claim Support",
      report: "Clinician Review"
    });
  }

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
    text.includes("technical debt") ||
    text.includes("refactor") ||
    text.includes("code review") ||
    (text.includes("repository") &&
      (text.includes("static analysis") ||
        text.includes("maintainability") ||
        text.includes("technical debt") ||
        text.includes("refactor")))
  ) {
    return commonBlueprint({
      profile: "technical_debt_sprint_planner",
      noun: "technical debt sprint planning",
      intake: "Repository And Issue",
      evidence: "Refactor Evidence",
      evaluator: "Debt Priority And Risk",
      report: "Sprint Refactor Plan"
    });
  }

  if (
    text.includes("short-video") ||
    text.includes("short video") ||
    text.includes("ai media") ||
    text.includes("content operations") ||
    text.includes("publishing qa") ||
    text.includes("publishing risk") ||
    text.includes("brand safety")
  ) {
    return commonBlueprint({
      profile: "ai_media_publishing_qa",
      noun: "AI short-video publishing QA",
      intake: "Script Prompt Voiceover And Render Metadata",
      evidence: "Publishing Claim And Brand Safety",
      evaluator: "Script Repetition Grounding And Publishing Risk",
      report: "Content QA Review Queue"
    });
  }

  if (
    text.includes("data quality") ||
    text.includes("analytics engineering") ||
    text.includes("extraction drift") ||
    text.includes("warehouse") ||
    text.includes("scraping") ||
    text.includes("crawler")
  ) {
    return commonBlueprint({
      profile: "data_quality_investigation",
      noun: "data quality and extraction investigation",
      intake: "Dataset Schema And Extraction",
      evidence: "Data Quality Evidence",
      evaluator: "Anomaly Drift And Root Cause",
      report: "Data Investigation"
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
    text.includes("approval ux") ||
    text.includes("agent action approval") ||
    text.includes("command approval") ||
    text.includes("command confirmation") ||
    text.includes("tool call") ||
    text.includes("tool-use governance") ||
    text.includes("approval flow")
  ) {
    return commonBlueprint({
      profile: "agent_action_approval_governance",
      noun: "agent action approval and tool-use governance",
      intake: "Tool Call Command And Approval Event",
      evidence: "Approval Risk And Recovery",
      evaluator: "Command Risk Explanation",
      report: "Approval UX Governance"
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
    sourceRequirementIds: input.requirementIds,
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

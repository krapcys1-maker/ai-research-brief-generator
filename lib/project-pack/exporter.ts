import type {
  ProjectArchitecture,
  ProjectArchitectureJudge
} from "@/lib/project-architecture";
import type { ProjectPrd } from "@/lib/project-prd";
import type { ProjectResearchBrief } from "@/lib/project-research";

export type ProjectPackArtifact = {
  path: string;
  content: string;
};

export type ProjectPackReadiness = {
  score: number;
  verdict: "pass" | "needs_review" | "fail";
  strengths: string[];
  weaknesses: string[];
  requiredFixes: string[];
  artifactCount: number;
  requiredArtifactCoverage: number;
  cursorReady: boolean;
  starterCodeReady: boolean;
  planJudge: ProjectPlanJudge;
};

export type ProjectPackExport = {
  artifacts: ProjectPackArtifact[];
  readiness: ProjectPackReadiness;
};

export type ProjectPlanJudge = {
  score: number;
  verdict: "pass" | "needs_review" | "fail";
  dimensionScores: {
    masterplanDepth: number;
    roadmapDod: number;
    riskRegister: number;
    evaluationPlan: number;
    cursorActionability: number;
    gptBaselineParity: number;
  };
  strengths: string[];
  weaknesses: string[];
  requiredFixes: string[];
  gptBaselineComparison: {
    status: "beats_plan_floor" | "near_plan_floor" | "below_plan_floor";
    betterThanGpt: string[];
    stillBehindGpt: string[];
  };
};

type GenerateProjectPackInput = {
  brief: ProjectResearchBrief;
  prd: ProjectPrd;
  architecture: ProjectArchitecture;
  architectureJudge: ProjectArchitectureJudge;
};

type ProductShape = {
  thesis: string;
  killerFeature: string;
  coreWorkflow: string[];
  coreModuleName: string;
  storageChoice: string;
  firstVerticalSlice: string[];
  apiExamples: string[];
  evaluationMetrics: string[];
  cursorRuleFocus: string;
};

type RoadmapMilestone = {
  id: string;
  title: string;
  objective: string;
  tasks: string[];
  definitionOfDone: string[];
  verification: string[];
  deliverables: string[];
  commonFailureMode: string;
};

type RiskItem = {
  id: string;
  severity: "critical" | "high" | "medium";
  risk: string;
  trigger: string;
  impact: string;
  mitigation: string;
  owner: string;
  evidenceOrSource: string;
  testOrSignal: string;
};

const REQUIRED_ARTIFACTS = [
  "README.md",
  "docs/00-masterplan-source.md",
  "docs/01-architecture.md",
  "docs/02-build-roadmap.md",
  "docs/03-risk-register.md",
  "docs/04-evaluation-plan.md",
  "docs/05-api-contract.md",
  "docs/06-demo-script.md",
  "docs/07-research-digest.md",
  "docs/08-project-plan-judge.md",
  "adr/0001-evidence-first.md",
  "adr/0002-deterministic-core-before-llm.md",
  "adr/0003-storage-path.md",
  "adr/0004-agent-integration-later.md",
  ".cursor/rules/000-project-core.mdc",
  ".cursor/rules/030-testing-quality.mdc",
  ".cursor/plans/P00-bootstrap.md",
  ".cursor/plans/P01-core-engine.md",
  ".cursor/plans/P02-evaluation.md",
  "prompts/cursor/00-kickoff.md",
  "prompts/cursor/01-build-core.md",
  "prompts/cursor/02-review-output.md",
  "schemas/core_entities.json",
  "schemas/api_contract.json",
  "tests/README.md",
  "sample_data/README.md",
  "10_final_verdict.md"
];

function bullet(values: string[]) {
  return values.map((value) => `- ${value}`).join("\n");
}

function numbered(values: string[]) {
  return values.map((value, index) => `${index + 1}. ${value}`).join("\n");
}

function codeBlock(value: unknown) {
  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

function table(headers: string[], rows: string[][]) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((value) => value.replace(/\|/g, "\\|")).join(" | ")} |`)
  ].join("\n");
}

function projectText(input: GenerateProjectPackInput) {
  return [
    input.prd.productName,
    input.prd.problem,
    input.prd.goals.join(" "),
    input.prd.nonGoals.join(" "),
    input.architecture.summary,
    input.architecture.components.map((component) => component.name).join(" "),
    input.brief.normalizedIdea.oneSentence,
    input.brief.normalizedIdea.domains.join(" ")
  ]
    .join(" ")
    .toLowerCase();
}

function productShape(input: GenerateProjectPackInput): ProductShape {
  const text = projectText(input);

  if (
    text.includes("repo mri") ||
    text.includes("bug path") ||
    text.includes("code graph") ||
    text.includes("code knowledge graph") ||
    text.includes("repository map") ||
    text.includes("code intelligence")
  ) {
    return {
      thesis:
        "Nie budujemy chatbota do repo. Budujemy evidence-first code intelligence system, w ktorym deterministyczny indeks jest zrodlem prawdy, a LLM tylko tlumaczy odzyskane dowody.",
      killerFeature:
        "Bug Path: uzytkownik wkleja issue albo stacktrace, a system zwraca najbardziej prawdopodobne pliki, symbole, testy, hipotezy, confidence i next actions.",
      coreWorkflow: [
        "safe repository scan",
        "deterministic parsing into files, symbols, imports, calls and tests",
        "Code Knowledge Graph persistence",
        "hybrid retrieval by path, symbol, FTS, vector and graph expansion",
        "Bug Path ranking with evidence and unknowns",
        "LLM summary only after bounded evidence retrieval"
      ],
      coreModuleName: "repo_mri_indexer",
      storageChoice: "SQLite + FTS5 for MVP, Postgres/pgvector later",
      firstVerticalSlice: [
        "CLI indexes a tiny fixture repo",
        "stats command reports files, symbols and edges",
        "search returns path, symbol, line range and score",
        "bug-path ranks the target symbol and likely test",
        "pytest verifies scanner, parser, search and bug-path behavior"
      ],
      apiExamples: [
        "POST /repos/index",
        "GET /repos/{id}/stats",
        "GET /search?q=login_user",
        "POST /bug-path"
      ],
      evaluationMetrics: [
        "Recall@5 for files",
        "Recall@5 for symbols",
        "top-1 bug-path file hit",
        "top-3 bug-path symbol hit",
        "evidence completeness",
        "false confident answer rate"
      ],
      cursorRuleFocus:
        "Every answer must preserve file path, symbol, line range, confidence and source snippet. The LLM must not invent graph facts."
    };
  }

  return {
    thesis:
      "Budujemy waski evidence-first produkt diagnostyczny, nie ogolnego chatbota ani autonomicznego agenta bez kontroli.",
    killerFeature:
      "Reviewable Evidence Report: system pokazuje decyzje, ryzyka, confidence, zrodla i next actions przed jakakolwiek automatyzacja.",
    coreWorkflow: [
      "safe intake",
      "evidence extraction",
      "versioned evidence storage",
      "bounded AI evaluation",
      "human review",
      "benchmark gate",
      "exported remediation plan"
    ],
    coreModuleName: "core_evidence_engine",
    storageChoice: "SQLite for MVP, Postgres later if multi-user persistence is needed",
    firstVerticalSlice: [
      "CLI/API accepts one sample input",
      "engine extracts evidence-backed findings",
      "report lists confidence, evidence and unknowns",
      "fixture test verifies one happy path and one blocked case"
    ],
    apiExamples: ["POST /analyze", "GET /reports/{id}", "POST /reports/{id}/review"],
    evaluationMetrics: [
      "schema validity",
      "evidence coverage",
      "false positive rate",
      "blocked unsafe-output rate",
      "review acceptance rate"
    ],
    cursorRuleFocus:
      "Every recommendation must cite evidence and unknowns. Do not turn weak evidence into confident product facts."
  };
}

function researchDigest(brief: ProjectResearchBrief) {
  const paperLines = brief.reviewedPapers.slice(0, 10).map((paper) => {
    const methods = paper.keyMethods.slice(0, 3).join(", ") || "methods not extracted";
    return `- ${paper.title} (${paper.year ?? "n.d."}) - ${methods}; evidence: ${paper.evidenceStrength}.`;
  });

  return [
    "# Research digest",
    "",
    "Use this file as the short bibliography while building.",
    "",
    ...paperLines,
    "",
    "## Research direction",
    "",
    brief.recommendedTechnicalDirection.summary,
    "",
    "## Use in architecture",
    "",
    bullet(brief.recommendedTechnicalDirection.approach.slice(0, 6)),
    "",
    "## Avoid",
    "",
    bullet(brief.recommendedTechnicalDirection.avoid.slice(0, 6))
  ].join("\n");
}

function roadmapMilestones(shape: ProductShape): RoadmapMilestone[] {
  const isRepoMri = shape.coreModuleName === "repo_mri_indexer";

  if (isRepoMri) {
    return [
      {
        id: "M0",
        title: "Repo fixture and executable skeleton",
        objective:
          "Create the smallest runnable project where scanner, storage and tests can evolve without UI or LLM distractions.",
        tasks: [
          "create `services/indexer` with CLI entrypoint",
          "add tiny Python + TypeScript fixture repository",
          "define SQLite schema for repositories, files, symbols, edges and test links",
          "add Makefile commands for test, index-fixture and search-fixture"
        ],
        definitionOfDone: [
          "`make test` runs locally from a clean checkout",
          "fixture repo is indexed without reading ignored folders or secret-looking files",
          "database contains repository, file and symbol rows",
          "README explains the first command a Cursor agent should run"
        ],
        verification: [
          "run unit tests for ignore policy and file fingerprinting",
          "inspect SQLite row counts after indexing fixture",
          "confirm `.env`, `node_modules`, `.git`, build outputs and oversized files are skipped"
        ],
        deliverables: [
          "runnable CLI skeleton",
          "SQLite migration",
          "fixture repo",
          "first CI/test command"
        ],
        commonFailureMode:
          "Starting with a UI makes the project look alive while the evidence engine is still fake."
      },
      {
        id: "M1",
        title: "Deterministic code graph MVP",
        objective:
          "Turn files into explainable code facts before any LLM summary exists.",
        tasks: [
          "extract Python functions/classes with line ranges",
          "extract basic TypeScript exports/imports with conservative heuristics",
          "create `DEFINES`, `IMPORTS`, `CALLS` and `TESTS` edges with confidence",
          "store every extracted fact with source path and line range"
        ],
        definitionOfDone: [
          "expected fixture symbols are found by exact name",
          "call edges include confidence and are marked approximate when heuristic",
          "test files link to at least one target symbol or file",
          "no graph fact can be emitted without source path and line range"
        ],
        verification: [
          "golden fixture test checks symbol count and edge count",
          "negative fixture proves approximate call edges are not reported as certain",
          "schema test rejects missing path/line evidence"
        ],
        deliverables: [
          "scanner",
          "parser adapters",
          "graph writer",
          "golden graph fixture"
        ],
        commonFailureMode:
          "Treating chunks as the graph; chunks are retrieval material, not architecture knowledge."
      },
      {
        id: "M2",
        title: "Hybrid retrieval and evidence cards",
        objective:
          "Make search return ranked evidence, not prose.",
        tasks: [
          "add FTS search over paths, symbols and chunks",
          "add exact symbol/path boosts",
          "add bounded graph expansion from top hits",
          "return evidence cards with path, symbol, line range, snippet, score and unknowns"
        ],
        definitionOfDone: [
          "natural-language query finds expected fixture file in top 5",
          "exact symbol query wins over semantic-looking matches",
          "every result includes evidence and confidence",
          "unsupported answers are blocked instead of summarized"
        ],
        verification: [
          "Recall@5 file fixture >= 0.8",
          "Recall@5 symbol fixture >= 0.8",
          "evidence completeness = 100% for returned cards",
          "false confident answer rate = 0 on negative fixture"
        ],
        deliverables: [
          "search API/CLI",
          "evidence card schema",
          "retrieval benchmark",
          "negative unsupported-query fixture"
        ],
        commonFailureMode:
          "Vector-only search feels modern but loses exact symbol and path guarantees."
      },
      {
        id: "M3",
        title: "Bug Path MVP",
        objective:
          "Map an issue or stacktrace to likely files, symbols, tests and next verification commands.",
        tasks: [
          "parse stacktrace and issue text into signals",
          "rank candidate files and symbols using path hits, symbol hits, graph distance and test proximity",
          "generate hypotheses with confidence and explicit unknowns",
          "suggest the smallest test command for each candidate"
        ],
        definitionOfDone: [
          "known fixture bug returns expected file as top 1",
          "expected symbol appears in top 3",
          "suggested test command references the fixture test",
          "output explains why each candidate is ranked"
        ],
        verification: [
          "top-1 file hit >= 0.8 on fixture set",
          "top-3 symbol hit >= 0.8 on fixture set",
          "every Bug Path candidate has evidence and unknowns",
          "manual smoke run fits in the 60-second demo script"
        ],
        deliverables: [
          "bug-path CLI/API",
          "ranking formula",
          "bug fixture suite",
          "demo transcript"
        ],
        commonFailureMode:
          "Jumping to auto-fix before localization is reliable enough to trust."
      },
      {
        id: "M4",
        title: "UI demo and LLM narrator behind evidence gate",
        objective:
          "Show the product clearly while preserving deterministic evidence as the source of truth.",
        tasks: [
          "build repo overview, search and Bug Path screens",
          "show evidence drawer for every result",
          "add optional LLM summary only from bounded evidence cards",
          "log when summary is skipped because evidence is weak"
        ],
        definitionOfDone: [
          "demo can be run from README with fixture repo",
          "UI never shows summary without evidence cards",
          "LLM summary has source ids or is marked unsupported",
          "known limitations are visible in docs"
        ],
        verification: [
          "Playwright smoke covers search and Bug Path views",
          "summary grounding test rejects missing source ids",
          "manual demo follows `docs/06-demo-script.md`"
        ],
        deliverables: [
          "Next.js demo UI",
          "grounded summary adapter",
          "screenshots/GIF plan",
          "portfolio-ready README"
        ],
        commonFailureMode:
          "Letting the LLM become the product instead of the narrator."
      }
    ];
  }

  return [
    {
      id: "M0",
      title: "Executable evidence core",
      objective: "Create a tiny runnable core before UI or automation.",
      tasks: shape.firstVerticalSlice,
      definitionOfDone: [
        "one happy-path fixture passes",
        "one weak-evidence fixture is blocked",
        "core output includes confidence, evidence and unknowns"
      ],
      verification: [
        "run unit tests for fixture extraction",
        "inspect generated evidence report",
        "confirm unsupported claims are not emitted confidently"
      ],
      deliverables: ["core module", "fixture data", "test command"],
      commonFailureMode: "Building broad UI before the core signal is provable."
    },
    {
      id: "M1",
      title: "API and review workflow",
      objective: "Expose the core through reviewable API contracts.",
      tasks: [
        "add API endpoints",
        "persist reports",
        "add human review states",
        "add schema tests"
      ],
      definitionOfDone: [
        "API response matches schema",
        "review status is persisted",
        "blocked output includes reason and next action"
      ],
      verification: ["contract test", "negative fixture", "manual API smoke"],
      deliverables: ["API routes", "schemas", "review states"],
      commonFailureMode: "Returning prose instead of structured review artifacts."
    }
  ];
}

function riskItems(input: GenerateProjectPackInput, shape: ProductShape): RiskItem[] {
  const architectureRisks: RiskItem[] = input.architecture.risks
    .slice(0, 5)
    .map((risk, index) => ({
      id: `ARCH-${index + 1}`,
      severity: index < 2 ? "high" : "medium",
      risk: risk.risk,
      trigger: "Architecture implementation starts to drift from evidence-backed component boundaries.",
      impact: "The product becomes generic, hard to test, or over-dependent on LLM prose.",
      mitigation: risk.mitigation,
      owner: "Tech lead / Cursor agent reviewer",
      evidenceOrSource: "project_architecture.risks",
      testOrSignal: "architecture judge score drops below 90 or traceability coverage regresses"
    }));

  return [
    {
      id: "P0-1",
      severity: "critical",
      risk: "Product degrades into a generic chat interface.",
      trigger:
        "Implementation tasks prioritize chat, long context, or UI polish before deterministic evidence cards.",
      impact:
        "The result becomes weaker than the GPT baseline because it lacks a defensible technical core.",
      mitigation: `Make this invariant part of every Cursor plan: ${shape.cursorRuleFocus}`,
      owner: "Product/architecture owner",
      evidenceOrSource: "GPT baseline comparison + ADR 0002",
      testOrSignal:
        "A result can be shown without source path, line range, evidence snippet or unknowns"
    },
    {
      id: "P0-2",
      severity: "critical",
      risk: "Evaluation is postponed until after the demo.",
      trigger: "Roadmap milestones do not include golden fixtures, Recall@k checks or negative cases.",
      impact:
        "The demo may look good while retrieval, ranking or evidence quality is objectively unproven.",
      mitigation:
        "Build evaluation fixtures in the same milestone as each core capability, not as portfolio polish.",
      owner: "Quality owner / Cursor reviewer",
      evidenceOrSource: "docs/04-evaluation-plan.md",
      testOrSignal: "No benchmark output is produced with the implementation PR"
    },
    {
      id: "P0-3",
      severity: "high",
      risk: "Unsafe repository scanning leaks secrets or indexes junk.",
      trigger: "Scanner traverses ignored folders, `.env`, private keys, binaries or huge generated files.",
      impact: "Security risk, noisy index, slow demo, and broken trust.",
      mitigation:
        "Ship ignore policy, file limits and secret-looking-file tests before broad language support.",
      owner: "Indexer owner",
      evidenceOrSource: "ADR 0001 + scanner tests",
      testOrSignal: "Ignore-policy fixture fails or database contains secret-looking path"
    },
    {
      id: "P1-1",
      severity: "high",
      risk: "Graph facts are overclaimed.",
      trigger: "Approximate regex/heuristic edges are displayed as precise call graph facts.",
      impact: "Bug Path recommendations become misleading.",
      mitigation:
        "Store confidence per edge and label heuristic relationships as approximate until enrichers prove them.",
      owner: "Graph owner",
      evidenceOrSource: "GraphCodeBERT / RepoGraph direction in research digest",
      testOrSignal: "CALLS edge without confidence or parser source"
    },
    ...architectureRisks
  ];
}

function readme(input: GenerateProjectPackInput, shape: ProductShape) {
  return [
    `# ${input.prd.productName} - Cursor-ready starter plan`,
    "",
    shape.thesis,
    "",
    "## Killer feature",
    "",
    shape.killerFeature,
    "",
    "## What this pack is",
    "",
    "This is not a finished product. It is a Cursor-ready project starter: architecture, decisions, roadmap, evaluation plan, API contract, Cursor rules, prompts and sample-test guidance.",
    "",
    "## Quick start for Cursor",
    "",
    "1. Read `docs/00-masterplan-source.md`.",
    "2. Read `.cursor/rules/000-project-core.mdc`.",
    "3. Open `.cursor/plans/P00-bootstrap.md`.",
    "4. Ask Cursor to produce acceptance checks before writing code.",
    "5. Implement the smallest vertical slice from `docs/02-build-roadmap.md`.",
    "",
    "## Core workflow",
    "",
    bullet(shape.coreWorkflow),
    "",
    "## First vertical slice",
    "",
    bullet(shape.firstVerticalSlice),
    "",
    "## Quality bar",
    "",
    "Every output must show evidence, confidence, unknowns, and tests. If evidence is weak, the system must say so."
  ].join("\n");
}

function masterplan(input: GenerateProjectPackInput, shape: ProductShape) {
  const milestones = roadmapMilestones(shape);
  const riskSummary = riskItems(input, shape).slice(0, 4);

  return [
    `# ${input.prd.productName} - masterplan`,
    "",
    "## Product thesis",
    "",
    shape.thesis,
    "",
    "## One-sentence pitch",
    "",
    shape.killerFeature,
    "",
    "## Problem",
    "",
    input.prd.problem,
    "",
    "## Target users",
    "",
    bullet(input.prd.targetUsers),
    "",
    "## Positioning decision",
    "",
    "This project must be judged as a developer-tool system with a measurable core, not as a generic AI wrapper. The first visible feature may be a demo UI, but the first valuable feature is the tested evidence engine.",
    "",
    "## Success criteria",
    "",
    bullet([
      "a new user can run one command and index the fixture input",
      "the killer feature returns structured evidence, confidence and unknowns",
      "the output can be evaluated with at least one positive and one negative fixture",
      "Cursor receives enough rules and plans to start implementation without re-inventing the architecture",
      "the plan explicitly blocks scope creep into generic chat or premature agent automation"
    ]),
    "",
    "## Core workflow",
    "",
    numbered(shape.coreWorkflow),
    "",
    "## Work breakdown",
    "",
    ...milestones.flatMap((milestone) => [
      `### ${milestone.id} - ${milestone.title}`,
      "",
      milestone.objective,
      "",
      "**Tasks**",
      "",
      bullet(milestone.tasks),
      "",
      "**Definition of Done**",
      "",
      bullet(milestone.definitionOfDone),
      "",
      "**Verification**",
      "",
      bullet(milestone.verification),
      ""
    ]),
    "## Critical risks to watch first",
    "",
    table(
      ["ID", "Severity", "Risk", "Owner", "Signal"],
      riskSummary.map((risk) => [
        risk.id,
        risk.severity,
        risk.risk,
        risk.owner,
        risk.testOrSignal
      ])
    ),
    "",
    "## Architecture direction from research",
    "",
    input.brief.recommendedTechnicalDirection.why,
    "",
    bullet(input.brief.recommendedTechnicalDirection.approach.slice(0, 6)),
    "",
    "## Non-goals",
    "",
    bullet(input.prd.nonGoals.length ? input.prd.nonGoals : ["Do not automate irreversible actions in MVP."]),
    "",
    "## Cut line for MVP",
    "",
    bullet([
      "MVP includes deterministic core, fixture evaluation and one demo workflow.",
      "MVP does not include broad language coverage, autonomous code edits, hosted billing or enterprise auth.",
      "Any feature that cannot be evaluated with a fixture is postponed."
    ]),
    "",
    "## Why this should beat a generic AI answer",
    "",
    "The project is grounded in explicit research coverage, PRD requirements, architecture traceability, DoD-gated roadmap milestones, risk ownership and a Cursor-ready implementation workflow. The final product must expose evidence instead of hiding reasoning inside prose."
  ].join("\n");
}

function architectureDoc(input: GenerateProjectPackInput, shape: ProductShape) {
  const components = input.architecture.components
    .slice(0, 10)
    .map(
      (component) =>
        `### ${component.name}\n\n${component.responsibility}\n\n- Type: ${component.componentType}\n- Inputs: ${component.inputs.join(", ") || "n/a"}\n- Outputs: ${component.outputs.join(", ") || "n/a"}`
    )
    .join("\n\n");

  return [
    `# ${input.prd.productName} architecture`,
    "",
    "## Product thesis",
    "",
    shape.thesis,
    "",
    "## Killer feature",
    "",
    shape.killerFeature,
    "",
    "## Architecture summary",
    "",
    input.architecture.summary,
    "",
    "## Components",
    "",
    components,
    "",
    "## Storage choice",
    "",
    shape.storageChoice,
    "",
    "## Evidence rule",
    "",
    "No user-facing answer should be accepted unless it can point to source evidence, confidence and unknowns.",
    "",
    "## Architecture judge",
    "",
    `- Score: ${input.architectureJudge.score}/100`,
    `- Verdict: ${input.architectureJudge.verdict}`,
    `- Generic components: ${input.architectureJudge.genericComponentCount}`
  ].join("\n");
}

function roadmap(shape: ProductShape) {
  const milestones = roadmapMilestones(shape);

  return [
    "# Build roadmap",
    "",
    "This roadmap is written for Cursor/code-agent execution. Each milestone has a Definition of Done and verification command category. Do not advance to the next milestone until the DoD is true.",
    "",
    ...milestones.flatMap((milestone, index) => [
      `## ${milestone.id} - ${milestone.title}`,
      "",
      `Recommended order: ${index + 1}/${milestones.length}`,
      "",
      "### Objective",
      "",
      milestone.objective,
      "",
      "### Tasks",
      "",
      bullet(milestone.tasks),
      "",
      "### Definition of Done",
      "",
      bullet(milestone.definitionOfDone),
      "",
      "### Verification",
      "",
      bullet(milestone.verification),
      "",
      "### Deliverables",
      "",
      bullet(milestone.deliverables),
      "",
      "### Common failure mode",
      "",
      milestone.commonFailureMode,
      ""
    ]),
    "## Release gate for the whole plan",
    "",
    bullet([
      "all required artifacts exist",
      "Project Plan Judge score is at least 90",
      "evaluation fixtures cover happy path and blocked/unknown path",
      "demo follows `docs/06-demo-script.md` without hiding limitations",
      "no milestone depends on unsupported LLM claims"
    ])
  ].join("\n");
}

function riskRegister(input: GenerateProjectPackInput, shape: ProductShape) {
  const risks = riskItems(input, shape);

  return [
    "# Risk register",
    "",
    "This register is meant to be used during implementation reviews. Each risk has a trigger, owner, mitigation and a signal/test.",
    "",
    table(
      ["ID", "Severity", "Risk", "Trigger", "Impact", "Mitigation", "Owner", "Signal/Test"],
      risks.map((risk) => [
        risk.id,
        risk.severity,
        risk.risk,
        risk.trigger,
        risk.impact,
        risk.mitigation,
        risk.owner,
        risk.testOrSignal
      ])
    ),
    "",
    "## Review rule",
    "",
    "Every Cursor implementation plan must name which risks it touches. If a task touches a critical risk and has no test/signal, the task is not ready."
  ].join("\n");
}

function evaluationPlan(shape: ProductShape) {
  const isRepoMri = shape.coreModuleName === "repo_mri_indexer";
  const thresholds = isRepoMri
    ? [
        ["File retrieval Recall@5", ">= 0.80 on fixture queries", "search benchmark"],
        ["Symbol retrieval Recall@5", ">= 0.80 on fixture queries", "search benchmark"],
        ["Bug Path top-1 file hit", ">= 0.80 on bug fixtures", "bug-path benchmark"],
        ["Bug Path top-3 symbol hit", ">= 0.80 on bug fixtures", "bug-path benchmark"],
        ["Evidence completeness", "100% of returned cards have path, line range, snippet, confidence", "schema/test"],
        ["False confident answer rate", "0 on negative/unknown fixtures", "negative fixture"]
      ]
    : [
        ...shape.evaluationMetrics.map((metric) => [
          metric,
          "explicit threshold must be set before release",
          "fixture benchmark"
        ]),
        [
          "False confident answer rate",
          "0 on negative/unknown fixtures",
          "negative fixture"
        ],
        [
          "Evidence completeness",
          "100% of accepted findings include confidence, evidence and unknowns",
          "schema/test"
        ]
      ];

  return [
    "# Evaluation plan",
    "",
    "The evaluation plan is the guardrail that keeps the project better than a generic GPT-generated plan. Every capability must ship with a fixture and a threshold.",
    "",
    "## Metric thresholds",
    "",
    table(["Metric", "Target", "How to measure"], thresholds),
    "",
    "## Fixture strategy",
    "",
    table(
      ["Fixture", "Purpose", "Must prove"],
      [
        [
          "tiny fixture",
          "fast unit tests",
          "scanner/parser/retrieval behavior is deterministic"
        ],
        [
          "realistic sample input",
          "portfolio demo",
          "the killer feature works on something understandable"
        ],
        [
          "negative/unknown fixture",
          "safety and honesty",
          "the system refuses or marks uncertainty instead of inventing"
        ],
        [
          "golden ranking fixture",
          "quality benchmark",
          "expected files/symbols/results appear in top-k"
        ]
      ]
    ),
    "",
    "## Evaluation artifacts to store",
    "",
    bullet([
      "`evaluation_runs/<timestamp>/metrics.json`",
      "`evaluation_runs/<timestamp>/failures.md`",
      "`evaluation_runs/<timestamp>/sample_outputs.json`",
      "`evaluation_runs/latest.md` for human review"
    ]),
    "",
    "## Minimum verification commands",
    "",
    table(
      ["Command", "Purpose", "Expected result"],
      isRepoMri
        ? [
            ["make test", "unit and fixture tests", "all scanner, parser, graph and ranking tests pass"],
            ["make index-fixture", "fixture indexing smoke", "SQLite contains expected files, symbols and edges"],
            ["make search-fixture", "retrieval smoke", "expected file and symbol are returned in top-k"],
            ["make bug-path-fixture", "Bug Path smoke", "expected file is top-1 and expected symbol is top-3"]
          ]
        : [
            ["npm test", "unit and fixture tests", "all core evidence tests pass"],
            ["npm run benchmark", "quality benchmark", "threshold report is written"],
            ["npm run smoke", "end-to-end smoke", "one accepted and one blocked case are visible"]
          ]
    ),
    "",
    "## What counts as a failed evaluation",
    "",
    bullet([
      "a result has confidence but no evidence",
      "a negative fixture gets a confident answer instead of an unknown/block",
      "a top-k target is missed and the failure file is not updated",
      "a metric is reported without timestamp, fixture id or sample output",
      "a Cursor task ships code without updating the relevant evaluation run"
    ]),
    "",
    "## Review cadence and ownership",
    "",
    table(
      ["Moment", "Owner", "Decision"],
      [
        [
          "before coding a milestone",
          "Cursor agent reviewer",
          "confirm fixture, threshold and negative case are named"
        ],
        [
          "after implementation",
          "quality owner",
          "compare metrics with target and record failures"
        ],
        [
          "before demo/publish",
          "product owner",
          "approve known limitations and reject unsupported confident claims"
        ]
      ]
    ),
    "",
    "## Failure analysis template",
    "",
    codeBlock({
      caseId: "bug_path_empty_password",
      expected: { file: "auth.py", symbol: "login_user", test: "test_auth.py" },
      actual: { fileRank: 1, symbolRank: 2, evidenceComplete: true },
      failureType: "ranking | missing_evidence | overconfident_unknown | parser_gap",
      fix: "what code or fixture change closes this gap"
    }),
    "",
    "## Release gate",
    "",
    "A run is not ready unless tests pass, evidence coverage is visible, the thresholds above are recorded, and no confident unsupported answer is emitted."
  ].join("\n");
}

function apiContract(shape: ProductShape) {
  return [
    "# API contract sketch",
    "",
    "## Endpoints",
    "",
    bullet(shape.apiExamples),
    "",
    "## Example evidence result",
    "",
    codeBlock({
      id: "result_1",
      confidence: 0.86,
      evidence: [
        {
          sourceId: "source_1",
          path: "sample/path.ext",
          lineRange: [10, 26],
          snippet: "source-backed evidence"
        }
      ],
      unknowns: ["runtime behavior not observed yet"],
      nextActions: ["run the smallest relevant test"]
    })
  ].join("\n");
}

function demoScript(input: GenerateProjectPackInput, shape: ProductShape) {
  return [
    "# Demo script",
    "",
    "## 60 seconds",
    "",
    numbered([
      `Say: ${shape.thesis}`,
      `Show the killer feature: ${shape.killerFeature}`,
      "Show one evidence-backed result with confidence and unknowns.",
      "Show the smallest test or fixture that proves the core behavior.",
      "End with the next implementation step."
    ]),
    "",
    "## What to avoid",
    "",
    bullet([
      "Do not demo a generic chatbot.",
      "Do not hide evidence.",
      "Do not claim production readiness before the evaluation fixtures pass."
    ]),
    "",
    `Architecture judge: ${input.architectureJudge.score}/${input.architectureJudge.verdict}.`
  ].join("\n");
}

function adrFiles(shape: ProductShape): ProjectPackArtifact[] {
  return [
    {
      path: "adr/0001-evidence-first.md",
      content: [
        "# ADR 0001 - Evidence-first product",
        "",
        "Status: accepted",
        "",
        "## Decision",
        "",
        "Every important product output must cite evidence, confidence and unknowns.",
        "",
        "## Consequences",
        "",
        "- More schema discipline.",
        "- Easier debugging and review.",
        "- Less room for impressive but unsupported prose."
      ].join("\n")
    },
    {
      path: "adr/0002-deterministic-core-before-llm.md",
      content: [
        "# ADR 0002 - Deterministic core before LLM",
        "",
        "Status: accepted",
        "",
        "## Decision",
        "",
        "The core engine must work without an LLM. LLMs may explain and summarize bounded evidence, but they must not create canonical facts.",
        "",
        "## Why",
        "",
        shape.cursorRuleFocus
      ].join("\n")
    },
    {
      path: "adr/0003-storage-path.md",
      content: [
        "# ADR 0003 - Storage path",
        "",
        "Status: accepted",
        "",
        "## Decision",
        "",
        shape.storageChoice,
        "",
        "## Why",
        "",
        "The MVP needs a fast local proof before adding infrastructure."
      ].join("\n")
    },
    {
      path: "adr/0004-agent-integration-later.md",
      content: [
        "# ADR 0004 - Agent integration later",
        "",
        "Status: accepted",
        "",
        "## Decision",
        "",
        "Do not make MCP or autonomous agent integration the first milestone.",
        "",
        "## Why",
        "",
        "The product value is the evidence engine. Agent adapters should wrap stable functions after tests exist."
      ].join("\n")
    }
  ];
}

function cursorFiles(input: GenerateProjectPackInput, shape: ProductShape): ProjectPackArtifact[] {
  return [
    {
      path: ".cursor/rules/000-project-core.mdc",
      content: [
        "---",
        `description: ${input.prd.productName} core engineering rules`,
        "alwaysApply: true",
        "---",
        "",
        shape.cursorRuleFocus,
        "",
        "Non-negotiables:",
        "1. Start non-trivial tasks with acceptance checks.",
        "2. Preserve evidence, confidence and unknowns.",
        "3. Keep the first vertical slice small.",
        "4. Add tests or fixtures before broadening scope.",
        "5. Do not add infrastructure without an ADR."
      ].join("\n")
    },
    {
      path: ".cursor/rules/030-testing-quality.mdc",
      content: [
        "---",
        "description: Testing and quality rules",
        "alwaysApply: true",
        "---",
        "",
        "Every core behavior needs a fixture or test. A demo without a passing test is not a ready milestone."
      ].join("\n")
    },
    {
      path: ".cursor/plans/P00-bootstrap.md",
      content: [
        "# P00 bootstrap",
        "",
        "Read README, masterplan, architecture, ADR 0001 and this plan.",
        "",
        "Output before coding:",
        "- files to edit",
        "- acceptance checks",
        "- smallest testable vertical slice"
      ].join("\n")
    },
    {
      path: ".cursor/plans/P01-core-engine.md",
      content: [
        "# P01 core engine",
        "",
        bullet(shape.firstVerticalSlice),
        "",
        "Do not build UI before the core output is testable."
      ].join("\n")
    },
    {
      path: ".cursor/plans/P02-evaluation.md",
      content: [
        "# P02 evaluation",
        "",
        bullet(shape.evaluationMetrics),
        "",
        "Add one positive fixture and one refusal/unknown fixture."
      ].join("\n")
    },
    {
      path: "prompts/cursor/00-kickoff.md",
      content:
        "Read README.md, docs/00-masterplan-source.md, docs/01-architecture.md and adr/0001-evidence-first.md. Then propose the smallest implementation plan with acceptance checks. Do not write code yet."
    },
    {
      path: "prompts/cursor/01-build-core.md",
      content:
        "Implement the first core vertical slice. Return patch, tests, limitations and exact verification command."
    },
    {
      path: "prompts/cursor/02-review-output.md",
      content:
        "Review the current diff like a PR. Focus on unsupported facts, schema drift, missing tests, weak evidence, unsafe inputs and scope creep."
    }
  ];
}

function schemaFiles(shape: ProductShape): ProjectPackArtifact[] {
  return [
    {
      path: "schemas/core_entities.json",
      content: JSON.stringify(
        {
          entities: ["InputArtifact", "EvidenceRecord", "Finding", "Decision", "EvaluationRun"],
          requiredFindingFields: ["id", "confidence", "evidence", "unknowns", "nextActions"]
        },
        null,
        2
      )
    },
    {
      path: "schemas/api_contract.json",
      content: JSON.stringify(
        {
          endpoints: shape.apiExamples,
          responseInvariant:
            "Every result must include confidence, evidence, unknowns and nextActions."
        },
        null,
        2
      )
    }
  ];
}

function supportFiles(shape: ProductShape): ProjectPackArtifact[] {
  return [
    {
      path: "tests/README.md",
      content: [
        "# Tests",
        "",
        "Create fixtures before expanding the product surface.",
        "",
        "Required metrics:",
        "",
        bullet(shape.evaluationMetrics)
      ].join("\n")
    },
    {
      path: "sample_data/README.md",
      content:
        "Put the smallest realistic sample input here. The first test should run against this sample and prove the killer feature."
    }
  ];
}

function finalVerdict(input: GenerateProjectPackInput, readiness: ProjectPackReadiness) {
  return [
    "# Final verdict",
    "",
    `Score: ${readiness.score}/100`,
    `Verdict: ${readiness.verdict}`,
    "",
    "## What is strong",
    "",
    bullet(readiness.strengths),
    "",
    "## What is still weak",
    "",
    bullet(readiness.weaknesses.length ? readiness.weaknesses : ["none"]),
    "",
    "## Required fixes",
    "",
    bullet(readiness.requiredFixes.length ? readiness.requiredFixes : ["none"]),
    "",
    "## Architecture judge",
    "",
    `- Score: ${input.architectureJudge.score}/100`,
    `- Verdict: ${input.architectureJudge.verdict}`,
    "",
    "## Project Plan Judge",
    "",
    `- Score: ${readiness.planJudge.score}/100`,
    `- Verdict: ${readiness.planJudge.verdict}`,
    `- GPT baseline status: ${readiness.planJudge.gptBaselineComparison.status}`,
    "",
    "This pack is judged against the GPT baseline quality floor. It is ready for architecture and planning tests when it has a sharp product thesis, a concrete killer feature, Cursor files, evaluation artifacts and evidence-backed architecture."
  ].join("\n");
}

function artifactContent(artifacts: ProjectPackArtifact[], path: string) {
  return artifacts.find((artifact) => artifact.path === path)?.content ?? "";
}

function containsAll(value: string, terms: string[]) {
  const normalized = value.toLowerCase();
  return terms.every((term) => normalized.includes(term.toLowerCase()));
}

function scoreFromChecks(checks: boolean[]) {
  return Math.round(
    (checks.filter(Boolean).length / Math.max(1, checks.length)) * 100
  );
}

export function judgeProjectPlan(
  artifacts: ProjectPackArtifact[],
  input: GenerateProjectPackInput
): ProjectPlanJudge {
  const masterplanText = artifactContent(artifacts, "docs/00-masterplan-source.md");
  const roadmapText = artifactContent(artifacts, "docs/02-build-roadmap.md");
  const riskText = artifactContent(artifacts, "docs/03-risk-register.md");
  const evaluationText = artifactContent(artifacts, "docs/04-evaluation-plan.md");
  const cursorPlansText = artifacts
    .filter((artifact) => artifact.path.startsWith(".cursor/plans/"))
    .map((artifact) => artifact.content)
    .join("\n");
  const cursorRulesText = artifacts
    .filter((artifact) => artifact.path.startsWith(".cursor/rules/"))
    .map((artifact) => artifact.content)
    .join("\n");
  const allText = artifacts.map((artifact) => artifact.content).join("\n").toLowerCase();
  const isRepoMri = projectText(input).includes("repo mri") ||
    projectText(input).includes("bug path");

  const dimensionScores = {
    masterplanDepth: scoreFromChecks([
      containsAll(masterplanText, ["Product thesis", "Success criteria"]),
      containsAll(masterplanText, ["Work breakdown", "Definition of Done"]),
      containsAll(masterplanText, ["Critical risks", "Cut line for MVP"]),
      masterplanText.length > (isRepoMri ? 4500 : 3000),
      isRepoMri ? containsAll(masterplanText, ["Bug Path", "deterministic"]) : true
    ]),
    roadmapDod: scoreFromChecks([
      containsAll(roadmapText, ["Definition of Done", "Verification"]),
      containsAll(roadmapText, ["Deliverables", "Common failure mode"]),
      containsAll(roadmapText, ["Release gate", "Project Plan Judge"]),
      (roadmapText.match(/## M\d/g) ?? []).length >= (isRepoMri ? 4 : 2),
      isRepoMri ? containsAll(roadmapText, ["Recall@5", "top-1 file"]) : true
    ]),
    riskRegister: scoreFromChecks([
      containsAll(riskText, ["Trigger", "Impact", "Mitigation", "Owner"]),
      containsAll(riskText, ["Signal/Test", "critical"]),
      containsAll(riskText, ["generic chat", "Evaluation"]),
      (riskText.match(/\| P0-/g) ?? []).length >= 2,
      riskText.length > 2500
    ]),
    evaluationPlan: scoreFromChecks([
      containsAll(evaluationText, ["Metric thresholds", "Fixture strategy"]),
      containsAll(evaluationText, ["negative/unknown", "False confident"]),
      containsAll(evaluationText, ["evaluation_runs", "Failure analysis"]),
      isRepoMri ? containsAll(evaluationText, ["Recall@5", "Bug Path top-1"]) : true,
      evaluationText.length > 2500
    ]),
    cursorActionability: scoreFromChecks([
      containsAll(cursorPlansText, ["acceptance", "vertical slice"]) ||
        containsAll(cursorPlansText, ["Definition of Done", "Verification"]),
      containsAll(cursorRulesText, ["Non-negotiables", "evidence"]),
      artifacts.some((artifact) => artifact.path.startsWith("prompts/cursor/")),
      artifacts.some((artifact) => artifact.path === "schemas/api_contract.json"),
      artifacts.some((artifact) => artifact.path === "tests/README.md")
    ]),
    gptBaselineParity: scoreFromChecks([
      isRepoMri ? containsAll(allText, ["repo mri", "bug path"]) : containsAll(allText, ["killer feature", "core workflow"]),
      isRepoMri ? containsAll(allText, ["sqlite", "fts"]) : containsAll(allText, ["storage", "api"]),
      containsAll(allText, ["cursor", "adr"]),
      containsAll(allText, ["evaluation", "risk register"]),
      containsAll(allText, ["confidence", "unknowns"])
    ])
  };
  const score = Math.round(
    dimensionScores.masterplanDepth * 0.2 +
      dimensionScores.roadmapDod * 0.2 +
      dimensionScores.riskRegister * 0.17 +
      dimensionScores.evaluationPlan * 0.2 +
      dimensionScores.cursorActionability * 0.13 +
      dimensionScores.gptBaselineParity * 0.1
  );
  const requiredFixes = [
    ...(dimensionScores.masterplanDepth < 90
      ? ["Deepen masterplan with success criteria, MVP cut line, risk summary and milestone breakdown."]
      : []),
    ...(dimensionScores.roadmapDod < 90
      ? ["Add DoD, verification, deliverables and common failure modes to every roadmap milestone."]
      : []),
    ...(dimensionScores.riskRegister < 90
      ? ["Upgrade risk register with triggers, impacts, owners and concrete test/signal fields."]
      : []),
    ...(dimensionScores.evaluationPlan < 90
      ? ["Add metric thresholds, fixture types, stored evaluation artifacts and failure-analysis template."]
      : []),
    ...(dimensionScores.cursorActionability < 90
      ? ["Make Cursor plans/rules directly executable with acceptance checks and evidence constraints."]
      : []),
    ...(dimensionScores.gptBaselineParity < 90
      ? ["Restore GPT-baseline parity: Repo MRI, Bug Path, SQLite/FTS, ADRs, evaluation and evidence fields must all be present."]
      : [])
  ];
  const verdict: ProjectPlanJudge["verdict"] =
    score >= 90 && requiredFixes.length === 0
      ? "pass"
      : score >= 75
        ? "needs_review"
        : "fail";
  const status: ProjectPlanJudge["gptBaselineComparison"]["status"] =
    score >= 92 && dimensionScores.gptBaselineParity >= 90
      ? "beats_plan_floor"
      : score >= 82
        ? "near_plan_floor"
        : "below_plan_floor";

  return {
    score,
    verdict,
    dimensionScores,
    strengths: [
      ...(dimensionScores.masterplanDepth >= 90
        ? ["masterplan has product thesis, success criteria, milestone breakdown and MVP cut line"]
        : []),
      ...(dimensionScores.roadmapDod >= 90
        ? ["roadmap is implementation-ready with DoD and verification"]
        : []),
      ...(dimensionScores.evaluationPlan >= 90
        ? ["evaluation plan includes thresholds, fixtures and failure analysis"]
        : []),
      ...(dimensionScores.gptBaselineParity >= 90
        ? ["plan preserves Repo MRI / Bug Path / evidence-first baseline concepts"]
        : [])
    ],
    weaknesses: requiredFixes.length
      ? requiredFixes
      : ["starter code may still lag the GPT folder if this run remains plan-only"],
    requiredFixes,
    gptBaselineComparison: {
      status,
      betterThanGpt: [
        "has an explicit Project Plan Judge with dimension scores",
        "connects roadmap release gate to measurable plan score",
        "risk register is review-oriented with trigger, owner and signal/test"
      ],
      stillBehindGpt: [
        "GPT baseline includes runnable starter code and sample repo; this exporter still focuses on plan artifacts unless starter code generation is added",
        "GPT baseline includes diagram images; this exporter currently emits textual architecture and schemas"
      ]
    }
  };
}

function projectPlanJudgeToMarkdown(judge: ProjectPlanJudge) {
  return [
    "# Project Plan Judge",
    "",
    `Score: ${judge.score}/100`,
    `Verdict: ${judge.verdict}`,
    `GPT baseline status: ${judge.gptBaselineComparison.status}`,
    "",
    "## Dimension Scores",
    "",
    table(
      ["Dimension", "Score"],
      Object.entries(judge.dimensionScores).map(([name, score]) => [
        name,
        String(score)
      ])
    ),
    "",
    "## Strengths",
    "",
    bullet(judge.strengths.length ? judge.strengths : ["none"]),
    "",
    "## Weaknesses",
    "",
    bullet(judge.weaknesses.length ? judge.weaknesses : ["none"]),
    "",
    "## Required Fixes",
    "",
    bullet(judge.requiredFixes.length ? judge.requiredFixes : ["none"]),
    "",
    "## Better Than GPT Baseline",
    "",
    bullet(judge.gptBaselineComparison.betterThanGpt),
    "",
    "## Still Behind GPT Baseline",
    "",
    bullet(judge.gptBaselineComparison.stillBehindGpt)
  ].join("\n");
}

function judgeArtifacts(artifacts: ProjectPackArtifact[], input: GenerateProjectPackInput): ProjectPackReadiness {
  const paths = new Set(artifacts.map((artifact) => artifact.path));
  const missing = REQUIRED_ARTIFACTS.filter((path) => !paths.has(path));
  const planJudge = judgeProjectPlan(artifacts, input);
  const requiredArtifactCoverage =
    (REQUIRED_ARTIFACTS.length - missing.length) / REQUIRED_ARTIFACTS.length;
  const hasCursor = artifacts.some((artifact) => artifact.path.startsWith(".cursor/rules/")) &&
    artifacts.some((artifact) => artifact.path.startsWith(".cursor/plans/")) &&
    artifacts.some((artifact) => artifact.path.startsWith("prompts/cursor/"));
  const hasStarterHints =
    artifacts.some((artifact) => artifact.path.startsWith("tests/")) &&
    artifacts.some((artifact) => artifact.path.startsWith("sample_data/"));
  const hasStarterCode =
    artifacts.some((artifact) => artifact.path.startsWith("services/")) ||
    artifacts.some((artifact) => artifact.path === "Makefile") ||
    artifacts.some((artifact) => artifact.path === "package.json");
  const score = Math.min(
    100,
    Math.round(
      requiredArtifactCoverage * 55 +
        (hasCursor ? 15 : 0) +
        (hasStarterHints ? 5 : 0) +
        (hasStarterCode ? 10 : 0) +
        (input.architectureJudge.score >= 90 ? 15 : 0) +
        (input.prd.status === "ready" && input.architecture.status === "ready" ? 5 : 0) +
        (planJudge.score >= 90 ? 10 : Math.round(planJudge.score / 12))
    )
  );
  const requiredFixes = [
    ...missing.map((path) => `Generate missing artifact: ${path}`),
    ...(input.architectureJudge.score < 90
      ? ["Improve architecture judge score to at least 90."]
      : []),
    ...(!hasCursor ? ["Generate Cursor rules, plans and prompts."] : []),
    ...(!hasStarterHints ? ["Generate sample data and tests guidance."] : []),
    ...(!hasStarterCode ? ["Generate runnable starter code or mark this run as architecture-plan-only."] : []),
    ...planJudge.requiredFixes
  ];

  return {
    score,
    verdict: score >= 90 && requiredFixes.length === 0 ? "pass" : score >= 70 ? "needs_review" : "fail",
    strengths: [
      "project pack contains baseline-level documentation artifacts",
      "Cursor rules, plans and prompts are generated",
      "architecture and planning artifacts are linked to evidence-backed PRD"
    ],
    weaknesses: [
      ...(hasStarterHints
        ? []
        : ["starter-code generator is not implemented yet; tests are guidance-only"]),
      ...(hasStarterCode
        ? []
        : ["runnable starter code is not generated yet; this pack is architecture-plan-ready, not full baseline-ready"]),
      ...(missing.length ? [`missing required artifacts: ${missing.join(", ")}`] : [])
    ],
    requiredFixes,
    artifactCount: artifacts.length,
    requiredArtifactCoverage,
    cursorReady: hasCursor,
    starterCodeReady: hasStarterCode,
    planJudge
  };
}

export function generateProjectPack(input: GenerateProjectPackInput): ProjectPackExport {
  const shape = productShape(input);
  const coreArtifacts: ProjectPackArtifact[] = [
    { path: "README.md", content: readme(input, shape) },
    { path: "docs/00-masterplan-source.md", content: masterplan(input, shape) },
    { path: "docs/01-architecture.md", content: architectureDoc(input, shape) },
    { path: "docs/02-build-roadmap.md", content: roadmap(shape) },
    { path: "docs/03-risk-register.md", content: riskRegister(input, shape) },
    { path: "docs/04-evaluation-plan.md", content: evaluationPlan(shape) },
    { path: "docs/05-api-contract.md", content: apiContract(shape) },
    { path: "docs/06-demo-script.md", content: demoScript(input, shape) },
    { path: "docs/07-research-digest.md", content: researchDigest(input.brief) },
    ...adrFiles(shape),
    ...cursorFiles(input, shape),
    ...schemaFiles(shape),
    ...supportFiles(shape)
  ];
  const preliminaryPlanJudge = judgeProjectPlan(coreArtifacts, input);
  const artifactsWithoutVerdict: ProjectPackArtifact[] = [
    ...coreArtifacts,
    {
      path: "docs/08-project-plan-judge.md",
      content: projectPlanJudgeToMarkdown(preliminaryPlanJudge)
    }
  ];
  const preliminaryReadiness = judgeArtifacts(
    [
      ...artifactsWithoutVerdict,
      {
        path: "10_final_verdict.md",
        content: ""
      }
    ],
    input
  );
  const artifacts = [
    ...artifactsWithoutVerdict,
    {
      path: "10_final_verdict.md",
      content: finalVerdict(input, preliminaryReadiness)
    }
  ];
  const readiness = judgeArtifacts(artifacts, input);

  return { artifacts, readiness };
}

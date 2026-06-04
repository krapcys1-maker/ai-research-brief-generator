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

function repoMriStarterCodeFiles(shape: ProductShape): ProjectPackArtifact[] {
  if (shape.coreModuleName !== "repo_mri_indexer") {
    return [];
  }

  return [
    {
      path: "Makefile",
      content: [
        ".PHONY: test index-fixture search-fixture bug-path-fixture clean",
        "",
        "DB=.repo_mri/repo_mri.sqlite",
        "",
        "test:",
        "\tcd services/indexer && python -m pytest",
        "",
        "index-fixture:",
        "\tcd services/indexer && python -m repo_mri_indexer.cli index ../../sample_repo --db ../../$(DB)",
        "",
        "search-fixture:",
        "\tcd services/indexer && python -m repo_mri_indexer.cli search login_user --db ../../$(DB)",
        "",
        "bug-path-fixture:",
        "\tcd services/indexer && python -m repo_mri_indexer.cli bug-path \"ValueError in auth.py:7 when login_user gets empty password\" --db ../../$(DB)",
        "",
        "clean:",
        "\trm -rf .repo_mri services/indexer/.pytest_cache services/indexer/repo_mri_indexer/__pycache__ services/indexer/tests/__pycache__"
      ].join("\n")
    },
    {
      path: "sample_repo/auth.py",
      content: [
        "class User:",
        "    def __init__(self, email: str):",
        "        self.email = email",
        "",
        "",
        "def login_user(email: str, password: str) -> User:",
        "    validate_password(password)",
        "    return User(email)",
        "",
        "",
        "def validate_password(password: str) -> bool:",
        "    if not password:",
        "        raise ValueError(\"empty password\")",
        "    return True"
      ].join("\n")
    },
    {
      path: "sample_repo/web.ts",
      content: [
        "import { postJson } from './http';",
        "",
        "export async function submitLogin(email: string, password: string) {",
        "  return postJson('/login', { email, password });",
        "}",
        "",
        "export function renderLoginError(message: string) {",
        "  return `Login failed: ${message}`;",
        "}"
      ].join("\n")
    },
    {
      path: "sample_repo/tests/test_auth.py",
      content: [
        "import pytest",
        "from auth import login_user",
        "",
        "",
        "def test_login_empty_password():",
        "    with pytest.raises(ValueError):",
        "        login_user('ada@example.com', '')"
      ].join("\n")
    },
    {
      path: "schemas/sql/001_core.sql",
      content: [
        "CREATE TABLE repositories (",
        "  id INTEGER PRIMARY KEY AUTOINCREMENT,",
        "  root_path TEXT NOT NULL,",
        "  name TEXT NOT NULL,",
        "  indexed_at TEXT NOT NULL",
        ");",
        "",
        "CREATE TABLE files (",
        "  id INTEGER PRIMARY KEY AUTOINCREMENT,",
        "  repo_id INTEGER NOT NULL,",
        "  path TEXT NOT NULL,",
        "  language TEXT NOT NULL,",
        "  sha256 TEXT NOT NULL,",
        "  loc INTEGER NOT NULL",
        ");",
        "",
        "CREATE TABLE symbols (",
        "  id INTEGER PRIMARY KEY AUTOINCREMENT,",
        "  repo_id INTEGER NOT NULL,",
        "  file_id INTEGER NOT NULL,",
        "  name TEXT NOT NULL,",
        "  kind TEXT NOT NULL,",
        "  signature TEXT,",
        "  start_line INTEGER NOT NULL,",
        "  end_line INTEGER NOT NULL,",
        "  confidence REAL NOT NULL DEFAULT 1.0",
        ");",
        "",
        "CREATE TABLE edges (",
        "  id INTEGER PRIMARY KEY AUTOINCREMENT,",
        "  repo_id INTEGER NOT NULL,",
        "  source_type TEXT NOT NULL,",
        "  source_id INTEGER NOT NULL,",
        "  target_type TEXT NOT NULL,",
        "  target_id INTEGER NOT NULL,",
        "  kind TEXT NOT NULL,",
        "  confidence REAL NOT NULL,",
        "  evidence TEXT",
        ");"
      ].join("\n")
    },
    {
      path: "services/indexer/pyproject.toml",
      content: [
        "[project]",
        "name = \"repo-mri-indexer\"",
        "version = \"0.1.0\"",
        "description = \"Minimal Repo MRI evidence-first indexer starter\"",
        "requires-python = \">=3.11\"",
        "dependencies = []",
        "",
        "[project.optional-dependencies]",
        "dev = [\"pytest>=8.0\"]",
        "",
        "[project.scripts]",
        "repo-mri = \"repo_mri_indexer.cli:main\"",
        "",
        "[tool.pytest.ini_options]",
        "testpaths = [\"tests\"]",
        "pythonpath = [\".\"]"
      ].join("\n")
    },
    {
      path: "services/indexer/repo_mri_indexer/__init__.py",
      content: "__version__ = \"0.1.0\"\n"
    },
    {
      path: "services/indexer/repo_mri_indexer/scanner.py",
      content: [
        "from __future__ import annotations",
        "",
        "from dataclasses import dataclass",
        "from pathlib import Path",
        "import hashlib",
        "",
        "IGNORE_DIRS = {",
        "    '.git', '.hg', '.svn', 'node_modules', 'dist', 'build', '.next', '.venv', 'venv',",
        "    '__pycache__', '.pytest_cache', '.mypy_cache', '.turbo', 'coverage', '.repo_mri'",
        "}",
        "IGNORE_FILES = {'.env', '.env.local', '.env.production', 'id_rsa', 'id_ed25519'}",
        "EXT_LANGUAGE = {",
        "    '.py': 'python',",
        "    '.js': 'javascript',",
        "    '.jsx': 'javascript',",
        "    '.ts': 'typescript',",
        "    '.tsx': 'typescript',",
        "    '.md': 'markdown',",
        "    '.json': 'json',",
        "    '.yaml': 'yaml',",
        "    '.yml': 'yaml',",
        "}",
        "",
        "",
        "@dataclass(frozen=True)",
        "class ScannedFile:",
        "    path: Path",
        "    rel_path: str",
        "    language: str",
        "    sha256: str",
        "    loc: int",
        "    content: str",
        "",
        "",
        "def is_binary(data: bytes) -> bool:",
        "    if b'\\0' in data:",
        "        return True",
        "    sample = data[:1024]",
        "    if not sample:",
        "        return False",
        "    text_chars = sum(32 <= b <= 126 or b in b'\\n\\r\\t' for b in sample)",
        "    return text_chars / len(sample) < 0.75",
        "",
        "",
        "def scan_repo(root: Path) -> list[ScannedFile]:",
        "    root = root.resolve()",
        "    if not root.exists() or not root.is_dir():",
        "        raise ValueError(f'Repository path does not exist or is not a directory: {root}')",
        "",
        "    out: list[ScannedFile] = []",
        "    for path in sorted(root.rglob('*')):",
        "        rel_parts = path.relative_to(root).parts",
        "        if any(part in IGNORE_DIRS for part in rel_parts):",
        "            continue",
        "        if path.is_dir():",
        "            continue",
        "        if path.name in IGNORE_FILES:",
        "            continue",
        "        lang = EXT_LANGUAGE.get(path.suffix.lower())",
        "        if not lang:",
        "            continue",
        "        raw = path.read_bytes()",
        "        if is_binary(raw):",
        "            continue",
        "        try:",
        "            content = raw.decode('utf-8')",
        "        except UnicodeDecodeError:",
        "            content = raw.decode('utf-8', errors='replace')",
        "        out.append(",
        "            ScannedFile(",
        "                path=path,",
        "                rel_path=path.relative_to(root).as_posix(),",
        "                language=lang,",
        "                sha256=hashlib.sha256(raw).hexdigest(),",
        "                loc=len(content.splitlines()),",
        "                content=content,",
        "            )",
        "        )",
        "    return out"
      ].join("\n")
    },
    {
      path: "services/indexer/repo_mri_indexer/parsers.py",
      content: [
        "from __future__ import annotations",
        "",
        "from dataclasses import dataclass, field",
        "import ast",
        "import re",
        "",
        "",
        "@dataclass",
        "class Symbol:",
        "    name: str",
        "    kind: str",
        "    signature: str | None",
        "    start_line: int",
        "    end_line: int",
        "    confidence: float = 1.0",
        "    calls: list[str] = field(default_factory=list)",
        "",
        "",
        "@dataclass",
        "class ParsedFile:",
        "    symbols: list[Symbol]",
        "    imports: list[str]",
        "",
        "",
        "def parse_file(language: str, content: str) -> ParsedFile:",
        "    if language == 'python':",
        "        return parse_python(content)",
        "    if language in {'javascript', 'typescript'}:",
        "        return parse_js_ts(content)",
        "    return ParsedFile(symbols=[], imports=[])",
        "",
        "",
        "def parse_python(content: str) -> ParsedFile:",
        "    try:",
        "        tree = ast.parse(content)",
        "    except SyntaxError:",
        "        return ParsedFile(symbols=[], imports=[])",
        "",
        "    symbols: list[Symbol] = []",
        "    imports: list[str] = []",
        "    parents: dict[ast.AST, ast.AST] = {}",
        "    for parent in ast.walk(tree):",
        "        for child in ast.iter_child_nodes(parent):",
        "            parents[child] = parent",
        "",
        "    for node in ast.walk(tree):",
        "        if isinstance(node, ast.Import):",
        "            imports.extend(alias.name for alias in node.names)",
        "        if isinstance(node, ast.ImportFrom):",
        "            imports.append(node.module or '')",
        "        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):",
        "            kind = 'class' if isinstance(node, ast.ClassDef) else 'function'",
        "            if isinstance(parents.get(node), ast.ClassDef) and kind == 'function':",
        "                kind = 'method'",
        "            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):",
        "                args = [arg.arg for arg in node.args.args]",
        "                signature = f\"{node.name}({', '.join(args)})\"",
        "            else:",
        "                signature = f'class {node.name}'",
        "            calls: list[str] = []",
        "            for sub in ast.walk(node):",
        "                if isinstance(sub, ast.Call):",
        "                    if isinstance(sub.func, ast.Name):",
        "                        calls.append(sub.func.id)",
        "                    elif isinstance(sub.func, ast.Attribute):",
        "                        calls.append(sub.func.attr)",
        "            symbols.append(Symbol(",
        "                name=node.name,",
        "                kind=kind,",
        "                signature=signature,",
        "                start_line=getattr(node, 'lineno', 1),",
        "                end_line=getattr(node, 'end_lineno', getattr(node, 'lineno', 1)),",
        "                confidence=1.0,",
        "                calls=sorted(set(calls)),",
        "            ))",
        "    return ParsedFile(symbols=symbols, imports=sorted(set(i for i in imports if i)))",
        "",
        "",
        "IMPORT_RE = re.compile(r\"(?:import\\s+[^'\\\"]+from\\s+['\\\"]([^'\\\"]+)['\\\"]|import\\s+['\\\"]([^'\\\"]+)['\\\"]|require\\(['\\\"]([^'\\\"]+)['\\\"]\\))\")",
        "FUNC_RE = re.compile(r\"(?:export\\s+)?(?:async\\s+)?function\\s+([A-Za-z_$][\\w$]*)\\s*\\(([^)]*)\\)|(?:export\\s+)?class\\s+([A-Za-z_$][\\w$]*)|(?:export\\s+)?const\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*(?:async\\s*)?\\(?[^=;]*\\)?\\s*=>\")",
        "CALL_RE = re.compile(r\"\\b([A-Za-z_$][\\w$]*)\\s*\\(\")",
        "JS_KEYWORDS = {'if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'console'}",
        "",
        "",
        "def parse_js_ts(content: str) -> ParsedFile:",
        "    lines = content.splitlines()",
        "    imports: list[str] = []",
        "    for match in IMPORT_RE.finditer(content):",
        "        imports.append(next(group for group in match.groups() if group))",
        "",
        "    symbols: list[Symbol] = []",
        "    for match in FUNC_RE.finditer(content):",
        "        name = match.group(1) or match.group(3) or match.group(4)",
        "        if not name:",
        "            continue",
        "        start = content[:match.start()].count('\\n') + 1",
        "        end = min(len(lines), start + 80)",
        "        snippet = '\\n'.join(lines[start - 1:end])",
        "        calls = sorted({c for c in CALL_RE.findall(snippet) if c not in JS_KEYWORDS and c != name})",
        "        kind = 'class' if match.group(3) else 'function'",
        "        symbols.append(Symbol(name=name, kind=kind, signature=name, start_line=start, end_line=end, confidence=0.55, calls=calls))",
        "    return ParsedFile(symbols=symbols, imports=sorted(set(imports)))"
      ].join("\n")
    },
    {
      path: "services/indexer/repo_mri_indexer/db.py",
      content: [
        "from __future__ import annotations",
        "",
        "from pathlib import Path",
        "import sqlite3",
        "from datetime import datetime, timezone",
        "from typing import Iterable",
        "",
        "from .scanner import ScannedFile",
        "from .parsers import Symbol",
        "",
        "",
        "SCHEMA = \"\"\"",
        "PRAGMA foreign_keys = ON;",
        "CREATE TABLE IF NOT EXISTS repositories (",
        "  id INTEGER PRIMARY KEY AUTOINCREMENT,",
        "  root_path TEXT NOT NULL,",
        "  name TEXT NOT NULL,",
        "  indexed_at TEXT NOT NULL",
        ");",
        "CREATE TABLE IF NOT EXISTS files (",
        "  id INTEGER PRIMARY KEY AUTOINCREMENT,",
        "  repo_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,",
        "  path TEXT NOT NULL,",
        "  language TEXT NOT NULL,",
        "  sha256 TEXT NOT NULL,",
        "  loc INTEGER NOT NULL,",
        "  UNIQUE(repo_id, path)",
        ");",
        "CREATE TABLE IF NOT EXISTS symbols (",
        "  id INTEGER PRIMARY KEY AUTOINCREMENT,",
        "  repo_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,",
        "  file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,",
        "  name TEXT NOT NULL,",
        "  kind TEXT NOT NULL,",
        "  signature TEXT,",
        "  start_line INTEGER NOT NULL,",
        "  end_line INTEGER NOT NULL,",
        "  confidence REAL NOT NULL DEFAULT 1.0",
        ");",
        "CREATE TABLE IF NOT EXISTS imports (",
        "  id INTEGER PRIMARY KEY AUTOINCREMENT,",
        "  repo_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,",
        "  file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,",
        "  module TEXT NOT NULL",
        ");",
        "CREATE TABLE IF NOT EXISTS chunks (",
        "  id INTEGER PRIMARY KEY AUTOINCREMENT,",
        "  repo_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,",
        "  file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,",
        "  symbol_id INTEGER REFERENCES symbols(id) ON DELETE SET NULL,",
        "  chunk_type TEXT NOT NULL,",
        "  content TEXT NOT NULL,",
        "  start_line INTEGER NOT NULL,",
        "  end_line INTEGER NOT NULL",
        ");",
        "CREATE TABLE IF NOT EXISTS edges (",
        "  id INTEGER PRIMARY KEY AUTOINCREMENT,",
        "  repo_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,",
        "  source_type TEXT NOT NULL,",
        "  source_id INTEGER NOT NULL,",
        "  target_type TEXT NOT NULL,",
        "  target_id INTEGER NOT NULL,",
        "  kind TEXT NOT NULL,",
        "  confidence REAL NOT NULL,",
        "  evidence TEXT",
        ");",
        "CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(content, path, symbol_name, tokenize='porter');",
        "\"\"\"",
        "",
        "",
        "def connect(db_path: Path) -> sqlite3.Connection:",
        "    db_path.parent.mkdir(parents=True, exist_ok=True)",
        "    conn = sqlite3.connect(db_path)",
        "    conn.row_factory = sqlite3.Row",
        "    conn.executescript(SCHEMA)",
        "    return conn",
        "",
        "",
        "def reset_repo(conn: sqlite3.Connection, root_path: Path, name: str) -> int:",
        "    root = str(root_path.resolve())",
        "    row = conn.execute('SELECT id FROM repositories WHERE root_path = ?', (root,)).fetchone()",
        "    if row:",
        "        repo_id = int(row['id'])",
        "        conn.execute('DELETE FROM chunks_fts')",
        "        for table in ['edges', 'chunks', 'imports', 'symbols', 'files']:",
        "            conn.execute(f'DELETE FROM {table} WHERE repo_id = ?', (repo_id,))",
        "        conn.execute('UPDATE repositories SET indexed_at = ? WHERE id = ?', (datetime.now(timezone.utc).isoformat(), repo_id))",
        "    else:",
        "        cur = conn.execute(",
        "            'INSERT INTO repositories(root_path, name, indexed_at) VALUES (?, ?, ?)',",
        "            (root, name, datetime.now(timezone.utc).isoformat()),",
        "        )",
        "        repo_id = int(cur.lastrowid)",
        "    return repo_id",
        "",
        "",
        "def add_file(conn: sqlite3.Connection, repo_id: int, scanned: ScannedFile) -> int:",
        "    cur = conn.execute(",
        "        'INSERT INTO files(repo_id, path, language, sha256, loc) VALUES (?, ?, ?, ?, ?)',",
        "        (repo_id, scanned.rel_path, scanned.language, scanned.sha256, scanned.loc),",
        "    )",
        "    return int(cur.lastrowid)",
        "",
        "",
        "def add_symbol(conn: sqlite3.Connection, repo_id: int, file_id: int, symbol: Symbol) -> int:",
        "    cur = conn.execute(",
        "        'INSERT INTO symbols(repo_id, file_id, name, kind, signature, start_line, end_line, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',",
        "        (repo_id, file_id, symbol.name, symbol.kind, symbol.signature, symbol.start_line, symbol.end_line, symbol.confidence),",
        "    )",
        "    symbol_id = int(cur.lastrowid)",
        "    conn.execute(",
        "        \"INSERT INTO edges(repo_id, source_type, source_id, target_type, target_id, kind, confidence, evidence) VALUES (?, 'file', ?, 'symbol', ?, 'DEFINES', ?, ?)\",",
        "        (repo_id, file_id, symbol_id, symbol.confidence, symbol.signature or symbol.name),",
        "    )",
        "    return symbol_id",
        "",
        "",
        "def add_chunk(conn: sqlite3.Connection, repo_id: int, file_id: int, symbol_id: int | None, chunk_type: str, content: str, path: str, symbol_name: str | None, start_line: int, end_line: int) -> int:",
        "    cur = conn.execute(",
        "        'INSERT INTO chunks(repo_id, file_id, symbol_id, chunk_type, content, start_line, end_line) VALUES (?, ?, ?, ?, ?, ?, ?)',",
        "        (repo_id, file_id, symbol_id, chunk_type, content, start_line, end_line),",
        "    )",
        "    conn.execute(",
        "        'INSERT INTO chunks_fts(rowid, content, path, symbol_name) VALUES (?, ?, ?, ?)',",
        "        (int(cur.lastrowid), content, path, symbol_name or ''),",
        "    )",
        "    return int(cur.lastrowid)",
        "",
        "",
        "def add_imports(conn: sqlite3.Connection, repo_id: int, file_id: int, modules: Iterable[str]) -> None:",
        "    for module in modules:",
        "        conn.execute('INSERT INTO imports(repo_id, file_id, module) VALUES (?, ?, ?)', (repo_id, file_id, module))",
        "",
        "",
        "def resolve_calls(conn: sqlite3.Connection, repo_id: int, symbol_calls: dict[int, list[str]]) -> None:",
        "    by_name: dict[str, list[int]] = {}",
        "    for row in conn.execute('SELECT id, name FROM symbols WHERE repo_id = ?', (repo_id,)):",
        "        by_name.setdefault(row['name'], []).append(int(row['id']))",
        "    for source_id, calls in symbol_calls.items():",
        "        for name in calls:",
        "            for target_id in by_name.get(name, []):",
        "                if target_id == source_id:",
        "                    continue",
        "                conn.execute(",
        "                    \"INSERT INTO edges(repo_id, source_type, source_id, target_type, target_id, kind, confidence, evidence) VALUES (?, 'symbol', ?, 'symbol', ?, 'CALLS', 0.35, ?)\",",
        "                    (repo_id, source_id, target_id, f'heuristic call name match: {name}'),",
        "                )",
        "",
        "",
        "def stats(conn: sqlite3.Connection) -> dict[str, int]:",
        "    return {table: int(conn.execute(f'SELECT COUNT(*) AS c FROM {table}').fetchone()['c']) for table in ['repositories', 'files', 'symbols', 'chunks', 'edges', 'imports']}"
      ].join("\n")
    },
    {
      path: "services/indexer/repo_mri_indexer/indexer.py",
      content: [
        "from __future__ import annotations",
        "",
        "from pathlib import Path",
        "from .scanner import scan_repo",
        "from .parsers import parse_file",
        "from .db import connect, reset_repo, add_file, add_symbol, add_chunk, add_imports, resolve_calls",
        "",
        "",
        "def index_repo(repo_path: Path, db_path: Path) -> dict[str, int]:",
        "    conn = connect(db_path)",
        "    try:",
        "        repo_id = reset_repo(conn, repo_path, repo_path.resolve().name)",
        "        symbol_calls: dict[int, list[str]] = {}",
        "        for scanned in scan_repo(repo_path):",
        "            file_id = add_file(conn, repo_id, scanned)",
        "            parsed = parse_file(scanned.language, scanned.content)",
        "            add_imports(conn, repo_id, file_id, parsed.imports)",
        "            lines = scanned.content.splitlines()",
        "            add_chunk(conn, repo_id, file_id, None, 'file', scanned.content[:20000], scanned.rel_path, None, 1, max(1, scanned.loc))",
        "            for symbol in parsed.symbols:",
        "                symbol_id = add_symbol(conn, repo_id, file_id, symbol)",
        "                symbol_calls[symbol_id] = symbol.calls",
        "                snippet = '\\n'.join(lines[max(0, symbol.start_line - 1):symbol.end_line])",
        "                add_chunk(conn, repo_id, file_id, symbol_id, 'symbol', snippet, scanned.rel_path, symbol.name, symbol.start_line, symbol.end_line)",
        "        resolve_calls(conn, repo_id, symbol_calls)",
        "        conn.commit()",
        "        from .db import stats",
        "        result = stats(conn)",
        "        result['repo_id'] = repo_id",
        "        return result",
        "    finally:",
        "        conn.close()"
      ].join("\n")
    },
    {
      path: "services/indexer/repo_mri_indexer/search.py",
      content: [
        "from __future__ import annotations",
        "",
        "from pathlib import Path",
        "import sqlite3",
        "from .db import connect",
        "",
        "",
        "def search(db_path: Path, query: str, limit: int = 10) -> list[dict]:",
        "    conn = connect(db_path)",
        "    try:",
        "        rows = conn.execute(",
        "            \"\"\"",
        "            SELECT c.id AS chunk_id, c.chunk_type, c.content, c.start_line, c.end_line,",
        "                   f.path, s.name AS symbol_name, s.kind AS symbol_kind,",
        "                   bm25(chunks_fts) AS score",
        "            FROM chunks_fts",
        "            JOIN chunks c ON c.id = chunks_fts.rowid",
        "            JOIN files f ON f.id = c.file_id",
        "            LEFT JOIN symbols s ON s.id = c.symbol_id",
        "            WHERE chunks_fts MATCH ?",
        "            ORDER BY score",
        "            LIMIT ?",
        "            \"\"\"",
        "            , (query, limit),",
        "        ).fetchall()",
        "        return [dict(row) | {'evidence': row['content'][:500]} for row in rows]",
        "    except sqlite3.OperationalError:",
        "        like = f'%{query}%'",
        "        rows = conn.execute(",
        "            \"\"\"",
        "            SELECT c.id AS chunk_id, c.chunk_type, c.content, c.start_line, c.end_line,",
        "                   f.path, s.name AS symbol_name, s.kind AS symbol_kind, 0.0 AS score",
        "            FROM chunks c",
        "            JOIN files f ON f.id = c.file_id",
        "            LEFT JOIN symbols s ON s.id = c.symbol_id",
        "            WHERE c.content LIKE ? OR f.path LIKE ? OR s.name LIKE ?",
        "            LIMIT ?",
        "            \"\"\"",
        "            , (like, like, like, limit),",
        "        ).fetchall()",
        "        return [dict(row) | {'evidence': row['content'][:500]} for row in rows]",
        "    finally:",
        "        conn.close()"
      ].join("\n")
    },
    {
      path: "services/indexer/repo_mri_indexer/bug_path.py",
      content: [
        "from __future__ import annotations",
        "",
        "from pathlib import Path",
        "import re",
        "from .db import connect",
        "",
        "FILE_RE = re.compile(r'([\\w./-]+\\.(?:py|js|jsx|ts|tsx))(?::(\\d+))?')",
        "WORD_RE = re.compile(r'[A-Za-z_][A-Za-z0-9_]{2,}')",
        "",
        "",
        "def extract_terms(issue: str) -> tuple[list[tuple[str, int | None]], list[str]]:",
        "    files = [(match.group(1), int(match.group(2)) if match.group(2) else None) for match in FILE_RE.finditer(issue)]",
        "    stop = {'the', 'and', 'for', 'with', 'when', 'from', 'into', 'line', 'error', 'exception', 'attributeerror'}",
        "    terms = [word for word in WORD_RE.findall(issue) if word.lower() not in stop]",
        "    return files, sorted(set(terms), key=str.lower)",
        "",
        "",
        "def bug_path(db_path: Path, issue: str, limit: int = 8) -> dict:",
        "    conn = connect(db_path)",
        "    files, terms = extract_terms(issue)",
        "    candidates: dict[tuple[str, str | None], dict] = {}",
        "",
        "    def add(path: str, symbol: str | None, points: float, evidence: str, start_line: int | None = None, end_line: int | None = None):",
        "        key = (path, symbol)",
        "        item = candidates.setdefault(key, {",
        "            'path': path,",
        "            'symbol': symbol,",
        "            'score': 0.0,",
        "            'confidence': 0.0,",
        "            'line_range': [start_line, end_line] if start_line else None,",
        "            'evidence': [],",
        "            'next_actions': [],",
        "        })",
        "        item['score'] += points",
        "        item['confidence'] = min(0.99, item['score'] / 10.0)",
        "        item['evidence'].append(evidence)",
        "        if start_line and not item['line_range']:",
        "            item['line_range'] = [start_line, end_line or start_line]",
        "",
        "    for file_hint, line in files:",
        "        basename = file_hint.split('/')[-1]",
        "        rows = conn.execute('SELECT id, path FROM files WHERE path = ? OR path LIKE ?', (file_hint, f'%/{basename}')).fetchall()",
        "        for row in rows:",
        "            add(row['path'], None, 4.0, f'direct file mention: {file_hint}', line, line)",
        "            sym_rows = conn.execute(",
        "                'SELECT name, start_line, end_line FROM symbols WHERE file_id = ? AND (? IS NULL OR (start_line <= ? AND end_line >= ?))',",
        "                (row['id'], line, line, line),",
        "            ).fetchall()",
        "            for sym in sym_rows:",
        "                add(row['path'], sym['name'], 4.0, f\"line falls inside symbol: {sym['name']}\", sym['start_line'], sym['end_line'])",
        "",
        "    for term in terms:",
        "        like = f'%{term}%'",
        "        for row in conn.execute(",
        "            \"\"\"",
        "            SELECT f.path, s.name, s.start_line, s.end_line",
        "            FROM symbols s JOIN files f ON f.id = s.file_id",
        "            WHERE s.name LIKE ? OR s.signature LIKE ?",
        "            LIMIT 20",
        "            \"\"\"",
        "            , (like, like),",
        "        ):",
        "            exact = row['name'].lower() == term.lower()",
        "            points = 6.0 if exact else 2.0",
        "            reason = 'exact symbol match' if exact else 'symbol/name match'",
        "            add(row['path'], row['name'], points, f'{reason}: {term}', row['start_line'], row['end_line'])",
        "",
        "    for term in terms[:12]:",
        "        like = f'%{term}%'",
        "        for row in conn.execute(",
        "            \"\"\"",
        "            SELECT f.path, s.name, c.start_line, c.end_line",
        "            FROM chunks c",
        "            JOIN files f ON f.id = c.file_id",
        "            LEFT JOIN symbols s ON s.id = c.symbol_id",
        "            WHERE c.content LIKE ?",
        "            LIMIT 10",
        "            \"\"\"",
        "            , (like,),",
        "        ):",
        "            add(row['path'], row['name'], 0.6, f'content match: {term}', row['start_line'], row['end_line'])",
        "",
        "    ranked = sorted(candidates.values(), key=lambda item: item['score'], reverse=True)[:limit]",
        "    for item in ranked:",
        "        file_name = item['path'].split('/')[-1]",
        "        item['next_actions'] = [",
        "            f\"open {item['path']}\" + (f\":{item['line_range'][0]}\" if item.get('line_range') else ''),",
        "            f\"search tests for {item['symbol'] or file_name}\",",
        "            'verify with the smallest relevant test before editing',",
        "        ]",
        "    return {'issue': issue, 'parsed_files': files, 'terms': terms, 'candidates': ranked}"
      ].join("\n")
    },
    {
      path: "services/indexer/repo_mri_indexer/cli.py",
      content: [
        "from __future__ import annotations",
        "",
        "from pathlib import Path",
        "import argparse",
        "import json",
        "from .indexer import index_repo",
        "from .db import connect, stats as db_stats",
        "from .search import search as run_search",
        "from .bug_path import bug_path as run_bug_path",
        "",
        "",
        "def main(argv: list[str] | None = None) -> None:",
        "    parser = argparse.ArgumentParser(prog='repo-mri')",
        "    sub = parser.add_subparsers(dest='cmd', required=True)",
        "",
        "    p_index = sub.add_parser('index', help='Index a repository')",
        "    p_index.add_argument('repo', type=Path)",
        "    p_index.add_argument('--db', type=Path, default=Path('.repo_mri/repo_mri.sqlite'))",
        "",
        "    p_stats = sub.add_parser('stats', help='Print database stats')",
        "    p_stats.add_argument('--db', type=Path, default=Path('.repo_mri/repo_mri.sqlite'))",
        "",
        "    p_search = sub.add_parser('search', help='Search indexed code')",
        "    p_search.add_argument('query')",
        "    p_search.add_argument('--db', type=Path, default=Path('.repo_mri/repo_mri.sqlite'))",
        "    p_search.add_argument('--limit', type=int, default=10)",
        "",
        "    p_bug = sub.add_parser('bug-path', help='Localize an issue or stacktrace')",
        "    p_bug.add_argument('issue')",
        "    p_bug.add_argument('--db', type=Path, default=Path('.repo_mri/repo_mri.sqlite'))",
        "    p_bug.add_argument('--limit', type=int, default=8)",
        "",
        "    args = parser.parse_args(argv)",
        "    if args.cmd == 'index':",
        "        print(json.dumps(index_repo(args.repo, args.db), indent=2))",
        "    elif args.cmd == 'stats':",
        "        conn = connect(args.db)",
        "        try:",
        "            print(json.dumps(db_stats(conn), indent=2))",
        "        finally:",
        "            conn.close()",
        "    elif args.cmd == 'search':",
        "        print(json.dumps(run_search(args.db, args.query, args.limit), indent=2))",
        "    elif args.cmd == 'bug-path':",
        "        print(json.dumps(run_bug_path(args.db, args.issue, args.limit), indent=2))",
        "",
        "",
        "if __name__ == '__main__':",
        "    main()"
      ].join("\n")
    },
    {
      path: "services/indexer/tests/test_indexer.py",
      content: [
        "from pathlib import Path",
        "from repo_mri_indexer.indexer import index_repo",
        "from repo_mri_indexer.search import search",
        "from repo_mri_indexer.bug_path import bug_path",
        "",
        "",
        "def test_index_search_and_bug_path(tmp_path: Path):",
        "    repo = tmp_path / 'repo'",
        "    repo.mkdir()",
        "    (repo / 'auth.py').write_text('''",
        "class User:",
        "    pass",
        "",
        "def login_user(email, password):",
        "    validate_password(password)",
        "    return User()",
        "",
        "def validate_password(password):",
        "    if not password:",
        "        raise ValueError(\"empty password\")",
        "    return True",
        "'''.strip(), encoding='utf-8')",
        "    (repo / '.env').write_text('SECRET=do-not-index', encoding='utf-8')",
        "    db = tmp_path / 'repo_mri.sqlite'",
        "    stats = index_repo(repo, db)",
        "    assert stats['files'] == 1",
        "    assert stats['symbols'] >= 3",
        "    results = search(db, 'login_user')",
        "    assert any(result['symbol_name'] == 'login_user' for result in results)",
        "    path = bug_path(db, 'ValueError in auth.py:4 when login_user gets empty password')",
        "    assert path['candidates']",
        "    assert path['candidates'][0]['path'] == 'auth.py'",
        "    assert path['candidates'][0]['evidence']",
        "",
        "",
        "def test_scanner_ignores_secret_files(tmp_path: Path):",
        "    repo = tmp_path / 'repo'",
        "    repo.mkdir()",
        "    (repo / 'safe.py').write_text('def ok():\\n    return True\\n', encoding='utf-8')",
        "    (repo / '.env').write_text('TOKEN=secret', encoding='utf-8')",
        "    db = tmp_path / 'repo_mri.sqlite'",
        "    stats = index_repo(repo, db)",
        "    assert stats['files'] == 1"
      ].join("\n")
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
  const hasStarterCode =
    artifacts.some((artifact) => artifact.path.startsWith("services/")) ||
    artifacts.some((artifact) => artifact.path === "Makefile");
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
      : hasStarterCode
        ? []
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
        ...(hasStarterCode
          ? []
          : ["GPT baseline includes runnable starter code and sample repo; this exporter still focuses on plan artifacts unless starter code generation is added"]),
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
    ...supportFiles(shape),
    ...repoMriStarterCodeFiles(shape)
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

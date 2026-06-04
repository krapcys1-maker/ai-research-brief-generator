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
};

export type ProjectPackExport = {
  artifacts: ProjectPackArtifact[];
  readiness: ProjectPackReadiness;
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
    "## Core workflow",
    "",
    numbered(shape.coreWorkflow),
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
    "## Why this should beat a generic AI answer",
    "",
    "The project is grounded in explicit research coverage, PRD requirements, architecture traceability and a Cursor-ready implementation workflow. The final product must expose evidence instead of hiding reasoning inside prose."
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
  return [
    "# Build roadmap",
    "",
    "## Week 1 - Working local core",
    "",
    bullet(shape.firstVerticalSlice),
    "",
    "## Week 2 - Evidence and ranking",
    "",
    bullet([
      "add confidence to every result",
      "add fixture cases for weak and ambiguous evidence",
      "make unsupported outputs explicit",
      "write contract tests for the core module"
    ]),
    "",
    "## Week 3 - API and UI demo",
    "",
    bullet([
      "add the API endpoints from `docs/05-api-contract.md`",
      "build a small UI that shows evidence and confidence",
      "add an evidence drawer instead of hiding details in prose"
    ]),
    "",
    "## Week 4 - Portfolio polish",
    "",
    bullet([
      "prepare demo script",
      "add screenshots or GIFs",
      "document limitations honestly",
      "run evaluation fixtures and record results"
    ])
  ].join("\n");
}

function riskRegister(input: GenerateProjectPackInput, shape: ProductShape) {
  const architectureRisks = input.architecture.risks.slice(0, 8).map(
    (risk) => `## Risk: ${risk.risk}\n\nMitigation: ${risk.mitigation}`
  );

  return [
    "# Risk register",
    "",
    `## Risk: losing the product thesis`,
    "",
    `Mitigation: keep this invariant in every implementation task: ${shape.cursorRuleFocus}`,
    "",
    ...architectureRisks
  ].join("\n\n");
}

function evaluationPlan(shape: ProductShape) {
  return [
    "# Evaluation plan",
    "",
    "## Metrics",
    "",
    bullet(shape.evaluationMetrics),
    "",
    "## Fixture strategy",
    "",
    bullet([
      "tiny fixture for fast unit tests",
      "one realistic sample input for demo",
      "one negative fixture where the system must refuse or mark unknowns",
      "golden outputs for ranking and evidence completeness"
    ]),
    "",
    "## Release gate",
    "",
    "A run is not ready unless tests pass, evidence coverage is visible, and no confident unsupported answer is emitted."
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
    "This pack is judged against the GPT baseline quality floor. It is ready for architecture and planning tests when it has a sharp product thesis, a concrete killer feature, Cursor files, evaluation artifacts and evidence-backed architecture."
  ].join("\n");
}

function judgeArtifacts(artifacts: ProjectPackArtifact[], input: GenerateProjectPackInput): ProjectPackReadiness {
  const paths = new Set(artifacts.map((artifact) => artifact.path));
  const missing = REQUIRED_ARTIFACTS.filter((path) => !paths.has(path));
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
        (input.prd.status === "ready" && input.architecture.status === "ready" ? 5 : 0)
    )
  );
  const requiredFixes = [
    ...missing.map((path) => `Generate missing artifact: ${path}`),
    ...(input.architectureJudge.score < 90
      ? ["Improve architecture judge score to at least 90."]
      : []),
    ...(!hasCursor ? ["Generate Cursor rules, plans and prompts."] : []),
    ...(!hasStarterHints ? ["Generate sample data and tests guidance."] : []),
    ...(!hasStarterCode ? ["Generate runnable starter code or mark this run as architecture-plan-only."] : [])
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
    starterCodeReady: hasStarterCode
  };
}

export function generateProjectPack(input: GenerateProjectPackInput): ProjectPackExport {
  const shape = productShape(input);
  const artifactsWithoutVerdict: ProjectPackArtifact[] = [
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

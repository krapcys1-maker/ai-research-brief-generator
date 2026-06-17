import { buildProjectResearchPlan } from "@/lib/project-research";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type BenchmarkCase = {
  id: string;
  title: string;
  description: string;
  constraints: string[];
  preferredDomains: string[];
  expectedBucketIds: string[];
};

type CaseResult = {
  id: string;
  title: string;
  ideaId: string;
  detectedDomains: string[];
  expectedBucketIds: string[];
  producedBucketIds: string[];
  missingBucketIds: string[];
  expectedBucketRecall: number;
  queryVariantCount: number;
  requiredBucketCount: number;
  singleQueryFailure: boolean;
};

const cases: BenchmarkCase[] = [
  {
    id: "trading_bot",
    title: "AI Trading Bot",
    description:
      "Bot tradingowy na gieldzie uzywajacy AI, backtestow, danych rynkowych i kontroli ryzyka.",
    constraints: ["najpierw paper trading", "bez live tradingu w MVP"],
    preferredDomains: ["algorithmic trading"],
    expectedBucketIds: [
      "model_experiments",
      "backtest_validation",
      "data_correctness",
      "execution_market_impact",
      "risk_governance"
    ]
  },
  {
    id: "repo_optimizer",
    title: "Repo Optimizer AI",
    description:
      "Aplikacja skanujaca repozytoria, robiaca code review, wykrywajaca bugi i priorytetyzujaca refactor.",
    constraints: ["MVP tylko rekomenduje zmiany"],
    preferredDomains: ["software engineering", "LLM code review"],
    expectedBucketIds: [
      "static_analysis",
      "llm_code_review",
      "program_repair",
      "repository_mining",
      "developer_workflow"
    ]
  },
  {
    id: "medical_rag",
    title: "Medical RAG Assistant",
    description:
      "Healthcare AI assistant that retrieves clinical documents and supports diagnostic review for patients.",
    constraints: ["nie stawia samodzielnej diagnozy"],
    preferredDomains: [],
    expectedBucketIds: [
      "clinical_evidence",
      "safety_validation",
      "privacy_compliance",
      "workflow_integration"
    ]
  },
  {
    id: "contract_reviewer",
    title: "Contract Compliance Reviewer",
    description:
      "Legal AI system for contract analysis, compliance review, document review and grounded citations.",
    constraints: ["czlowiek zatwierdza decyzje"],
    preferredDomains: [],
    expectedBucketIds: [
      "legal_retrieval",
      "contract_analysis",
      "compliance_risk",
      "human_review"
    ]
  },
  {
    id: "agent_sandbox_health",
    title: "Agent Sandbox Health Monitor",
    description:
      "Agent Sandbox Health Monitor helps AI agent platform teams solve a narrower adjacent workflow inspired by NemoClaw. Problem: Teams running AI agents inside sandboxes need to catch startup failures, network misconfiguration, capability drops, and unsafe policy drift before live runs.",
    constraints: ["MVP: ingest sandbox startup logs and policy config"],
    preferredDomains: ["AI agents", "sandbox reliability", "agent safety"],
    expectedBucketIds: [
      "sandbox_preflight_checks",
      "tool_policy_safety",
      "runtime_observability",
      "release_gate_replay"
    ]
  },
  {
    id: "generic_team_planner",
    title: "Smart Team Planner",
    description:
      "Narzędzie pomagajace malemu zespolowi planowac prace, zaleznosci i ryzyka projektu.",
    constraints: [],
    preferredDomains: [],
    expectedBucketIds: [
      "domain_methods",
      "data_requirements",
      "evaluation_validation",
      "risk_safety",
      "implementation_operations"
    ]
  }
];

const minAverageRecall = 0.95;
const jsonOutputPath =
  process.env.PROJECT_RESEARCH_PLAN_BENCHMARK_JSON ??
  "benchmark-results/project-research-plan-latest.json";
const markdownOutputPath =
  process.env.PROJECT_RESEARCH_PLAN_BENCHMARK_MARKDOWN ??
  "benchmark-results/project-research-plan-latest.md";

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

function evaluateCase(testCase: BenchmarkCase): CaseResult {
  const { normalizedIdea, researchPlan } = buildProjectResearchPlan({
    title: testCase.title,
    description: testCase.description,
    constraints: testCase.constraints,
    preferredDomains: testCase.preferredDomains,
    outputLanguage: "pl"
  });

  const producedBucketIds = researchPlan.evidenceBuckets.map((bucket) => bucket.id);
  const producedSet = new Set(producedBucketIds);
  const missingBucketIds = testCase.expectedBucketIds.filter(
    (bucketId) => !producedSet.has(bucketId)
  );
  const expectedBucketRecall =
    (testCase.expectedBucketIds.length - missingBucketIds.length) /
    testCase.expectedBucketIds.length;
  const requiredBucketCount = researchPlan.evidenceBuckets.filter(
    (bucket) => bucket.required
  ).length;

  return {
    id: testCase.id,
    title: testCase.title,
    ideaId: normalizedIdea.ideaId,
    detectedDomains: normalizedIdea.domains,
    expectedBucketIds: testCase.expectedBucketIds,
    producedBucketIds,
    missingBucketIds,
    expectedBucketRecall,
    queryVariantCount: researchPlan.queryVariants.length,
    requiredBucketCount,
    singleQueryFailure:
      researchPlan.evidenceBuckets.length <= 1 ||
      researchPlan.queryVariants.length <= researchPlan.evidenceBuckets.length
  };
}

function renderMarkdownReport(input: {
  generatedAt: string;
  caseCount: number;
  passCount: number;
  averageExpectedBucketRecall: number;
  singleQueryFailureCount: number;
  results: CaseResult[];
}) {
  const lines = [
    "# Project Research Plan Benchmark",
    "",
    `Generated at: ${input.generatedAt}`,
    `Cases: ${input.caseCount}`,
    `Pass count: ${input.passCount}/${input.caseCount}`,
    `Average expected bucket recall: ${pct(input.averageExpectedBucketRecall)}`,
    `Single-query failures: ${input.singleQueryFailureCount}`,
    `Threshold: average recall >= ${pct(minAverageRecall)}, single-query failures = 0`,
    "",
    "## Cases",
    ""
  ];

  for (const result of input.results) {
    const passed =
      result.expectedBucketRecall === 1 && result.singleQueryFailure === false;
    lines.push(`### ${passed ? "PASS" : "FAIL"} ${result.title}`);
    lines.push("");
    lines.push(`- Idea ID: ${result.ideaId}`);
    lines.push(`- Domains: ${result.detectedDomains.join(", ")}`);
    lines.push(`- Expected recall: ${pct(result.expectedBucketRecall)}`);
    lines.push(`- Required buckets: ${result.requiredBucketCount}`);
    lines.push(`- Query variants: ${result.queryVariantCount}`);
    lines.push(`- Produced buckets: ${result.producedBucketIds.join(", ")}`);
    lines.push(
      `- Missing buckets: ${result.missingBucketIds.join(", ") || "none"}`
    );
    lines.push(`- Single-query failure: ${result.singleQueryFailure ? "yes" : "no"}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const results = cases.map(evaluateCase);
  const passCount = results.filter(
    (result) =>
      result.expectedBucketRecall === 1 && result.singleQueryFailure === false
  ).length;
  const averageExpectedBucketRecall =
    results.reduce((sum, result) => sum + result.expectedBucketRecall, 0) /
    results.length;
  const singleQueryFailureCount = results.filter(
    (result) => result.singleQueryFailure
  ).length;

  const report = {
    generatedAt,
    caseCount: results.length,
    passCount,
    averageExpectedBucketRecall,
    singleQueryFailureCount,
    minAverageRecall,
    results
  };

  await writeTextFile(jsonOutputPath, JSON.stringify(report, null, 2));
  await writeTextFile(markdownOutputPath, renderMarkdownReport(report));

  console.log(
    [
      "Project research plan benchmark",
      `Cases: ${report.caseCount}`,
      `Pass: ${report.passCount}/${report.caseCount}`,
      `Average expected bucket recall: ${pct(report.averageExpectedBucketRecall)}`,
      `Single-query failures: ${report.singleQueryFailureCount}`,
      `JSON: ${jsonOutputPath}`,
      `Markdown: ${markdownOutputPath}`
    ].join("\n")
  );

  if (
    report.averageExpectedBucketRecall < minAverageRecall ||
    report.singleQueryFailureCount > 0
  ) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

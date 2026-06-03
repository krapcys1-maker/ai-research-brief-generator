import {
  buildProjectResearchBrief,
  buildProjectResearchPlan
} from "@/lib/project-research";
import { generateProjectPrd } from "@/lib/project-prd";
import { ProjectPrdSchema } from "@/lib/project-prd/schemas";
import type {
  ProjectIdeaInput,
  ReviewedPaper
} from "@/lib/project-research";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type BenchmarkCase = {
  id: string;
  idea: ProjectIdeaInput;
  mode: "ready" | "blocked";
};

type CaseResult = {
  id: string;
  title: string;
  expectedStatus: "ready" | "blocked";
  actualStatus: "ready" | "blocked";
  schemaValid: boolean;
  requirementCount: number;
  requirementsWithPaperSources: number;
  traceabilityCoverage: number;
  blockerCount: number;
  auditScore: number;
};

const jsonOutputPath =
  process.env.PROJECT_PRD_BENCHMARK_JSON ??
  "benchmark-results/project-prd-latest.json";
const markdownOutputPath =
  process.env.PROJECT_PRD_BENCHMARK_MARKDOWN ??
  "benchmark-results/project-prd-latest.md";
const minAverageTraceabilityCoverage = 0.75;

const ideas: Record<string, ProjectIdeaInput> = {
  trading: {
    title: "AI Trading Bot",
    description:
      "Bot tradingowy na gieldzie uzywajacy AI, backtestow i kontroli ryzyka.",
    constraints: ["najpierw paper trading"],
    preferredDomains: ["algorithmic trading"],
    outputLanguage: "pl"
  },
  repo: {
    title: "Repo Optimizer AI",
    description:
      "Aplikacja skanujaca repozytoria, robiaca code review, wykrywajaca bugi i priorytetyzujaca refactor.",
    constraints: ["MVP tylko rekomenduje zmiany"],
    preferredDomains: ["software engineering", "LLM code review"],
    outputLanguage: "pl"
  },
  medical: {
    title: "Medical RAG Assistant",
    description:
      "Healthcare AI assistant that retrieves clinical documents and supports diagnostic review.",
    constraints: ["nie stawia samodzielnej diagnozy"],
    preferredDomains: [],
    outputLanguage: "pl"
  }
};

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

function paperForBucket(bucketId: string, index: number): ReviewedPaper {
  return {
    paperId: `prd_bench_${bucketId}_${index}`,
    title: `PRD benchmark evidence for ${bucketId} ${index}`,
    year: 2025,
    url: `https://example.com/prd-bench/${bucketId}/${index}`,
    doi: `10.1000/prdbench.${bucketId}.${index}`,
    bucketIds: [bucketId],
    fullTextStatus: "parsed",
    usefulForProject: true,
    evidenceStrength: "full_text_partial",
    keyMethods: [`method ${index} for ${bucketId}`],
    limitations: [`limitation ${index} for ${bucketId}`],
    implementationImplications: [`support ${bucketId} in product scope`],
    riskImplications: [`risk ${index} from ${bucketId}`]
  };
}

function fullEvidenceForIdea(idea: ProjectIdeaInput) {
  const { researchPlan } = buildProjectResearchPlan(idea);
  return researchPlan.evidenceBuckets.flatMap((bucket) => [
    paperForBucket(bucket.id, 1),
    paperForBucket(bucket.id, 2)
  ]);
}

function partialEvidenceForIdea(idea: ProjectIdeaInput) {
  const { researchPlan } = buildProjectResearchPlan(idea);
  return [
    paperForBucket(researchPlan.evidenceBuckets[0].id, 1),
    paperForBucket(researchPlan.evidenceBuckets[0].id, 2)
  ];
}

function evaluateCase(testCase: BenchmarkCase): CaseResult {
  const reviewedPapers =
    testCase.mode === "ready"
      ? fullEvidenceForIdea(testCase.idea)
      : partialEvidenceForIdea(testCase.idea);
  const brief = buildProjectResearchBrief({
    idea: testCase.idea,
    reviewedPapers,
    generatedAt: "2026-06-03T15:30:00.000Z"
  });
  const prd = generateProjectPrd({
    brief,
    generatedAt: "2026-06-03T15:35:00.000Z"
  });
  const schemaValid = ProjectPrdSchema.safeParse(prd).success;
  const traceabilityCoverage =
    prd.traceability.requirementCount === 0
      ? prd.status === "blocked"
        ? 1
        : 0
      : prd.traceability.requirementsWithPaperSources /
        prd.traceability.requirementCount;

  return {
    id: testCase.id,
    title: testCase.idea.title,
    expectedStatus: testCase.mode,
    actualStatus: prd.status,
    schemaValid,
    requirementCount: prd.requirements.length,
    requirementsWithPaperSources: prd.traceability.requirementsWithPaperSources,
    traceabilityCoverage,
    blockerCount: prd.blockers.length,
    auditScore: prd.audit.score
  };
}

function renderMarkdownReport(input: {
  generatedAt: string;
  caseCount: number;
  passCount: number;
  schemaValidCount: number;
  averageTraceabilityCoverage: number;
  results: CaseResult[];
}) {
  const lines = [
    "# Project PRD Benchmark",
    "",
    `Generated at: ${input.generatedAt}`,
    `Cases: ${input.caseCount}`,
    `Pass count: ${input.passCount}/${input.caseCount}`,
    `Schema valid: ${input.schemaValidCount}/${input.caseCount}`,
    `Average traceability coverage: ${pct(input.averageTraceabilityCoverage)}`,
    `Threshold: all cases pass, average traceability >= ${pct(minAverageTraceabilityCoverage)}`,
    "",
    "## Cases",
    ""
  ];

  for (const result of input.results) {
    const passed =
      result.schemaValid && result.actualStatus === result.expectedStatus;
    lines.push(`### ${passed ? "PASS" : "FAIL"} ${result.id}`);
    lines.push("");
    lines.push(`- Title: ${result.title}`);
    lines.push(`- Expected status: ${result.expectedStatus}`);
    lines.push(`- Actual status: ${result.actualStatus}`);
    lines.push(`- Requirements: ${result.requirementCount}`);
    lines.push(
      `- Requirements with paper sources: ${result.requirementsWithPaperSources}`
    );
    lines.push(`- Traceability coverage: ${pct(result.traceabilityCoverage)}`);
    lines.push(`- Blockers: ${result.blockerCount}`);
    lines.push(`- Audit score: ${result.auditScore}/100`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const cases: BenchmarkCase[] = [
    { id: "trading_prd_ready", idea: ideas.trading, mode: "ready" },
    { id: "repo_prd_ready", idea: ideas.repo, mode: "ready" },
    { id: "medical_prd_ready", idea: ideas.medical, mode: "ready" },
    { id: "repo_prd_blocked", idea: ideas.repo, mode: "blocked" }
  ];
  const results = cases.map(evaluateCase);
  const passCount = results.filter(
    (result) => result.schemaValid && result.actualStatus === result.expectedStatus
  ).length;
  const schemaValidCount = results.filter((result) => result.schemaValid).length;
  const averageTraceabilityCoverage =
    results.reduce((sum, result) => sum + result.traceabilityCoverage, 0) /
    results.length;
  const report = {
    generatedAt: new Date().toISOString(),
    caseCount: results.length,
    passCount,
    schemaValidCount,
    averageTraceabilityCoverage,
    minAverageTraceabilityCoverage,
    results
  };

  await writeTextFile(jsonOutputPath, JSON.stringify(report, null, 2));
  await writeTextFile(markdownOutputPath, renderMarkdownReport(report));

  console.log(
    [
      "Project PRD benchmark",
      `Cases: ${report.caseCount}`,
      `Pass: ${report.passCount}/${report.caseCount}`,
      `Schema valid: ${report.schemaValidCount}/${report.caseCount}`,
      `Average traceability coverage: ${pct(report.averageTraceabilityCoverage)}`,
      `JSON: ${jsonOutputPath}`,
      `Markdown: ${markdownOutputPath}`
    ].join("\n")
  );

  if (
    report.passCount !== report.caseCount ||
    report.averageTraceabilityCoverage < minAverageTraceabilityCoverage
  ) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

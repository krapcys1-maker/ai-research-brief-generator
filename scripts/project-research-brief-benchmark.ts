import {
  buildProjectResearchBrief,
  buildProjectResearchPlan
} from "@/lib/project-research";
import { ProjectResearchBriefSchema } from "@/lib/project-research/schemas";
import type {
  ProjectIdeaInput,
  ProjectResearchBrief,
  ReviewedPaper
} from "@/lib/project-research/types";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type BenchmarkCase = {
  id: string;
  expectedReady: boolean;
  idea: ProjectIdeaInput;
  reviewedPapers: ReviewedPaper[];
};

type CaseResult = {
  id: string;
  title: string;
  expectedReady: boolean;
  actualReady: boolean;
  schemaValid: boolean;
  requiredCoverageRatio: number;
  missingRequiredBuckets: string[];
  reviewedPaperCount: number;
  insightCitationIntegrity: boolean;
  auditScore: number;
};

const generatedAt = "2026-06-03T12:30:00.000Z";
const minAverageCoverage = 0.8;
const jsonOutputPath =
  process.env.PROJECT_RESEARCH_BRIEF_BENCHMARK_JSON ??
  "benchmark-results/project-research-brief-latest.json";
const markdownOutputPath =
  process.env.PROJECT_RESEARCH_BRIEF_BENCHMARK_MARKDOWN ??
  "benchmark-results/project-research-brief-latest.md";

const tradingIdea: ProjectIdeaInput = {
  title: "AI Trading Bot",
  description:
    "Bot tradingowy na gieldzie uzywajacy AI, backtestow i kontroli ryzyka.",
  constraints: ["najpierw paper trading"],
  preferredDomains: ["algorithmic trading"],
  outputLanguage: "pl"
};

const repoIdea: ProjectIdeaInput = {
  title: "Repo Optimizer AI",
  description:
    "Aplikacja skanujaca repozytoria, robiaca code review, wykrywajaca bugi i priorytetyzujaca refactor.",
  constraints: ["MVP tylko rekomenduje zmiany"],
  preferredDomains: ["software engineering", "LLM code review"],
  outputLanguage: "pl"
};

const legalIdea: ProjectIdeaInput = {
  title: "Contract Compliance Reviewer",
  description:
    "Legal AI system for contract analysis, compliance review, document review and grounded citations.",
  constraints: ["czlowiek zatwierdza decyzje"],
  preferredDomains: [],
  outputLanguage: "pl"
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
    paperId: `bench_${bucketId}_${index}`,
    title: `Benchmark evidence for ${bucketId} ${index}`,
    year: 2025,
    url: `https://example.com/bench/${bucketId}/${index}`,
    doi: null,
    bucketIds: [bucketId],
    fullTextStatus: "parsed",
    usefulForProject: true,
    evidenceStrength: "full_text_partial",
    keyMethods: [`method ${index} for ${bucketId}`],
    limitations: [`limitation ${index} for ${bucketId}`],
    implementationImplications: [
      `architecture implication ${index} from ${bucketId}`
    ],
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
  const firstBucket = researchPlan.evidenceBuckets[0];
  return [paperForBucket(firstBucket.id, 1), paperForBucket(firstBucket.id, 2)];
}

function hasValidInsightCitations(brief: ProjectResearchBrief) {
  const paperIds = new Set(brief.reviewedPapers.map((paper) => paper.paperId));
  return brief.projectInsights.every((insight) =>
    insight.sourcePaperIds.every((paperId) => paperIds.has(paperId))
  );
}

function evaluateCase(testCase: BenchmarkCase): CaseResult {
  const brief = buildProjectResearchBrief({
    idea: testCase.idea,
    reviewedPapers: testCase.reviewedPapers,
    generatedAt
  });
  const schemaValid = ProjectResearchBriefSchema.safeParse(brief).success;
  const requiredCoverageRatio =
    brief.evidenceCoverage.requiredBucketCount === 0
      ? 0
      : brief.evidenceCoverage.requiredCoveredCount /
        brief.evidenceCoverage.requiredBucketCount;

  return {
    id: testCase.id,
    title: testCase.idea.title,
    expectedReady: testCase.expectedReady,
    actualReady: brief.readyForArchitecture,
    schemaValid,
    requiredCoverageRatio,
    missingRequiredBuckets: brief.evidenceCoverage.missingRequiredBuckets,
    reviewedPaperCount: brief.reviewedPapers.length,
    insightCitationIntegrity: hasValidInsightCitations(brief),
    auditScore: brief.audit.score
  };
}

function renderMarkdownReport(input: {
  generatedAt: string;
  caseCount: number;
  passCount: number;
  schemaValidCount: number;
  readinessExpectationPassCount: number;
  citationIntegrityPassCount: number;
  averageRequiredCoverage: number;
  results: CaseResult[];
}) {
  const lines = [
    "# Project Research Brief Benchmark",
    "",
    `Generated at: ${input.generatedAt}`,
    `Cases: ${input.caseCount}`,
    `Pass count: ${input.passCount}/${input.caseCount}`,
    `Schema valid: ${input.schemaValidCount}/${input.caseCount}`,
    `Readiness expectation pass: ${input.readinessExpectationPassCount}/${input.caseCount}`,
    `Insight citation integrity: ${input.citationIntegrityPassCount}/${input.caseCount}`,
    `Average required coverage: ${pct(input.averageRequiredCoverage)}`,
    `Threshold: all schema/readiness/citation checks pass, average coverage >= ${pct(minAverageCoverage)}`,
    "",
    "## Cases",
    ""
  ];

  for (const result of input.results) {
    const passed =
      result.schemaValid &&
      result.actualReady === result.expectedReady &&
      result.insightCitationIntegrity;
    lines.push(`### ${passed ? "PASS" : "FAIL"} ${result.title}`);
    lines.push("");
    lines.push(`- Expected ready: ${result.expectedReady ? "yes" : "no"}`);
    lines.push(`- Actual ready: ${result.actualReady ? "yes" : "no"}`);
    lines.push(`- Schema valid: ${result.schemaValid ? "yes" : "no"}`);
    lines.push(`- Coverage: ${pct(result.requiredCoverageRatio)}`);
    lines.push(`- Reviewed papers: ${result.reviewedPaperCount}`);
    lines.push(
      `- Citation integrity: ${result.insightCitationIntegrity ? "yes" : "no"}`
    );
    lines.push(`- Audit score: ${result.auditScore}/100`);
    lines.push(
      `- Missing buckets: ${result.missingRequiredBuckets.join(", ") || "none"}`
    );
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const cases: BenchmarkCase[] = [
    {
      id: "trading_ready",
      expectedReady: true,
      idea: tradingIdea,
      reviewedPapers: fullEvidenceForIdea(tradingIdea)
    },
    {
      id: "repo_ready",
      expectedReady: true,
      idea: repoIdea,
      reviewedPapers: fullEvidenceForIdea(repoIdea)
    },
    {
      id: "legal_ready",
      expectedReady: true,
      idea: legalIdea,
      reviewedPapers: fullEvidenceForIdea(legalIdea)
    },
    {
      id: "repo_blocked_missing_buckets",
      expectedReady: false,
      idea: repoIdea,
      reviewedPapers: partialEvidenceForIdea(repoIdea)
    }
  ];
  const results = cases.map(evaluateCase);
  const schemaValidCount = results.filter((result) => result.schemaValid).length;
  const readinessExpectationPassCount = results.filter(
    (result) => result.actualReady === result.expectedReady
  ).length;
  const citationIntegrityPassCount = results.filter(
    (result) => result.insightCitationIntegrity
  ).length;
  const passCount = results.filter(
    (result) =>
      result.schemaValid &&
      result.actualReady === result.expectedReady &&
      result.insightCitationIntegrity
  ).length;
  const averageRequiredCoverage =
    results.reduce((sum, result) => sum + result.requiredCoverageRatio, 0) /
    results.length;

  const report = {
    generatedAt: new Date().toISOString(),
    caseCount: results.length,
    passCount,
    schemaValidCount,
    readinessExpectationPassCount,
    citationIntegrityPassCount,
    averageRequiredCoverage,
    minAverageCoverage,
    results
  };

  await writeTextFile(jsonOutputPath, JSON.stringify(report, null, 2));
  await writeTextFile(markdownOutputPath, renderMarkdownReport(report));

  console.log(
    [
      "Project research brief benchmark",
      `Cases: ${report.caseCount}`,
      `Pass: ${report.passCount}/${report.caseCount}`,
      `Schema valid: ${report.schemaValidCount}/${report.caseCount}`,
      `Readiness expectation pass: ${report.readinessExpectationPassCount}/${report.caseCount}`,
      `Insight citation integrity: ${report.citationIntegrityPassCount}/${report.caseCount}`,
      `Average required coverage: ${pct(report.averageRequiredCoverage)}`,
      `JSON: ${jsonOutputPath}`,
      `Markdown: ${markdownOutputPath}`
    ].join("\n")
  );

  if (
    report.passCount !== report.caseCount ||
    report.averageRequiredCoverage < minAverageCoverage
  ) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

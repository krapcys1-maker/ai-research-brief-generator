import {
  discoverProjectIdeas,
  IdeaDiscoveryReportSchema
} from "@/lib/project-ideas";
import {
  projectIdeaBenchmarkCases,
  type ProjectIdeaBenchmarkCase
} from "@/lib/project-ideas/benchmarkFixtures";
import { ProjectIdeaInputSchema } from "@/lib/project-research/schemas";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type CaseResult = {
  id: string;
  domain: string;
  tags: string[];
  schemaValid: boolean;
  ideaCount: number;
  promisingCount: number;
  cloneRejectedCount: number;
  averageNovelty: number;
  averageMvpFeasibility: number;
  averagePersonalUtility: number;
  averageGithubSignalStrength: number;
  shortlistSourceDominance: number;
  maxIdeasPerSource: number;
  researchReadyCount: number;
  pipelineInputValidCount: number;
  averageHandoffQualityScore: number;
  handoffReadyCount: number;
  handoffReviewCount: number;
  handoffBlockedCount: number;
  passed: boolean;
  topIdeaTitle: string | null;
  expectedTopIdeaTitle: string | null;
  topIdeaMatchesExpectation: boolean;
};

const jsonOutputPath =
  process.env.PROJECT_IDEA_DISCOVERY_BENCHMARK_JSON ??
  "benchmark-results/project-idea-discovery-latest.json";
const markdownOutputPath =
  process.env.PROJECT_IDEA_DISCOVERY_BENCHMARK_MARKDOWN ??
  "benchmark-results/project-idea-discovery-latest.md";

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

function evaluateCase(testCase: ProjectIdeaBenchmarkCase): CaseResult {
  const report = discoverProjectIdeas({
    domain: testCase.domain,
    constraints: testCase.constraints,
    maxIdeas: 3,
    sourceRepos: testCase.sourceRepos,
    outputLanguage: "pl"
  });
  const parsed = IdeaDiscoveryReportSchema.safeParse(report);
  const pipelineInputValidCount = report.projectIdeaInputs.filter(
    (idea) => ProjectIdeaInputSchema.safeParse(idea).success
  ).length;
  const sourceDiversityPass =
    testCase.sourceRepos.length < 2 || report.metrics.shortlistSourceDominance <= 0.5;
  const topIdeaTitle = report.shortlist[0]?.title ?? null;
  const topIdeaMatchesExpectation =
    !testCase.expectedTopIdeaTitle ||
    topIdeaTitle === testCase.expectedTopIdeaTitle;
  const handoffReviewCount = report.metrics.handoffReviewCount;
  const handoffBlockedCount = report.metrics.handoffBlockedCount;
  const handoffUsableCount =
    report.metrics.handoffReadyCount + handoffReviewCount;
  const passed =
    parsed.success &&
    report.metrics.ideaCount >= 2 &&
    report.metrics.promisingCount >= 1 &&
    report.metrics.cloneRejectedCount >= 1 &&
    report.metrics.averageNovelty >= 0.7 &&
    report.metrics.averageMvpFeasibility >= 0.7 &&
    report.metrics.averagePersonalUtility >= 0.7 &&
    sourceDiversityPass &&
    topIdeaMatchesExpectation &&
    report.metrics.researchReadyCount >= 1 &&
    handoffUsableCount === report.metrics.promisingCount &&
    handoffBlockedCount === 0 &&
    report.metrics.averageHandoffQualityScore >= 82 &&
    pipelineInputValidCount === report.metrics.promisingCount;

  return {
    id: testCase.id,
    domain: testCase.domain,
    tags: testCase.tags,
    schemaValid: parsed.success,
    ideaCount: report.metrics.ideaCount,
    promisingCount: report.metrics.promisingCount,
    cloneRejectedCount: report.metrics.cloneRejectedCount,
    averageNovelty: report.metrics.averageNovelty,
    averageMvpFeasibility: report.metrics.averageMvpFeasibility,
    averagePersonalUtility: report.metrics.averagePersonalUtility,
    averageGithubSignalStrength: report.metrics.averageGithubSignalStrength,
    shortlistSourceDominance: report.metrics.shortlistSourceDominance,
    maxIdeasPerSource: report.metrics.maxIdeasPerSource,
    researchReadyCount: report.metrics.researchReadyCount,
    pipelineInputValidCount,
    averageHandoffQualityScore: report.metrics.averageHandoffQualityScore,
    handoffReadyCount: report.metrics.handoffReadyCount,
    handoffReviewCount,
    handoffBlockedCount,
    passed,
    topIdeaTitle,
    expectedTopIdeaTitle: testCase.expectedTopIdeaTitle ?? null,
    topIdeaMatchesExpectation
  };
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function renderMarkdownReport(input: {
  generatedAt: string;
  caseCount: number;
  passCount: number;
  schemaValidCount: number;
  ideaCount: number;
  promisingCount: number;
  cloneRejectedCount: number;
  averageNovelty: number;
  averageMvpFeasibility: number;
  averagePersonalUtility: number;
  averageGithubSignalStrength: number;
  averageShortlistSourceDominance: number;
  maxIdeasPerSource: number;
  researchReadyCount: number;
  pipelineInputValidCount: number;
  averageHandoffQualityScore: number;
  handoffReadyCount: number;
  handoffReviewCount: number;
  handoffBlockedCount: number;
  results: CaseResult[];
}) {
  const lines = [
    "# Project Idea Discovery Benchmark",
    "",
    `Generated at: ${input.generatedAt}`,
    `Cases: ${input.caseCount}`,
    `Pass count: ${input.passCount}/${input.caseCount}`,
    `Schema valid: ${input.schemaValidCount}/${input.caseCount}`,
    `Ideas: ${input.ideaCount}`,
    `Promising ideas: ${input.promisingCount}`,
    `Clone rejections: ${input.cloneRejectedCount}`,
    `Average novelty: ${pct(input.averageNovelty)}`,
    `Average MVP feasibility: ${pct(input.averageMvpFeasibility)}`,
    `Average personal utility: ${pct(input.averagePersonalUtility)}`,
    `Average GitHub signal: ${pct(input.averageGithubSignalStrength)}`,
    `Average shortlist source dominance: ${pct(input.averageShortlistSourceDominance)}`,
    `Max ideas per source: ${input.maxIdeasPerSource}`,
    `Research-ready ideas: ${input.researchReadyCount}`,
    `Pipeline inputs valid: ${input.pipelineInputValidCount}`,
    `Average handoff quality score: ${input.averageHandoffQualityScore.toFixed(1)}`,
    `Handoff ready ideas: ${input.handoffReadyCount}`,
    `Handoff review ideas: ${input.handoffReviewCount}`,
    `Handoff blocked ideas: ${input.handoffBlockedCount}`,
    "",
    "## Cases",
    ""
  ];

  for (const result of input.results) {
    lines.push(`### ${result.passed ? "PASS" : "FAIL"} ${result.domain}`);
    lines.push("");
    lines.push(`- Ideas: ${result.ideaCount}`);
    lines.push(`- Promising: ${result.promisingCount}`);
    lines.push(`- Clone rejections: ${result.cloneRejectedCount}`);
    lines.push(`- Average novelty: ${pct(result.averageNovelty)}`);
    lines.push(`- Average MVP feasibility: ${pct(result.averageMvpFeasibility)}`);
    lines.push(`- Average personal utility: ${pct(result.averagePersonalUtility)}`);
    lines.push(`- Average GitHub signal: ${pct(result.averageGithubSignalStrength)}`);
    lines.push(`- Shortlist source dominance: ${pct(result.shortlistSourceDominance)}`);
    lines.push(`- Max ideas per source: ${result.maxIdeasPerSource}`);
    lines.push(`- Research-ready: ${result.researchReadyCount}`);
    lines.push(`- Pipeline inputs valid: ${result.pipelineInputValidCount}`);
    lines.push(`- Average handoff quality score: ${result.averageHandoffQualityScore.toFixed(1)}`);
    lines.push(`- Handoff ready: ${result.handoffReadyCount}`);
    lines.push(`- Handoff review: ${result.handoffReviewCount}`);
    lines.push(`- Handoff blocked: ${result.handoffBlockedCount}`);
    lines.push(`- Tags: ${result.tags.join(", ")}`);
    lines.push(`- Top idea: ${result.topIdeaTitle ?? "none"}`);
    if (result.expectedTopIdeaTitle) {
      lines.push(`- Expected top idea: ${result.expectedTopIdeaTitle}`);
      lines.push(
        `- Top idea matches expectation: ${result.topIdeaMatchesExpectation ? "yes" : "no"}`
      );
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const results = projectIdeaBenchmarkCases.map(evaluateCase);
  const report = {
    generatedAt,
    caseCount: results.length,
    passCount: results.filter((result) => result.passed).length,
    schemaValidCount: results.filter((result) => result.schemaValid).length,
    ideaCount: results.reduce((sum, result) => sum + result.ideaCount, 0),
    promisingCount: results.reduce(
      (sum, result) => sum + result.promisingCount,
      0
    ),
    cloneRejectedCount: results.reduce(
      (sum, result) => sum + result.cloneRejectedCount,
      0
    ),
    averageNovelty: Number(
      average(results.map((result) => result.averageNovelty)).toFixed(3)
    ),
    averageMvpFeasibility: Number(
      average(results.map((result) => result.averageMvpFeasibility)).toFixed(3)
    ),
    averagePersonalUtility: Number(
      average(results.map((result) => result.averagePersonalUtility)).toFixed(3)
    ),
    averageGithubSignalStrength: Number(
      average(results.map((result) => result.averageGithubSignalStrength)).toFixed(3)
    ),
    averageShortlistSourceDominance: Number(
      average(results.map((result) => result.shortlistSourceDominance)).toFixed(3)
    ),
    maxIdeasPerSource: Math.max(...results.map((result) => result.maxIdeasPerSource)),
    researchReadyCount: results.reduce(
      (sum, result) => sum + result.researchReadyCount,
      0
    ),
    pipelineInputValidCount: results.reduce(
      (sum, result) => sum + result.pipelineInputValidCount,
      0
    ),
    averageHandoffQualityScore: Number(
      average(results.map((result) => result.averageHandoffQualityScore)).toFixed(1)
    ),
    handoffReadyCount: results.reduce(
      (sum, result) => sum + result.handoffReadyCount,
      0
    ),
    handoffReviewCount: results.reduce(
      (sum, result) => sum + result.handoffReviewCount,
      0
    ),
    handoffBlockedCount: results.reduce(
      (sum, result) => sum + result.handoffBlockedCount,
      0
    ),
    results
  };

  await writeTextFile(jsonOutputPath, JSON.stringify(report, null, 2));
  await writeTextFile(markdownOutputPath, renderMarkdownReport(report));

  console.log(
    [
      "Project idea discovery benchmark",
      `Cases: ${report.passCount}/${report.caseCount}`,
      `Promising ideas: ${report.promisingCount}`,
      `Clone rejections: ${report.cloneRejectedCount}`,
      `Average novelty: ${pct(report.averageNovelty)}`,
      `Average MVP feasibility: ${pct(report.averageMvpFeasibility)}`,
      `Average personal utility: ${pct(report.averagePersonalUtility)}`,
      `Average shortlist source dominance: ${pct(report.averageShortlistSourceDominance)}`,
      `Max ideas per source: ${report.maxIdeasPerSource}`,
      `Research-ready ideas: ${report.researchReadyCount}`,
      `Average handoff quality score: ${report.averageHandoffQualityScore.toFixed(1)}`,
      `Handoff ready ideas: ${report.handoffReadyCount}`,
      `Handoff review ideas: ${report.handoffReviewCount}`,
      `Handoff blocked ideas: ${report.handoffBlockedCount}`,
      `JSON: ${jsonOutputPath}`,
      `Markdown: ${markdownOutputPath}`
    ].join("\n")
  );

  if (report.passCount !== report.caseCount) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

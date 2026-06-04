import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";

type BenchmarkDefinition = {
  id: string;
  label: string;
  npmScript: string;
  jsonPath: string;
};

type BenchmarkSummary = {
  id: string;
  label: string;
  npmScript: string;
  jsonPath: string;
  exitCode: number;
  caseCount: number;
  passCount: number;
  passRate: number;
  keyMetrics: Record<string, number | string | boolean>;
};

const benchmarkDefinitions: BenchmarkDefinition[] = [
  {
    id: "project_docs",
    label: "ProjectDocs",
    npmScript: "benchmark:project-docs",
    jsonPath: "benchmark-results/project-docs-consistency-latest.json"
  },
  {
    id: "project_repo_mri_real",
    label: "ProjectRepoMriReal",
    npmScript: "benchmark:project-repo-mri-real",
    jsonPath: "benchmark-results/project-repo-mri-real-latest.json"
  },
  {
    id: "project_repo_mri_local_checkout",
    label: "ProjectRepoMriLocalCheckout",
    npmScript: "benchmark:project-repo-mri-local",
    jsonPath: "benchmark-results/project-repo-mri-local-checkout-latest.json"
  },
  {
    id: "research_plan",
    label: "ResearchPlan",
    npmScript: "benchmark:project-research-plan",
    jsonPath: "benchmark-results/project-research-plan-latest.json"
  },
  {
    id: "project_ideas",
    label: "ProjectIdeas",
    npmScript: "benchmark:project-ideas",
    jsonPath: "benchmark-results/project-idea-discovery-latest.json"
  },
  {
    id: "project_ai_ideas",
    label: "ProjectAIIdeas",
    npmScript: "benchmark:project-ai-ideas",
    jsonPath: "benchmark-results/project-ai-idea-latest.json"
  },
  {
    id: "project_github_collector",
    label: "ProjectGithubCollector",
    npmScript: "benchmark:project-github-collector",
    jsonPath: "benchmark-results/project-github-collector-latest.json"
  },
  {
    id: "project_gh_archive_trends",
    label: "ProjectGhArchiveTrends",
    npmScript: "benchmark:project-gh-archive-trends",
    jsonPath: "benchmark-results/project-gh-archive-trends-latest.json"
  },
  {
    id: "project_live_batch_sampling",
    label: "ProjectLiveBatchSampling",
    npmScript: "benchmark:project-live-batch",
    jsonPath: "benchmark-results/project-live-batch-sampling-latest.json"
  },
  {
    id: "project_ideas_runner",
    label: "ProjectIdeasRunner",
    npmScript: "benchmark:project-ideas-runner",
    jsonPath: "benchmark-results/project-idea-runner-latest.json"
  },
  {
    id: "project_idea_to_research",
    label: "ProjectIdeaToResearch",
    npmScript: "benchmark:project-idea-to-research",
    jsonPath: "benchmark-results/project-idea-to-research-latest.json"
  },
  {
    id: "research_evidence",
    label: "ProjectResearchEvidence",
    npmScript: "benchmark:project-research-evidence",
    jsonPath: "benchmark-results/project-research-evidence-latest.json"
  },
  {
    id: "research_brief",
    label: "ProjectResearchBrief",
    npmScript: "benchmark:project-research-brief",
    jsonPath: "benchmark-results/project-research-brief-latest.json"
  },
  {
    id: "research_runner",
    label: "ProjectResearchRunner",
    npmScript: "benchmark:project-research-runner",
    jsonPath: "benchmark-results/project-research-runner-latest.json"
  },
  {
    id: "project_cli",
    label: "ProjectCLI",
    npmScript: "benchmark:project-cli",
    jsonPath: "benchmark-results/project-cli-latest.json"
  },
  {
    id: "project_prd",
    label: "ProjectPRD",
    npmScript: "benchmark:project-prd",
    jsonPath: "benchmark-results/project-prd-latest.json"
  },
  {
    id: "project_architecture",
    label: "ProjectArchitecture",
    npmScript: "benchmark:project-architecture",
    jsonPath: "benchmark-results/project-architecture-latest.json"
  }
];

const jsonOutputPath =
  process.env.PROJECT_PIPELINE_BENCHMARK_JSON ??
  "benchmark-results/project-pipeline-latest.json";
const markdownOutputPath =
  process.env.PROJECT_PIPELINE_BENCHMARK_MARKDOWN ??
  "benchmark-results/project-pipeline-latest.md";

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

function npmCommand() {
  return "npm";
}

function runBenchmark(definition: BenchmarkDefinition) {
  const result =
    process.platform === "win32"
      ? spawnSync(`npm run ${definition.npmScript}`, {
          encoding: "utf8",
          shell: true,
          stdio: "inherit"
        })
      : spawnSync(npmCommand(), ["run", definition.npmScript], {
          encoding: "utf8",
          stdio: "inherit"
        });

  return result.status ?? 1;
}

function numberMetric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function extractKeyMetrics(report: Record<string, unknown>) {
  const metrics: Record<string, number | string | boolean> = {};
  const metricKeys = [
    "averageExpectedBucketRecall",
    "scriptPassCount",
    "artifactPassCount",
    "metricPassCount",
    "singleQueryFailureCount",
    "promisingCount",
    "cloneRejectedCount",
    "averageNovelty",
    "averageMvpFeasibility",
    "averagePersonalUtility",
    "averageGithubSignalStrength",
    "top1FileAccuracy",
    "top1SymbolAccuracy",
    "top3FileAccuracy",
    "top3SymbolAccuracy",
    "top5TestFileAccuracy",
    "relatedTestAccuracy",
    "noDirectTestHonestyRate",
    "callGraphRootCauseAccuracy",
    "indirectRelatedTestAccuracy",
    "ambiguousTop3HonestyRate",
    "minimalNextActionAccuracy",
    "evidenceCompleteness",
    "lineRangeCompleteness",
    "relatedTestsCompleteness",
    "unknownsCompleteness",
    "whyNotCompleteness",
    "secretIgnoreRate",
    "averageShortlistSourceDominance",
    "maxIdeasPerSource",
    "rawRejectCount",
    "guardedUsableCount",
    "guardedStrongCount",
    "cloneCandidateRejectedCount",
    "averageRawScore",
    "averageGuardedScore",
    "researchReadyCount",
    "pipelineInputValidCount",
    "averageHandoffQualityScore",
    "handoffReadyCount",
    "returnedRepoCount",
    "readmeFetchedCount",
    "issuesFetchedCount",
    "warningCount",
    "cacheHitCount",
    "maxBqCallCount",
    "sourceRepoCount",
    "trendRepoCount",
    "blockerCount",
    "averageIdeaArtifactCompleteness",
    "trendRadarCategoryCount",
    "trendRadarTopOpportunityCount",
    "averageAuditScore",
    "auditReadyCount",
    "handoffReadyCount",
    "averageHandoffQualityScore",
    "averageResearchArtifactCompleteness",
    "ideaInputValidCount",
    "briefSchemaValidCount",
    "readyForArchitectureCount",
    "averageBucketCoverage",
    "averageRequiredCoverage",
    "averageArtifactCompleteness",
    "schemaValidCount",
    "prdSchemaValidCount",
    "architectureSchemaValidCount",
    "averageTraceabilityCoverage",
    "averageComponentTraceability",
    "averageDecisionPaperCoverage",
    "averageJudgeScore"
  ];

  for (const key of metricKeys) {
    const value = report[key];
    if (
      typeof value === "number" ||
      typeof value === "string" ||
      typeof value === "boolean"
    ) {
      metrics[key] = value;
    }
  }

  return metrics;
}

async function readBenchmarkSummary(
  definition: BenchmarkDefinition,
  exitCode: number
): Promise<BenchmarkSummary> {
  const raw = await readFile(definition.jsonPath, "utf8");
  const report = JSON.parse(raw) as Record<string, unknown>;
  const caseCount = numberMetric(report.caseCount) ?? 0;
  const passCount = numberMetric(report.passCount) ?? 0;

  return {
    ...definition,
    exitCode,
    caseCount,
    passCount,
    passRate: caseCount > 0 ? passCount / caseCount : 0,
    keyMetrics: extractKeyMetrics(report)
  };
}

function renderMarkdownReport(input: {
  generatedAt: string;
  benchmarkCount: number;
  passCount: number;
  totalCases: number;
  totalPassedCases: number;
  allPassed: boolean;
  summaries: BenchmarkSummary[];
}) {
  const lines = [
    "# Project Pipeline Benchmark",
    "",
    `Generated at: ${input.generatedAt}`,
    `Benchmarks: ${input.passCount}/${input.benchmarkCount}`,
    `Cases: ${input.totalPassedCases}/${input.totalCases}`,
    `Overall pass: ${input.allPassed ? "yes" : "no"}`,
    "",
    "## Benchmarks",
    ""
  ];

  for (const summary of input.summaries) {
    const passed =
      summary.exitCode === 0 &&
      summary.caseCount > 0 &&
      summary.passCount === summary.caseCount;
    lines.push(`### ${passed ? "PASS" : "FAIL"} ${summary.label}`);
    lines.push("");
    lines.push(`- Script: ${summary.npmScript}`);
    lines.push(`- Exit code: ${summary.exitCode}`);
    lines.push(`- Cases: ${summary.passCount}/${summary.caseCount}`);
    lines.push(`- Pass rate: ${pct(summary.passRate)}`);

    for (const [key, value] of Object.entries(summary.keyMetrics)) {
      lines.push(
        `- ${key}: ${typeof value === "number" ? value.toString() : String(value)}`
      );
    }

    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const summaries: BenchmarkSummary[] = [];

  for (const definition of benchmarkDefinitions) {
    const exitCode = runBenchmark(definition);
    summaries.push(await readBenchmarkSummary(definition, exitCode));
  }

  const totalCases = summaries.reduce(
    (sum, summary) => sum + summary.caseCount,
    0
  );
  const totalPassedCases = summaries.reduce(
    (sum, summary) => sum + summary.passCount,
    0
  );
  const passCount = summaries.filter(
    (summary) =>
      summary.exitCode === 0 &&
      summary.caseCount > 0 &&
      summary.passCount === summary.caseCount
  ).length;
  const allPassed =
    passCount === summaries.length && totalCases > 0 && totalPassedCases === totalCases;
  const report = {
    generatedAt: new Date().toISOString(),
    benchmarkCount: summaries.length,
    passCount,
    totalCases,
    totalPassedCases,
    allPassed,
    summaries
  };

  await writeTextFile(jsonOutputPath, JSON.stringify(report, null, 2));
  await writeTextFile(markdownOutputPath, renderMarkdownReport(report));

  console.log(
    [
      "Project pipeline benchmark",
      `Benchmarks: ${passCount}/${summaries.length}`,
      `Cases: ${totalPassedCases}/${totalCases}`,
      `Overall pass: ${allPassed ? "yes" : "no"}`,
      `JSON: ${jsonOutputPath}`,
      `Markdown: ${markdownOutputPath}`
    ].join("\n")
  );

  if (!allPassed) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

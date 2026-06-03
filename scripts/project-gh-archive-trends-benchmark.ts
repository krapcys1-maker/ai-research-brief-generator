import {
  collectGhArchiveTrends,
  GhArchiveTrendResultSchema
} from "@/lib/project-ideas";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type CaseResult = {
  id: string;
  passed: boolean;
  schemaValid: boolean;
  dryRun: boolean;
  repoCount: number;
  warningCount: number;
  estimatedBytesProcessed: number | null;
  bqCallCount: number;
};

const jsonOutputPath =
  process.env.PROJECT_GH_ARCHIVE_TRENDS_BENCHMARK_JSON ??
  "benchmark-results/project-gh-archive-trends-latest.json";
const markdownOutputPath =
  process.env.PROJECT_GH_ARCHIVE_TRENDS_BENCHMARK_MARKDOWN ??
  "benchmark-results/project-gh-archive-trends-latest.md";

async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

async function evaluateDryRunCase(): Promise<CaseResult> {
  const calls: string[][] = [];
  const result = await collectGhArchiveTrends({
    startDate: "2025-01-01",
    maxRepos: 25,
    maxBytesBilled: 200_000_000,
    dryRun: true,
    bqExecutor: (args) => {
      calls.push(args);
      return {
        status: 0,
        stdout:
          "Query successfully validated. Assuming the tables are not modified, running this query will process 155658473 bytes of data.",
        stderr: ""
      };
    }
  });
  const schemaValid = GhArchiveTrendResultSchema.safeParse(result).success;

  return {
    id: "dry_run_estimates_bytes_without_live_query",
    passed:
      schemaValid &&
      result.diagnostics.dryRun &&
      result.diagnostics.estimatedBytesProcessed === 155658473 &&
      result.repos.length === 0 &&
      calls.length === 1,
    schemaValid,
    dryRun: result.diagnostics.dryRun,
    repoCount: result.repos.length,
    warningCount: result.diagnostics.warnings.length,
    estimatedBytesProcessed: result.diagnostics.estimatedBytesProcessed,
    bqCallCount: calls.length
  };
}

async function evaluateBudgetBlockCase(): Promise<CaseResult> {
  const calls: string[][] = [];
  const result = await collectGhArchiveTrends({
    startDate: "2025-01-01",
    maxRepos: 25,
    maxBytesBilled: 100,
    dryRun: false,
    bqExecutor: (args) => {
      calls.push(args);
      return {
        status: 0,
        stdout:
          "Query successfully validated. Assuming the tables are not modified, running this query will process 500 bytes of data.",
        stderr: ""
      };
    }
  });
  const schemaValid = GhArchiveTrendResultSchema.safeParse(result).success;

  return {
    id: "budget_guard_blocks_large_estimate",
    passed:
      schemaValid &&
      result.repos.length === 0 &&
      result.diagnostics.warnings.some((warning) =>
        warning.includes("above maxBytesBilled")
      ) &&
      calls.length === 1,
    schemaValid,
    dryRun: result.diagnostics.dryRun,
    repoCount: result.repos.length,
    warningCount: result.diagnostics.warnings.length,
    estimatedBytesProcessed: result.diagnostics.estimatedBytesProcessed,
    bqCallCount: calls.length
  };
}

async function evaluateSafeLiveCase(): Promise<CaseResult> {
  const calls: string[][] = [];
  const result = await collectGhArchiveTrends({
    startDate: "2025-01-01",
    maxRepos: 10,
    maxBytesBilled: 200_000_000,
    dryRun: false,
    bqExecutor: (args) => {
      calls.push(args);
      if (args.includes("--dry_run")) {
        return {
          status: 0,
          stdout:
            "Query successfully validated. Assuming the tables are not modified, running this query will process 155658473 bytes of data.",
          stderr: ""
        };
      }

      return {
        status: 0,
        stdout: JSON.stringify([
          {
            repoFullName: "deepseek-ai/DeepSeek-V3",
            stars: "680",
            forks: "12",
            pushes: "8",
            issues: "3",
            trendScore: "3434"
          },
          {
            repoFullName: "huggingface/smolagents",
            stars: "501",
            forks: "9",
            pushes: "12",
            issues: "4",
            trendScore: "2544"
          }
        ]),
        stderr: ""
      };
    }
  });
  const schemaValid = GhArchiveTrendResultSchema.safeParse(result).success;

  return {
    id: "safe_live_query_returns_ranked_repos",
    passed:
      schemaValid &&
      result.repos.length === 2 &&
      result.repos[0]?.repoFullName === "deepseek-ai/DeepSeek-V3" &&
      calls.length === 2,
    schemaValid,
    dryRun: result.diagnostics.dryRun,
    repoCount: result.repos.length,
    warningCount: result.diagnostics.warnings.length,
    estimatedBytesProcessed: result.diagnostics.estimatedBytesProcessed,
    bqCallCount: calls.length
  };
}

function renderMarkdownReport(input: {
  generatedAt: string;
  caseCount: number;
  passCount: number;
  schemaValidCount: number;
  repoCount: number;
  warningCount: number;
  maxBqCallCount: number;
  results: CaseResult[];
}) {
  const lines = [
    "# Project GH Archive Trends Benchmark",
    "",
    `Generated at: ${input.generatedAt}`,
    `Cases: ${input.caseCount}`,
    `Pass count: ${input.passCount}/${input.caseCount}`,
    `Schema valid: ${input.schemaValidCount}/${input.caseCount}`,
    `Repos returned: ${input.repoCount}`,
    `Warnings: ${input.warningCount}`,
    `Max BQ calls per case: ${input.maxBqCallCount}`,
    "",
    "## Cases",
    ""
  ];

  for (const result of input.results) {
    lines.push(`### ${result.passed ? "PASS" : "FAIL"} ${result.id}`);
    lines.push("");
    lines.push(`- Schema valid: ${result.schemaValid ? "yes" : "no"}`);
    lines.push(`- Dry run: ${result.dryRun ? "yes" : "no"}`);
    lines.push(`- Repos: ${result.repoCount}`);
    lines.push(`- Warnings: ${result.warningCount}`);
    lines.push(`- Estimated bytes: ${result.estimatedBytesProcessed ?? "unknown"}`);
    lines.push(`- BQ calls: ${result.bqCallCount}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const results = [
    await evaluateDryRunCase(),
    await evaluateBudgetBlockCase(),
    await evaluateSafeLiveCase()
  ];
  const report = {
    generatedAt: new Date().toISOString(),
    caseCount: results.length,
    passCount: results.filter((result) => result.passed).length,
    schemaValidCount: results.filter((result) => result.schemaValid).length,
    repoCount: results.reduce((sum, result) => sum + result.repoCount, 0),
    warningCount: results.reduce((sum, result) => sum + result.warningCount, 0),
    maxBqCallCount: Math.max(...results.map((result) => result.bqCallCount)),
    results
  };

  await writeTextFile(jsonOutputPath, JSON.stringify(report, null, 2));
  await writeTextFile(markdownOutputPath, renderMarkdownReport(report));

  console.log(
    [
      "Project GH Archive trends benchmark",
      `Cases: ${report.passCount}/${report.caseCount}`,
      `Repos returned: ${report.repoCount}`,
      `Warnings: ${report.warningCount}`,
      `Max BQ calls per case: ${report.maxBqCallCount}`,
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


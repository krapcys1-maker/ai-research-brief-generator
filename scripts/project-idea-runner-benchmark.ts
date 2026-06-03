import {
  IdeaDiscoveryReportSchema,
  runProjectIdeaDiscovery
} from "@/lib/project-ideas";
import { ProjectIdeaInputSchema } from "@/lib/project-research/schemas";
import type { FetchLike, IdeaSourceRepo } from "@/lib/project-ideas";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

type BenchmarkCase = {
  id: string;
  domain: string;
  sourceRepos?: IdeaSourceRepo[];
  useGhArchiveTrends?: boolean;
};

type CaseResult = {
  id: string;
  domain: string;
  artifactCompleteness: number;
  schemaValid: boolean;
  projectIdeaInputValidCount: number;
  promisingCount: number;
  cloneRejectedCount: number;
  ghArchiveMode: string;
  ghArchiveTrendRepoCount: number;
  trendRadarCategoryCount: number;
  trendRadarTopOpportunityCount: number;
  passed: boolean;
};

const requiredFiles = [
  "manifest.json",
  "source_repos.json",
  "github_collection.json",
  "gh_archive_trends.json",
  "trend_radar.json",
  "trend_radar.md",
  "repo_insights.json",
  "discovered_ideas.json",
  "idea_scores.json",
  "rejected_ideas.json",
  "shortlist.json",
  "project_idea_inputs.json",
  "idea_discovery_report.json",
  "idea_discovery_report.md"
];
const jsonOutputPath =
  process.env.PROJECT_IDEA_RUNNER_BENCHMARK_JSON ??
  "benchmark-results/project-idea-runner-latest.json";
const markdownOutputPath =
  process.env.PROJECT_IDEA_RUNNER_BENCHMARK_MARKDOWN ??
  "benchmark-results/project-idea-runner-latest.md";

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function repo(input: {
  repoId: string;
  name: string;
  description: string;
  topics: string[];
  readmeText: string;
  issueTitle: string;
  issueBody: string;
}): IdeaSourceRepo {
  return {
    repoId: input.repoId,
    name: input.name,
    owner: "runner-benchmark",
    url: `https://github.com/runner-benchmark/${input.name}`,
    description: input.description,
    topics: input.topics,
    primaryLanguage: "TypeScript",
    stars: 1600,
    forks: 120,
    openIssues: 20,
    createdAt: "2025-10-01T12:00:00.000Z",
    pushedAt: "2026-05-28T12:00:00.000Z",
    readmeText: input.readmeText,
    issueSignals: [
      {
        title: input.issueTitle,
        body: input.issueBody,
        labels: ["enhancement"]
      }
    ]
  };
}

const headers = {
  get(name: string) {
    const values: Record<string, string> = {
      "x-ratelimit-limit": "5000",
      "x-ratelimit-remaining": "4990",
      "x-ratelimit-reset": "1790000000"
    };

    return values[name.toLowerCase()] ?? null;
  }
};

const ghArchiveFetch: FetchLike = async (url) => {
  if (url.endsWith("/repos/huggingface/smolagents")) {
    return {
      ok: true,
      status: 200,
      headers,
      async json() {
        return {
          id: 2,
          name: "smolagents",
          full_name: "huggingface/smolagents",
          owner: { login: "huggingface" },
          html_url: "https://github.com/huggingface/smolagents",
          description: "Small agent framework for tool-using AI workflows.",
          topics: ["agents", "ai", "developer-tools"],
          language: "Python",
          stargazers_count: 4200,
          forks_count: 330,
          open_issues_count: 38,
          created_at: "2024-12-10T12:00:00.000Z",
          pushed_at: "2025-01-01T12:00:00.000Z"
        };
      }
    };
  }

  if (url.endsWith("/repos/huggingface/smolagents/readme")) {
    return {
      ok: true,
      status: 200,
      headers,
      async json() {
        return {
          content: Buffer.from(
            "AI agent framework that coordinates tools, code execution, and repeatable workflows."
          ).toString("base64")
        };
      }
    };
  }

  if (url.includes("/repos/huggingface/smolagents/issues")) {
    return {
      ok: true,
      status: 200,
      headers,
      async json() {
        return [
          {
            title: "Need workflow evaluation before production runs",
            body: "Agent runs need repeatable scoring, failure review, and safe rollout plans.",
            labels: [{ name: "enhancement" }]
          }
        ];
      }
    };
  }

  return {
    ok: false,
    status: 404,
    headers,
    async json() {
      return { message: `Unexpected URL ${url}` };
    }
  };
};

async function evaluateCase(testCase: BenchmarkCase, index: number) {
  const outputDir = join(
    tmpdir(),
    `project-idea-runner-benchmark-${Date.now()}-${index}`
  );
  const manifest = await runProjectIdeaDiscovery({
    domain: testCase.domain,
    constraints: ["MVP in 2 weeks"],
    sourceRepos: testCase.sourceRepos,
    ghArchiveTrends: testCase.useGhArchiveTrends
      ? {
          startDate: "2025-01-01",
          maxRepos: 5,
          maxBytesBilled: 200_000_000,
          dryRun: false
        }
      : undefined,
    maxIdeas: 3,
    outputLanguage: "pl",
    outputDir,
    bqExecutor: testCase.useGhArchiveTrends
      ? (args) => {
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
      : undefined,
    fetchFn: testCase.useGhArchiveTrends ? ghArchiveFetch : undefined
  });
  const existingFileCount = (
    await Promise.all(requiredFiles.map((file) => exists(join(outputDir, file))))
  ).filter(Boolean).length;
  const artifactCompleteness = existingFileCount / requiredFiles.length;
  const report = JSON.parse(
    await readFile(join(outputDir, "idea_discovery_report.json"), "utf8")
  );
  const projectIdeaInputs = JSON.parse(
    await readFile(join(outputDir, "project_idea_inputs.json"), "utf8")
  ) as unknown[];
  const schemaValid = IdeaDiscoveryReportSchema.safeParse(report).success;
  const projectIdeaInputValidCount = projectIdeaInputs.filter(
    (idea) => ProjectIdeaInputSchema.safeParse(idea).success
  ).length;
  const passed =
    artifactCompleteness === 1 &&
    schemaValid &&
    manifest.promisingCount >= 1 &&
    manifest.cloneRejectedCount >= 1 &&
    manifest.trendRadarCategoryCount >= 1 &&
    manifest.trendRadarTopOpportunityCount >= 1 &&
    projectIdeaInputValidCount === manifest.projectIdeaInputCount;

  return {
    id: testCase.id,
    domain: testCase.domain,
    artifactCompleteness,
    schemaValid,
    projectIdeaInputValidCount,
    promisingCount: manifest.promisingCount,
    cloneRejectedCount: manifest.cloneRejectedCount,
    ghArchiveMode: manifest.ghArchiveMode,
    ghArchiveTrendRepoCount: manifest.ghArchiveTrendRepoCount,
    trendRadarCategoryCount: manifest.trendRadarCategoryCount,
    trendRadarTopOpportunityCount: manifest.trendRadarTopOpportunityCount,
    passed
  } satisfies CaseResult;
}

function renderMarkdownReport(input: {
  generatedAt: string;
  caseCount: number;
  passCount: number;
  averageArtifactCompleteness: number;
  schemaValidCount: number;
  projectIdeaInputValidCount: number;
  promisingCount: number;
  cloneRejectedCount: number;
  ghArchiveUsedCount: number;
  trendRadarCategoryCount: number;
  trendRadarTopOpportunityCount: number;
  results: CaseResult[];
}) {
  const lines = [
    "# Project Idea Runner Benchmark",
    "",
    `Generated at: ${input.generatedAt}`,
    `Cases: ${input.caseCount}`,
    `Pass count: ${input.passCount}/${input.caseCount}`,
    `Average artifact completeness: ${pct(input.averageArtifactCompleteness)}`,
    `Schema valid: ${input.schemaValidCount}/${input.caseCount}`,
    `Project idea inputs valid: ${input.projectIdeaInputValidCount}`,
    `Promising ideas: ${input.promisingCount}`,
    `Clone rejections: ${input.cloneRejectedCount}`,
    `GH Archive used cases: ${input.ghArchiveUsedCount}`,
    `Trend radar categories: ${input.trendRadarCategoryCount}`,
    `Trend radar opportunities: ${input.trendRadarTopOpportunityCount}`,
    "",
    "## Cases",
    ""
  ];

  for (const result of input.results) {
    lines.push(`### ${result.passed ? "PASS" : "FAIL"} ${result.id}`);
    lines.push("");
    lines.push(`- Domain: ${result.domain}`);
    lines.push(`- Artifact completeness: ${pct(result.artifactCompleteness)}`);
    lines.push(`- Schema valid: ${result.schemaValid ? "yes" : "no"}`);
    lines.push(`- Project idea inputs valid: ${result.projectIdeaInputValidCount}`);
    lines.push(`- Promising ideas: ${result.promisingCount}`);
    lines.push(`- Clone rejections: ${result.cloneRejectedCount}`);
    lines.push(`- GH Archive mode: ${result.ghArchiveMode}`);
    lines.push(`- GH Archive trend repos: ${result.ghArchiveTrendRepoCount}`);
    lines.push(`- Trend radar categories: ${result.trendRadarCategoryCount}`);
    lines.push(`- Trend radar opportunities: ${result.trendRadarTopOpportunityCount}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const cases: BenchmarkCase[] = [
    {
      id: "developer_tools_artifacts",
      domain: "AI developer tools",
      sourceRepos: [
        repo({
          repoId: "repo_code_review_agent",
          name: "ai-code-review-agent",
          description: "AI agent for code review and pull request comments.",
          topics: ["ai", "code-review", "developer-tools"],
          readmeText:
            "AI code review agent that reads repositories, reviews pull requests, and comments on code quality.",
          issueTitle: "Need better sprint planning for refactors",
          issueBody:
            "Review comments are useful, but we need prioritization and sprint-sized plans."
        })
      ]
    },
    {
      id: "gh_archive_trend_artifacts",
      domain: "AI agent operations",
      useGhArchiveTrends: true
    },
    {
      id: "data_agent_artifacts",
      domain: "AI data analysis agents",
      sourceRepos: [
        repo({
          repoId: "repo_data_agent",
          name: "ai-data-analysis-agent",
          description: "AI data analysis agent for CSV files and reports.",
          topics: ["ai", "data-analysis", "analytics"],
          readmeText:
            "Data analytics agent that profiles CSV files, generates dashboards, and writes reports.",
          issueTitle: "Need data quality investigation before charts",
          issueBody:
            "Charts are not useful when data has missing values, duplicates, or broken joins."
        })
      ]
    }
  ];
  const results = await Promise.all(cases.map(evaluateCase));
  const report = {
    generatedAt: new Date().toISOString(),
    caseCount: results.length,
    passCount: results.filter((result) => result.passed).length,
    averageArtifactCompleteness:
      results.reduce((sum, result) => sum + result.artifactCompleteness, 0) /
      results.length,
    schemaValidCount: results.filter((result) => result.schemaValid).length,
    projectIdeaInputValidCount: results.reduce(
      (sum, result) => sum + result.projectIdeaInputValidCount,
      0
    ),
    promisingCount: results.reduce((sum, result) => sum + result.promisingCount, 0),
    cloneRejectedCount: results.reduce(
      (sum, result) => sum + result.cloneRejectedCount,
      0
    ),
    ghArchiveUsedCount: results.filter((result) => result.ghArchiveMode === "used")
      .length,
    trendRadarCategoryCount: results.reduce(
      (sum, result) => sum + result.trendRadarCategoryCount,
      0
    ),
    trendRadarTopOpportunityCount: results.reduce(
      (sum, result) => sum + result.trendRadarTopOpportunityCount,
      0
    ),
    results
  };

  await writeTextFile(jsonOutputPath, JSON.stringify(report, null, 2));
  await writeTextFile(markdownOutputPath, renderMarkdownReport(report));

  console.log(
    [
      "Project idea runner benchmark",
      `Cases: ${report.passCount}/${report.caseCount}`,
      `Average artifact completeness: ${pct(report.averageArtifactCompleteness)}`,
      `Project idea inputs valid: ${report.projectIdeaInputValidCount}`,
      `Promising ideas: ${report.promisingCount}`,
      `Clone rejections: ${report.cloneRejectedCount}`,
      `GH Archive used cases: ${report.ghArchiveUsedCount}`,
      `Trend radar categories: ${report.trendRadarCategoryCount}`,
      `Trend radar opportunities: ${report.trendRadarTopOpportunityCount}`,
      `JSON: ${jsonOutputPath}`,
      `Markdown: ${markdownOutputPath}`
    ].join("\n")
  );

  if (report.passCount !== report.caseCount || report.averageArtifactCompleteness < 1) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

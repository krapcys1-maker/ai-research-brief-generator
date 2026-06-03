import {
  clearGithubIdeaCollectorCache,
  collectGithubIdeaSourceRepos,
  GithubIdeaCollectorResultSchema
} from "@/lib/project-ideas";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type MockResponseInput = {
  ok?: boolean;
  status?: number;
  json: unknown;
  headers?: Record<string, string>;
};

type CaseResult = {
  id: string;
  passed: boolean;
  schemaValid: boolean;
  returnedRepoCount: number;
  readmeFetchedCount: number;
  issuesFetchedCount: number;
  warningCount: number;
  cached: boolean;
};

const jsonOutputPath =
  process.env.PROJECT_GITHUB_COLLECTOR_BENCHMARK_JSON ??
  "benchmark-results/project-github-collector-latest.json";
const markdownOutputPath =
  process.env.PROJECT_GITHUB_COLLECTOR_BENCHMARK_MARKDOWN ??
  "benchmark-results/project-github-collector-latest.md";

function mockResponse(input: MockResponseInput) {
  const headers = new Map(
    Object.entries(input.headers ?? {}).map(([key, value]) => [
      key.toLowerCase(),
      value
    ])
  );

  return {
    ok: input.ok ?? true,
    status: input.status ?? 200,
    headers: {
      get(name: string) {
        return headers.get(name.toLowerCase()) ?? null;
      }
    },
    async json() {
      return input.json;
    }
  };
}

function searchPayload() {
  return {
    items: [
      {
        name: "ai-code-review-agent",
        full_name: "benchmark/ai-code-review-agent",
        owner: { login: "benchmark" },
        html_url: "https://github.com/benchmark/ai-code-review-agent",
        description: "AI code review agent.",
        topics: ["ai", "code-review", "developer-tools"],
        language: "TypeScript",
        stargazers_count: 1800,
        forks_count: 140,
        open_issues_count: 24,
        created_at: "2025-10-01T12:00:00.000Z",
        pushed_at: "2026-05-28T12:00:00.000Z"
      },
      {
        name: "ai-data-analysis-agent",
        full_name: "benchmark/ai-data-analysis-agent",
        owner: { login: "benchmark" },
        html_url: "https://github.com/benchmark/ai-data-analysis-agent",
        description: "AI data analysis agent.",
        topics: ["ai", "analytics"],
        language: "Python",
        stargazers_count: 1100,
        forks_count: 112,
        open_issues_count: 21,
        created_at: "2025-10-01T12:00:00.000Z",
        pushed_at: "2026-05-28T12:00:00.000Z"
      }
    ]
  };
}

function readmePayload(text: string) {
  return {
    content: Buffer.from(text).toString("base64")
  };
}

function issuesPayload(title: string, body: string) {
  return [
    {
      title,
      body,
      labels: [{ name: "enhancement" }]
    }
  ];
}

async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

async function evaluateHappyPath(): Promise<CaseResult> {
  clearGithubIdeaCollectorCache();
  const responses = [
    mockResponse({
      headers: {
        "x-ratelimit-limit": "30",
        "x-ratelimit-remaining": "29",
        "x-ratelimit-reset": "1780000000"
      },
      json: searchPayload()
    }),
    mockResponse({
      json: readmePayload(
        "AI code review agent for repositories and pull request analysis."
      )
    }),
    mockResponse({
      json: issuesPayload(
        "Need sprint planning",
        "Pull request review is not enough; refactor planning is missing."
      )
    }),
    mockResponse({
      json: readmePayload(
        "AI data analytics agent for CSV profiling, dashboards, and reports."
      )
    }),
    mockResponse({
      json: issuesPayload(
        "Need data quality investigation",
        "Charts are not useful before missing values and duplicates are understood."
      )
    })
  ];
  let index = 0;
  const fetchFn = async () => responses[index++] ?? responses.at(-1)!;
  const result = await collectGithubIdeaSourceRepos({
    query: "topic:ai stars:>100",
    maxRepos: 2,
    fetchFn
  });
  const schemaValid = GithubIdeaCollectorResultSchema.safeParse(result).success;
  const passed =
    schemaValid &&
    result.sourceRepos.length === 2 &&
    result.diagnostics.returnedRepoCount === 2 &&
    result.diagnostics.readmeFetchedCount === 2 &&
    result.diagnostics.issuesFetchedCount === 2 &&
    result.diagnostics.rateLimit?.remaining === 29;

  return {
    id: "happy_path_maps_repos",
    passed,
    schemaValid,
    returnedRepoCount: result.diagnostics.returnedRepoCount,
    readmeFetchedCount: result.diagnostics.readmeFetchedCount,
    issuesFetchedCount: result.diagnostics.issuesFetchedCount,
    warningCount: result.diagnostics.warnings.length,
    cached: result.diagnostics.cached
  };
}

async function evaluateCachePath(): Promise<CaseResult> {
  clearGithubIdeaCollectorCache();
  let fetchCount = 0;
  const fetchFn = async () => {
    fetchCount += 1;
    return mockResponse({
      json: searchPayload()
    });
  };

  await collectGithubIdeaSourceRepos({
    query: "topic:ai cache",
    maxRepos: 1,
    includeReadme: false,
    includeIssues: false,
    fetchFn
  });
  const cached = await collectGithubIdeaSourceRepos({
    query: "topic:ai cache",
    maxRepos: 1,
    includeReadme: false,
    includeIssues: false,
    fetchFn
  });
  const schemaValid = GithubIdeaCollectorResultSchema.safeParse(cached).success;
  const passed = schemaValid && cached.diagnostics.cached && fetchCount === 1;

  return {
    id: "cache_hit",
    passed,
    schemaValid,
    returnedRepoCount: cached.diagnostics.returnedRepoCount,
    readmeFetchedCount: cached.diagnostics.readmeFetchedCount,
    issuesFetchedCount: cached.diagnostics.issuesFetchedCount,
    warningCount: cached.diagnostics.warnings.length,
    cached: cached.diagnostics.cached
  };
}

async function evaluateErrorPath(): Promise<CaseResult> {
  clearGithubIdeaCollectorCache();
  const result = await collectGithubIdeaSourceRepos({
    query: "topic:ai error",
    fetchFn: async () =>
      mockResponse({
        ok: false,
        status: 403,
        headers: {
          "x-ratelimit-limit": "10",
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": "1780000000"
        },
        json: { message: "API rate limit exceeded" }
      })
  });
  const schemaValid = GithubIdeaCollectorResultSchema.safeParse(result).success;
  const passed =
    schemaValid &&
    result.sourceRepos.length === 0 &&
    result.diagnostics.warnings.includes("API rate limit exceeded") &&
    result.diagnostics.rateLimit?.remaining === 0;

  return {
    id: "rate_limit_diagnostics",
    passed,
    schemaValid,
    returnedRepoCount: result.diagnostics.returnedRepoCount,
    readmeFetchedCount: result.diagnostics.readmeFetchedCount,
    issuesFetchedCount: result.diagnostics.issuesFetchedCount,
    warningCount: result.diagnostics.warnings.length,
    cached: result.diagnostics.cached
  };
}

function renderMarkdownReport(input: {
  generatedAt: string;
  caseCount: number;
  passCount: number;
  schemaValidCount: number;
  returnedRepoCount: number;
  readmeFetchedCount: number;
  issuesFetchedCount: number;
  warningCount: number;
  cacheHitCount: number;
  results: CaseResult[];
}) {
  const lines = [
    "# Project GitHub Collector Benchmark",
    "",
    `Generated at: ${input.generatedAt}`,
    `Cases: ${input.caseCount}`,
    `Pass count: ${input.passCount}/${input.caseCount}`,
    `Schema valid: ${input.schemaValidCount}/${input.caseCount}`,
    `Returned repos: ${input.returnedRepoCount}`,
    `README fetched: ${input.readmeFetchedCount}`,
    `Issues fetched: ${input.issuesFetchedCount}`,
    `Warnings: ${input.warningCount}`,
    `Cache hits: ${input.cacheHitCount}`,
    "",
    "## Cases",
    ""
  ];

  for (const result of input.results) {
    lines.push(`### ${result.passed ? "PASS" : "FAIL"} ${result.id}`);
    lines.push("");
    lines.push(`- Schema valid: ${result.schemaValid ? "yes" : "no"}`);
    lines.push(`- Returned repos: ${result.returnedRepoCount}`);
    lines.push(`- README fetched: ${result.readmeFetchedCount}`);
    lines.push(`- Issues fetched: ${result.issuesFetchedCount}`);
    lines.push(`- Warnings: ${result.warningCount}`);
    lines.push(`- Cached: ${result.cached ? "yes" : "no"}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const results = [
    await evaluateHappyPath(),
    await evaluateCachePath(),
    await evaluateErrorPath()
  ];
  const report = {
    generatedAt: new Date().toISOString(),
    caseCount: results.length,
    passCount: results.filter((result) => result.passed).length,
    schemaValidCount: results.filter((result) => result.schemaValid).length,
    returnedRepoCount: results.reduce(
      (sum, result) => sum + result.returnedRepoCount,
      0
    ),
    readmeFetchedCount: results.reduce(
      (sum, result) => sum + result.readmeFetchedCount,
      0
    ),
    issuesFetchedCount: results.reduce(
      (sum, result) => sum + result.issuesFetchedCount,
      0
    ),
    warningCount: results.reduce((sum, result) => sum + result.warningCount, 0),
    cacheHitCount: results.filter((result) => result.cached).length,
    results
  };

  await writeTextFile(jsonOutputPath, JSON.stringify(report, null, 2));
  await writeTextFile(markdownOutputPath, renderMarkdownReport(report));

  console.log(
    [
      "Project GitHub collector benchmark",
      `Cases: ${report.passCount}/${report.caseCount}`,
      `Returned repos: ${report.returnedRepoCount}`,
      `README fetched: ${report.readmeFetchedCount}`,
      `Issues fetched: ${report.issuesFetchedCount}`,
      `Cache hits: ${report.cacheHitCount}`,
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


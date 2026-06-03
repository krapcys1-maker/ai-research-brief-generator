import { runControlledLiveBatchSampling } from "@/lib/project-ideas";
import type { FetchLike } from "@/lib/project-ideas";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type CaseResult = {
  id: string;
  passed: boolean;
  verdict: string;
  mode: string;
  trendRepoCount: number;
  sourceRepoCount: number;
  handoffReadyCount: number;
  averageHandoffQualityScore: number;
  blockerCount: number;
  estimatedBytesProcessed: number | null;
};

const jsonOutputPath =
  process.env.PROJECT_LIVE_BATCH_BENCHMARK_JSON ??
  "benchmark-results/project-live-batch-sampling-latest.json";
const markdownOutputPath =
  process.env.PROJECT_LIVE_BATCH_BENCHMARK_MARKDOWN ??
  "benchmark-results/project-live-batch-sampling-latest.md";

const repoFixtures = {
  "sample/document-conversion-qa": {
    description: "Document conversion pipeline for PDF, Office documents and Markdown.",
    topics: ["document-conversion", "markdown", "pdf"],
    language: "TypeScript",
    readme:
      "Converts office documents and PDFs into Markdown for RAG ingestion with table handling.",
    issue:
      "Teams need QA fixtures for lost tables, citation drift, encoding problems and unsafe input handling."
  },
  "sample/context-budget-monitor": {
    description: "Context compression and token optimization for RAG chunks.",
    topics: ["context-compression", "rag", "token-optimization"],
    language: "Python",
    readme:
      "Compresses RAG chunks and agent context windows while tracking token budgets.",
    issue:
      "Users need evidence that compression keeps facts, code intent and citations before model calls."
  },
  "sample/provider-routing-health": {
    description: "Provider-management for Claude Code, Codex and Gemini CLI routing.",
    topics: ["provider-management", "codex", "gemini-cli"],
    language: "Go",
    readme:
      "Switches AI coding CLI providers and diagnoses capability mismatches.",
    issue:
      "Auth failures and model capability gaps need clearer fallback routes across AI coding CLIs."
  },
  "sample/agent-approval-console": {
    description: "Desktop client approval dialog for agent tool calls.",
    topics: ["agent", "approval-dialog", "tool-calls"],
    language: "TypeScript",
    readme:
      "Tracks command confirmation and security approval flows for agent desktop clients.",
    issue:
      "Users need recovery paths when command approval blocks legitimate automation or hides risk."
  },
  "sample/llm-release-radar": {
    description: "LLM inference deployment benchmark and model serving release tools.",
    topics: ["llm", "inference", "model-serving"],
    language: "Python",
    readme:
      "Model serving deployment repo with benchmark harness, rollback notes and inference release checks.",
    issue:
      "Platform teams need regression gates, cost checks and rollback planning before shipping model changes."
  }
} satisfies Record<
  string,
  {
    description: string;
    topics: string[];
    language: string;
    readme: string;
    issue: string;
  }
>;

const repoNames = Object.keys(repoFixtures);

const headers = {
  get(name: string) {
    const values: Record<string, string> = {
      "x-ratelimit-limit": "5000",
      "x-ratelimit-remaining": "4980",
      "x-ratelimit-reset": "1790000000"
    };

    return values[name.toLowerCase()] ?? null;
  }
};

function bqExecutor(repoFullNames = repoNames) {
  return (args: string[]) => {
    if (args.includes("--dry_run")) {
      return {
        status: 0,
        stdout:
          "Query successfully validated. Assuming the tables are not modified, running this query will process 120000000 bytes of data.",
        stderr: ""
      };
    }

    return {
      status: 0,
      stdout: JSON.stringify(
        repoFullNames.map((repoFullName, index) => ({
          repoFullName,
          stars: 600 - index * 20,
          forks: 80 - index * 5,
          pushes: 12 + index,
          issues: 4 + index,
          trendScore: 700 - index * 30
        }))
      ),
      stderr: ""
    };
  };
}

const fetchFn: FetchLike = async (url) => {
  const parsed = new URL(url);
  const repoMatch = parsed.pathname.match(/^\/repos\/([^/]+\/[^/]+)(?:\/(readme|issues))?$/);
  const repoFullName = repoMatch?.[1];
  const endpoint = repoMatch?.[2];
  const fixture = repoFullName ? repoFixtures[repoFullName] : undefined;

  if (!repoFullName || !fixture) {
    return {
      ok: false,
      status: 404,
      headers,
      async json() {
        return { message: `Unexpected URL ${url}` };
      }
    };
  }

  if (endpoint === "readme") {
    return {
      ok: true,
      status: 200,
      headers,
      async json() {
        return { content: Buffer.from(fixture.readme).toString("base64") };
      }
    };
  }

  if (endpoint === "issues") {
    return {
      ok: true,
      status: 200,
      headers,
      async json() {
        return [
          {
            title: "Need stronger productized quality gates",
            body: fixture.issue,
            labels: [{ name: "enhancement" }]
          }
        ];
      }
    };
  }

  const [owner, name] = repoFullName.split("/");

  return {
    ok: true,
    status: 200,
    headers,
    async json() {
      return {
        id: repoFullName.length,
        name,
        full_name: repoFullName,
        owner: { login: owner },
        html_url: `https://github.com/${repoFullName}`,
        description: fixture.description,
        topics: fixture.topics,
        language: fixture.language,
        stargazers_count: 4200,
        forks_count: 380,
        open_issues_count: 36,
        created_at: "2025-01-01T12:00:00.000Z",
        pushed_at: "2026-05-25T12:00:00.000Z"
      };
    }
  };
};

async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

async function evaluateCase(input: {
  id: string;
  mode: "dry_run" | "live";
  repoFullNames?: string[];
  expectedPass: boolean;
}) {
  const summary = await runControlledLiveBatchSampling({
    domain: "AI developer tools",
    constraints: ["avoid cloning source repositories", "MVP in two weeks"],
    windows: [{ id: input.id, startDate: "2025-01-01" }],
    mode: input.mode,
    allowLiveSpend: input.mode === "live",
    maxReposPerWindow: 10,
    maxBytesBilledPerWindow: 200_000_000,
    minSourceReposForPass: 5,
    minReadyIdeasForPass: 3,
    maxIdeas: 5,
    outputDir: `benchmark-results/live-batch-${input.id}`,
    bqExecutor: bqExecutor(input.repoFullNames),
    fetchFn
  });

  return {
    id: input.id,
    passed: summary.quality.passed === input.expectedPass,
    verdict: summary.quality.verdict,
    mode: summary.mode,
    trendRepoCount: summary.aggregate.uniqueTrendRepoCount,
    sourceRepoCount: summary.aggregate.sourceRepoCount,
    handoffReadyCount: summary.aggregate.handoffReadyCount,
    averageHandoffQualityScore: summary.aggregate.averageHandoffQualityScore,
    blockerCount: summary.quality.blockers.length,
    estimatedBytesProcessed: summary.budget.totalEstimatedBytesProcessed
  } satisfies CaseResult;
}

function renderMarkdownReport(input: {
  generatedAt: string;
  caseCount: number;
  passCount: number;
  results: CaseResult[];
}) {
  const lines = [
    "# Project Live Batch Sampling Benchmark",
    "",
    `Generated at: ${input.generatedAt}`,
    `Cases: ${input.passCount}/${input.caseCount}`,
    "",
    "## Cases",
    ""
  ];

  for (const result of input.results) {
    lines.push(`### ${result.passed ? "PASS" : "FAIL"} ${result.id}`);
    lines.push("");
    lines.push(`- Mode: ${result.mode}`);
    lines.push(`- Verdict: ${result.verdict}`);
    lines.push(`- Trend repos: ${result.trendRepoCount}`);
    lines.push(`- Source repos: ${result.sourceRepoCount}`);
    lines.push(`- Handoff-ready ideas: ${result.handoffReadyCount}`);
    lines.push(`- Average handoff quality: ${result.averageHandoffQualityScore}`);
    lines.push(`- Blockers: ${result.blockerCount}`);
    lines.push(`- Estimated bytes: ${result.estimatedBytesProcessed ?? "unknown"}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const results = [
    await evaluateCase({
      id: "dry_run_budget_gate",
      mode: "dry_run",
      expectedPass: true
    }),
    await evaluateCase({
      id: "live_quality_gate",
      mode: "live",
      expectedPass: true
    }),
    await evaluateCase({
      id: "too_small_live_sample",
      mode: "live",
      repoFullNames: ["sample/llm-release-radar"],
      expectedPass: false
    })
  ];
  const report = {
    generatedAt: new Date().toISOString(),
    caseCount: results.length,
    passCount: results.filter((result) => result.passed).length,
    trendRepoCount: Math.max(...results.map((result) => result.trendRepoCount)),
    sourceRepoCount: Math.max(...results.map((result) => result.sourceRepoCount)),
    handoffReadyCount: Math.max(
      ...results.map((result) => result.handoffReadyCount)
    ),
    averageHandoffQualityScore: Math.max(
      ...results.map((result) => result.averageHandoffQualityScore)
    ),
    blockerCount: results.reduce(
      (sum, result) => sum + result.blockerCount,
      0
    ),
    results
  };

  await writeTextFile(jsonOutputPath, JSON.stringify(report, null, 2));
  await writeTextFile(markdownOutputPath, renderMarkdownReport(report));

  console.log(
    [
      "Project live batch sampling benchmark",
      `Cases: ${report.passCount}/${report.caseCount}`,
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

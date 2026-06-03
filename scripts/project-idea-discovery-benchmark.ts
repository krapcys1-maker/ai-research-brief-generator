import {
  discoverProjectIdeas,
  IdeaDiscoveryReportSchema
} from "@/lib/project-ideas";
import { ProjectIdeaInputSchema } from "@/lib/project-research/schemas";
import type { IdeaSourceRepo } from "@/lib/project-ideas";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type BenchmarkCase = {
  id: string;
  domain: string;
  constraints: string[];
  sourceRepos: IdeaSourceRepo[];
};

type CaseResult = {
  id: string;
  domain: string;
  schemaValid: boolean;
  ideaCount: number;
  promisingCount: number;
  cloneRejectedCount: number;
  averageNovelty: number;
  averageMvpFeasibility: number;
  averageGithubSignalStrength: number;
  shortlistSourceDominance: number;
  maxIdeasPerSource: number;
  researchReadyCount: number;
  pipelineInputValidCount: number;
  passed: boolean;
  topIdeaTitle: string | null;
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

function repo(input: {
  repoId: string;
  name: string;
  description: string;
  topics: string[];
  primaryLanguage?: string;
  stars: number;
  forks: number;
  openIssues: number;
  readmeText: string;
  issueTitle: string;
  issueBody: string;
}): IdeaSourceRepo {
  return {
    repoId: input.repoId,
    name: input.name,
    owner: "benchmark",
    url: `https://github.com/benchmark/${input.name}`,
    description: input.description,
    topics: input.topics,
    primaryLanguage: input.primaryLanguage ?? "TypeScript",
    stars: input.stars,
    forks: input.forks,
    openIssues: input.openIssues,
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

const cases: BenchmarkCase[] = [
  {
    id: "ai_developer_tools",
    domain: "AI developer tools",
    constraints: ["MVP in 2 weeks", "no automatic code edits"],
    sourceRepos: [
      repo({
        repoId: "repo_code_review_agent",
        name: "ai-code-review-agent",
        description: "AI agent for code review and pull request comments.",
        topics: ["ai", "code-review", "developer-tools"],
        stars: 1800,
        forks: 140,
        openIssues: 24,
        readmeText:
          "AI code review agent that reads repositories, reviews pull requests, and comments on code quality.",
        issueTitle: "Need better sprint planning for refactors",
        issueBody:
          "Review comments are useful, but we need prioritization and sprint-sized plans."
      })
    ]
  },
  {
    id: "ai_trading_support",
    domain: "AI trading support",
    constraints: ["paper trading only", "no live execution"],
    sourceRepos: [
      repo({
        repoId: "repo_trading_agent",
        name: "ai-trading-agent",
        description: "AI trading bot with backtesting and market strategy generation.",
        topics: ["ai", "trading", "backtesting"],
        primaryLanguage: "Python",
        stars: 1450,
        forks: 180,
        openIssues: 19,
        readmeText:
          "Trading agent for strategy generation, backtest workflows, portfolio experiments, and market data analysis.",
        issueTitle: "Backtests look good but risk controls are unclear",
        issueBody:
          "We need scenario tests, drawdown checks, and guardrails before paper trading."
      })
    ]
  },
  {
    id: "ai_medical_documentation",
    domain: "AI medical documentation",
    constraints: ["human review required", "no diagnosis"],
    sourceRepos: [
      repo({
        repoId: "repo_clinical_rag",
        name: "clinical-rag-assistant",
        description:
          "Medical RAG assistant for clinical documents, citations, and healthcare summaries.",
        topics: ["ai", "medical", "rag", "healthcare"],
        stars: 1300,
        forks: 95,
        openIssues: 17,
        readmeText:
          "Clinical document retrieval, medical summaries, citation grounding, and patient note review.",
        issueTitle: "Need uncertainty and unsupported claim audit",
        issueBody:
          "Summaries need evidence traceability, uncertainty markers, and human approval before use."
      })
    ]
  },
  {
    id: "ai_education_tools",
    domain: "AI education tools",
    constraints: ["teacher remains final editor"],
    sourceRepos: [
      repo({
        repoId: "repo_ai_tutor",
        name: "adaptive-ai-tutor",
        description: "AI tutor for student questions, quizzes, lessons, and feedback.",
        topics: ["ai", "education", "tutoring"],
        stars: 900,
        forks: 88,
        openIssues: 14,
        readmeText:
          "AI education tool with lesson generation, student quiz feedback, and teacher dashboards.",
        issueTitle: "Teachers want misconception clusters",
        issueBody:
          "Instead of direct answers, teachers need recurring mistake patterns and next lesson plans."
      })
    ]
  },
  {
    id: "ai_data_analysis_agents",
    domain: "AI data analysis agents",
    constraints: ["audit-friendly output", "no silent data mutation"],
    sourceRepos: [
      repo({
        repoId: "repo_data_agent",
        name: "ai-data-analysis-agent",
        description: "AI data analysis agent for CSV files, dashboards, and reports.",
        topics: ["ai", "data-analysis", "analytics"],
        stars: 1100,
        forks: 112,
        openIssues: 21,
        readmeText:
          "Data analytics agent that profiles CSV files, generates dashboards, and writes natural language reports.",
        issueTitle: "Need data quality investigation before charts",
        issueBody:
          "Charts are not useful when data has missing values, duplicates, or broken joins."
      })
    ]
  },
  {
    id: "multi_source_diversity",
    domain: "AI developer infrastructure",
    constraints: ["preserve source diversity", "avoid clone-shaped ideas"],
    sourceRepos: [
      repo({
        repoId: "repo_markitdown",
        name: "markitdown",
        description: "Tool for converting documents to Markdown.",
        topics: ["markdown", "pdf", "document-ai"],
        primaryLanguage: "Python",
        stars: 18_000,
        forks: 1200,
        openIssues: 120,
        readmeText:
          "Converts PDF, Office, CSV, and other documents to Markdown for downstream LLM and RAG workflows.",
        issueTitle: "CsvConverter produces broken Markdown tables",
        issueBody: "Pipe characters in cells break converted Markdown tables."
      }),
      repo({
        repoId: "repo_headroom",
        name: "headroom",
        description: "Context compression for LLM and RAG workflows.",
        topics: ["context-compression", "rag", "llm"],
        primaryLanguage: "Rust",
        stars: 12_000,
        forks: 800,
        openIssues: 90,
        readmeText:
          "Compresses context windows and RAG chunks to reduce token usage.",
        issueTitle: "Need factual fidelity checks",
        issueBody: "Compression can lose facts, code intent, or retrieval evidence."
      }),
      repo({
        repoId: "repo_cc_switch",
        name: "cc-switch",
        description: "Switches AI CLI providers and model routing.",
        topics: ["codex", "claude-code", "provider-management"],
        stars: 9000,
        forks: 700,
        openIssues: 75,
        readmeText:
          "Configure provider routing for Codex, Claude Code, OpenCode, and Gemini CLI.",
        issueTitle: "Third-party provider returns 403 in Codex",
        issueBody: "The same provider works in one CLI but fails in another."
      })
    ]
  }
];

function evaluateCase(testCase: BenchmarkCase): CaseResult {
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
  const passed =
    parsed.success &&
    report.metrics.ideaCount >= 2 &&
    report.metrics.promisingCount >= 1 &&
    report.metrics.cloneRejectedCount >= 1 &&
    report.metrics.averageNovelty >= 0.7 &&
    report.metrics.averageMvpFeasibility >= 0.7 &&
    sourceDiversityPass &&
    report.metrics.researchReadyCount >= 1 &&
    pipelineInputValidCount === report.metrics.promisingCount;

  return {
    id: testCase.id,
    domain: testCase.domain,
    schemaValid: parsed.success,
    ideaCount: report.metrics.ideaCount,
    promisingCount: report.metrics.promisingCount,
    cloneRejectedCount: report.metrics.cloneRejectedCount,
    averageNovelty: report.metrics.averageNovelty,
    averageMvpFeasibility: report.metrics.averageMvpFeasibility,
    averageGithubSignalStrength: report.metrics.averageGithubSignalStrength,
    shortlistSourceDominance: report.metrics.shortlistSourceDominance,
    maxIdeasPerSource: report.metrics.maxIdeasPerSource,
    researchReadyCount: report.metrics.researchReadyCount,
    pipelineInputValidCount,
    passed,
    topIdeaTitle: report.shortlist[0]?.title ?? null
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
  averageGithubSignalStrength: number;
  averageShortlistSourceDominance: number;
  maxIdeasPerSource: number;
  researchReadyCount: number;
  pipelineInputValidCount: number;
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
    `Average GitHub signal: ${pct(input.averageGithubSignalStrength)}`,
    `Average shortlist source dominance: ${pct(input.averageShortlistSourceDominance)}`,
    `Max ideas per source: ${input.maxIdeasPerSource}`,
    `Research-ready ideas: ${input.researchReadyCount}`,
    `Pipeline inputs valid: ${input.pipelineInputValidCount}`,
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
    lines.push(`- Average GitHub signal: ${pct(result.averageGithubSignalStrength)}`);
    lines.push(`- Shortlist source dominance: ${pct(result.shortlistSourceDominance)}`);
    lines.push(`- Max ideas per source: ${result.maxIdeasPerSource}`);
    lines.push(`- Research-ready: ${result.researchReadyCount}`);
    lines.push(`- Pipeline inputs valid: ${result.pipelineInputValidCount}`);
    lines.push(`- Top idea: ${result.topIdeaTitle ?? "none"}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const results = cases.map(evaluateCase);
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
      `Average shortlist source dominance: ${pct(report.averageShortlistSourceDominance)}`,
      `Max ideas per source: ${report.maxIdeasPerSource}`,
      `Research-ready ideas: ${report.researchReadyCount}`,
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

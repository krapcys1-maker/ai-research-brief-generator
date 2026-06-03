import {
  IdeaDiscoveryReportSchema,
  runProjectIdeaDiscovery
} from "@/lib/project-ideas";
import { ProjectIdeaInputSchema } from "@/lib/project-research/schemas";
import type { IdeaSourceRepo } from "@/lib/project-ideas";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

type BenchmarkCase = {
  id: string;
  domain: string;
  sourceRepos: IdeaSourceRepo[];
};

type CaseResult = {
  id: string;
  domain: string;
  artifactCompleteness: number;
  schemaValid: boolean;
  projectIdeaInputValidCount: number;
  promisingCount: number;
  cloneRejectedCount: number;
  passed: boolean;
};

const requiredFiles = [
  "manifest.json",
  "source_repos.json",
  "github_collection.json",
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

async function evaluateCase(testCase: BenchmarkCase, index: number) {
  const outputDir = join(
    tmpdir(),
    `project-idea-runner-benchmark-${Date.now()}-${index}`
  );
  const manifest = await runProjectIdeaDiscovery({
    domain: testCase.domain,
    constraints: ["MVP in 2 weeks"],
    sourceRepos: testCase.sourceRepos,
    maxIdeas: 3,
    outputLanguage: "pl",
    outputDir
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
    projectIdeaInputValidCount === manifest.projectIdeaInputCount;

  return {
    id: testCase.id,
    domain: testCase.domain,
    artifactCompleteness,
    schemaValid,
    projectIdeaInputValidCount,
    promisingCount: manifest.promisingCount,
    cloneRejectedCount: manifest.cloneRejectedCount,
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


import { buildProjectResearchPlan } from "@/lib/project-research";
import { ProjectArchitectureSchema } from "@/lib/project-architecture";
import { ProjectPrdSchema } from "@/lib/project-prd";
import { ProjectResearchBriefSchema } from "@/lib/project-research/schemas";
import type {
  ProjectIdeaInput,
  ReviewedPaper
} from "@/lib/project-research";
import { spawnSync } from "node:child_process";
import {
  access,
  mkdtemp,
  mkdir,
  readFile,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

type CliBenchmarkCase = {
  id: string;
  expectedReady: boolean;
  input: unknown;
};

type CliCaseResult = {
  id: string;
  expectedReady: boolean;
  exitCode: number;
  artifactCompleteness: number;
  briefSchemaValid: boolean;
  prdSchemaValid: boolean;
  architectureSchemaValid: boolean;
  briefReady: boolean;
  prdStatus: "ready" | "blocked";
  architectureStatus: "ready" | "blocked";
  architectureJudgeScore: number;
  architectureJudgeVerdict: "pass" | "needs_review" | "fail";
};

const requiredFiles = [
  "manifest.json",
  "normalized_idea.json",
  "research_plan.json",
  "coverage.json",
  "source_search.json",
  "handoff_context.json",
  "handoff_context.md",
  "handoff_flag_resolution.json",
  "handoff_flag_resolution.md",
  "source_papers.json",
  "evidence_collection.json",
  "reviewed_papers.json",
  "project_research_brief.json",
  "project_research_brief.md",
  "project_prd.json",
  "project_prd.md",
  "project_architecture.json",
  "project_architecture.md",
  "project_architecture_judge.json",
  "project_architecture_judge.md"
];
const jsonOutputPath =
  process.env.PROJECT_CLI_BENCHMARK_JSON ??
  "benchmark-results/project-cli-latest.json";
const markdownOutputPath =
  process.env.PROJECT_CLI_BENCHMARK_MARKDOWN ??
  "benchmark-results/project-cli-latest.md";

const repoIdea: ProjectIdeaInput = {
  title: "Repo Optimizer AI",
  description:
    "Aplikacja skanujaca repozytoria, robiaca code review, wykrywajaca bugi i priorytetyzujaca refactor.",
  constraints: ["MVP tylko rekomenduje zmiany"],
  preferredDomains: ["software engineering", "LLM code review"],
  outputLanguage: "pl"
};

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

function quoteShellArg(value: string) {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function reviewedPaperForBucket(bucketId: string, index: number): ReviewedPaper {
  return {
    paperId: `cli_${bucketId}_${index}`,
    title: `CLI evidence for ${bucketId} ${index}`,
    year: 2025,
    url: `https://example.com/cli/${bucketId}/${index}`,
    doi: `10.1000/cli.${bucketId}.${index}`,
    bucketIds: [bucketId],
    fullTextStatus: "parsed",
    usefulForProject: true,
    evidenceStrength: "full_text_partial",
    keyMethods: [`method for ${bucketId}`],
    limitations: [`limitation for ${bucketId}`],
    implementationImplications: [`support ${bucketId} in CLI benchmark`],
    riskImplications: [`risk from ${bucketId}`]
  };
}

function blockedReviewedPapersForIdea(idea: ProjectIdeaInput) {
  const { researchPlan } = buildProjectResearchPlan(idea);
  return [
    reviewedPaperForBucket(researchPlan.evidenceBuckets[0].id, 1),
    reviewedPaperForBucket(researchPlan.evidenceBuckets[0].id, 2)
  ];
}

async function fileExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readJson(path: string) {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

async function readOptionalJson(path: string) {
  if (!(await fileExists(path))) {
    return null;
  }

  return readJson(path);
}

function runCli(inputPath: string, outputDir: string) {
  const result =
    process.platform === "win32"
      ? spawnSync(
          [
            "npm run project:research --",
            "--input",
            quoteShellArg(inputPath),
            "--out",
            quoteShellArg(outputDir)
          ].join(" "),
          {
            encoding: "utf8",
            shell: true,
            stdio: "pipe"
          }
        )
      : spawnSync(
          npmCommand(),
          ["run", "project:research", "--", "--input", inputPath, "--out", outputDir],
          {
            encoding: "utf8",
            stdio: "pipe"
          }
        );

  if (result.error) {
    console.error(result.error);
  }

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  return result.status ?? 1;
}

async function evaluateCase(
  testCase: CliBenchmarkCase,
  index: number
): Promise<CliCaseResult> {
  const workspace = await mkdtemp(join(tmpdir(), `project-cli-benchmark-${index}-`));
  const inputPath = join(workspace, "input.json");
  const outputDir = join(workspace, "out");
  await writeTextFile(inputPath, JSON.stringify(testCase.input, null, 2));

  const exitCode = runCli(inputPath, outputDir);
  const existingFileCount = (
    await Promise.all(requiredFiles.map((file) => fileExists(join(outputDir, file))))
  ).filter(Boolean).length;
  const artifactCompleteness = existingFileCount / requiredFiles.length;
  const brief = await readOptionalJson(join(outputDir, "project_research_brief.json"));
  const prd = await readOptionalJson(join(outputDir, "project_prd.json"));
  const architecture = await readOptionalJson(
    join(outputDir, "project_architecture.json")
  );
  const architectureJudge = (await readOptionalJson(
    join(outputDir, "project_architecture_judge.json")
  )) as { score?: number; verdict?: "pass" | "needs_review" | "fail" } | null;
  const parsedBrief = ProjectResearchBriefSchema.safeParse(brief);
  const parsedPrd = ProjectPrdSchema.safeParse(prd);
  const parsedArchitecture = ProjectArchitectureSchema.safeParse(architecture);

  return {
    id: testCase.id,
    expectedReady: testCase.expectedReady,
    exitCode,
    artifactCompleteness,
    briefSchemaValid: parsedBrief.success,
    prdSchemaValid: parsedPrd.success,
    architectureSchemaValid: parsedArchitecture.success,
    briefReady: parsedBrief.success ? parsedBrief.data.readyForArchitecture : false,
    prdStatus: parsedPrd.success ? parsedPrd.data.status : "blocked",
    architectureStatus: parsedArchitecture.success
      ? parsedArchitecture.data.status
      : "blocked",
    architectureJudgeScore: architectureJudge?.score ?? 0,
    architectureJudgeVerdict: architectureJudge?.verdict ?? "fail"
  };
}

function renderMarkdownReport(input: {
  generatedAt: string;
  caseCount: number;
  passCount: number;
  averageArtifactCompleteness: number;
  results: CliCaseResult[];
}) {
  const lines = [
    "# Project CLI Benchmark",
    "",
    `Generated at: ${input.generatedAt}`,
    `Cases: ${input.caseCount}`,
    `Pass count: ${input.passCount}/${input.caseCount}`,
    `Average artifact completeness: ${pct(input.averageArtifactCompleteness)}`,
    "",
    "## Cases",
    ""
  ];

  for (const result of input.results) {
    const expectedStatus = result.expectedReady ? "ready" : "blocked";
    const passed =
      result.exitCode === 0 &&
      result.artifactCompleteness === 1 &&
      result.briefSchemaValid &&
      result.prdSchemaValid &&
      result.architectureSchemaValid &&
      result.briefReady === result.expectedReady &&
      result.prdStatus === expectedStatus &&
      result.architectureStatus === expectedStatus &&
      (result.expectedReady
        ? result.architectureJudgeVerdict === "pass" &&
          result.architectureJudgeScore >= 90
        : result.architectureJudgeVerdict === "needs_review");

    lines.push(`### ${passed ? "PASS" : "FAIL"} ${result.id}`);
    lines.push("");
    lines.push(`- Exit code: ${result.exitCode}`);
    lines.push(`- Expected ready: ${result.expectedReady ? "yes" : "no"}`);
    lines.push(`- Brief ready: ${result.briefReady ? "yes" : "no"}`);
    lines.push(`- PRD status: ${result.prdStatus}`);
    lines.push(`- Architecture status: ${result.architectureStatus}`);
    lines.push(`- Architecture judge score: ${result.architectureJudgeScore}/100`);
    lines.push(`- Architecture judge verdict: ${result.architectureJudgeVerdict}`);
    lines.push(`- Artifact completeness: ${pct(result.artifactCompleteness)}`);
    lines.push(`- Brief schema valid: ${result.briefSchemaValid ? "yes" : "no"}`);
    lines.push(`- PRD schema valid: ${result.prdSchemaValid ? "yes" : "no"}`);
    lines.push(
      `- Architecture schema valid: ${result.architectureSchemaValid ? "yes" : "no"}`
    );
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const cases: CliBenchmarkCase[] = [
    {
      id: "medical_mock_source_search_ready",
      expectedReady: true,
      input: {
        idea: {
          title: "Medical RAG Assistant",
          description:
            "Healthcare AI assistant that retrieves clinical documents and supports diagnostic review.",
          constraints: ["nie stawia samodzielnej diagnozy"],
          preferredDomains: [],
          outputLanguage: "pl"
        },
        sourceSearch: {
          sources: ["mock"],
          maxResults: 20
        },
        generatedAt: "2026-06-03T17:30:00.000Z"
      }
    },
    {
      id: "repo_manual_reviewed_papers_blocked",
      expectedReady: false,
      input: {
        idea: repoIdea,
        reviewedPapers: blockedReviewedPapersForIdea(repoIdea),
        generatedAt: "2026-06-03T17:30:00.000Z"
      }
    }
  ];
  const results = await Promise.all(cases.map(evaluateCase));
  const passCount = results.filter((result) => {
    const expectedStatus = result.expectedReady ? "ready" : "blocked";
    return (
      result.exitCode === 0 &&
      result.artifactCompleteness === 1 &&
      result.briefSchemaValid &&
      result.prdSchemaValid &&
      result.architectureSchemaValid &&
      result.briefReady === result.expectedReady &&
      result.prdStatus === expectedStatus &&
      result.architectureStatus === expectedStatus &&
      (result.expectedReady
        ? result.architectureJudgeVerdict === "pass" &&
          result.architectureJudgeScore >= 90
        : result.architectureJudgeVerdict === "needs_review")
    );
  }).length;
  const averageArtifactCompleteness =
    results.reduce((sum, result) => sum + result.artifactCompleteness, 0) /
    results.length;
  const report = {
    generatedAt: new Date().toISOString(),
    caseCount: results.length,
    passCount,
    averageArtifactCompleteness,
    results
  };

  await writeTextFile(jsonOutputPath, JSON.stringify(report, null, 2));
  await writeTextFile(markdownOutputPath, renderMarkdownReport(report));

  console.log(
    [
      "Project CLI benchmark",
      `Cases: ${report.passCount}/${report.caseCount}`,
      `Average artifact completeness: ${pct(report.averageArtifactCompleteness)}`,
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

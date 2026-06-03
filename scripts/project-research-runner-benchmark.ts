import {
  buildProjectResearchPlan,
  runProjectResearch
} from "@/lib/project-research";
import { ProjectArchitectureSchema } from "@/lib/project-architecture";
import { ProjectPrdSchema } from "@/lib/project-prd";
import { ProjectResearchBriefSchema } from "@/lib/project-research/schemas";
import type {
  EvidenceBucket,
  ProjectIdeaInput,
  ProjectResearchRunManifest,
  ReviewedPaper
} from "@/lib/project-research";
import type { NormalizedPaper } from "@/lib/sources/types";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

type BenchmarkCase = {
  id: string;
  expectedReady: boolean;
  idea: ProjectIdeaInput;
  reviewedPapers?: ReviewedPaper[];
  papers?: NormalizedPaper[];
  sourceSearch?: {
    sources: ["mock"];
    maxResults: number;
  };
};

type CaseResult = {
  id: string;
  title: string;
  expectedReady: boolean;
  actualReady: boolean;
  artifactCompleteness: number;
  schemaValid: boolean;
  prdSchemaValid: boolean;
  architectureSchemaValid: boolean;
  manifestMatchesBrief: boolean;
  prdStatus: "ready" | "blocked";
  architectureStatus: "ready" | "blocked";
  architectureJudgeScore: number;
  architectureJudgeVerdict: "pass" | "needs_review" | "fail";
  requiredCoveredCount: number;
  requiredBucketCount: number;
  missingRequiredBuckets: string[];
};

const requiredFiles = [
  "manifest.json",
  "normalized_idea.json",
  "research_plan.json",
  "coverage.json",
  "source_search.json",
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
const minArtifactCompleteness = 1;
const jsonOutputPath =
  process.env.PROJECT_RESEARCH_RUNNER_BENCHMARK_JSON ??
  "benchmark-results/project-research-runner-latest.json";
const markdownOutputPath =
  process.env.PROJECT_RESEARCH_RUNNER_BENCHMARK_MARKDOWN ??
  "benchmark-results/project-research-runner-latest.md";

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

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

function paperForBucket(bucketId: string, index: number): ReviewedPaper {
  return {
    paperId: `runner_bench_${bucketId}_${index}`,
    title: `Runner benchmark evidence for ${bucketId} ${index}`,
    year: 2025,
    url: `https://example.com/runner-bench/${bucketId}/${index}`,
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
  return [
    paperForBucket(researchPlan.evidenceBuckets[0].id, 1),
    paperForBucket(researchPlan.evidenceBuckets[0].id, 2)
  ];
}

function normalizedPaperForBucket(
  bucket: EvidenceBucket,
  index: number
): NormalizedPaper {
  return {
    id: `runner_bench_source_${bucket.id}_${index}`,
    title: `${bucket.label} ${bucket.keywords.join(" ")} source ${index}`,
    abstract: `${bucket.query}. ${bucket.targetQuestions.join(" ")}`,
    authors: ["Runner Benchmark Source"],
    year: 2025,
    publishedAt: "2025-01-01",
    doi: `10.1000/runner.${bucket.id}.${index}`,
    arxivId: null,
    semanticScholarId: `runner-source-${bucket.id}-${index}`,
    openAlexId: null,
    sourceUrls: [`https://example.com/runner-source/${bucket.id}/${index}`],
    pdfUrl: `https://example.com/runner-source/${bucket.id}/${index}.pdf`,
    venue: "Runner Source Benchmark",
    citationCount: 100,
    influentialCitationCount: 12,
    source: "semantic_scholar",
    fullTextStatus: "parsed"
  };
}

function sourcePapersForIdea(idea: ProjectIdeaInput) {
  const { researchPlan } = buildProjectResearchPlan(idea);
  return researchPlan.evidenceBuckets.flatMap((bucket) => [
    normalizedPaperForBucket(bucket, 1),
    normalizedPaperForBucket(bucket, 2)
  ]);
}

async function fileExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function evaluateCase(
  testCase: BenchmarkCase,
  index: number
): Promise<CaseResult> {
  const outputDir = join(
    tmpdir(),
    `project-research-runner-benchmark-${Date.now()}-${index}`
  );
  const manifest = await runProjectResearch({
    idea: testCase.idea,
    ...(testCase.reviewedPapers
      ? { reviewedPapers: testCase.reviewedPapers }
      : testCase.papers
        ? { papers: testCase.papers }
        : { sourceSearch: testCase.sourceSearch }),
    generatedAt: "2026-06-03T13:30:00.000Z",
    outputDir
  });
  const existingFileCount = (
    await Promise.all(
      requiredFiles.map((file) => fileExists(join(outputDir, file)))
    )
  ).filter(Boolean).length;
  const artifactCompleteness = existingFileCount / requiredFiles.length;
  const brief = JSON.parse(
    await readFile(join(outputDir, "project_research_brief.json"), "utf8")
  );
  const prd = JSON.parse(await readFile(join(outputDir, "project_prd.json"), "utf8"));
  const architecture = JSON.parse(
    await readFile(join(outputDir, "project_architecture.json"), "utf8")
  );
  const architectureJudge = JSON.parse(
    await readFile(join(outputDir, "project_architecture_judge.json"), "utf8")
  ) as { score: number; verdict: "pass" | "needs_review" | "fail" };
  const schemaValid = ProjectResearchBriefSchema.safeParse(brief).success;
  const parsedPrd = ProjectPrdSchema.safeParse(prd);
  const parsedArchitecture = ProjectArchitectureSchema.safeParse(architecture);
  const manifestFromDisk = JSON.parse(
    await readFile(join(outputDir, "manifest.json"), "utf8")
  ) as ProjectResearchRunManifest;

  return {
    id: testCase.id,
    title: testCase.idea.title,
    expectedReady: testCase.expectedReady,
    actualReady: manifest.readyForArchitecture,
    artifactCompleteness,
    schemaValid,
    prdSchemaValid: parsedPrd.success,
    architectureSchemaValid: parsedArchitecture.success,
    manifestMatchesBrief:
      manifestFromDisk.runId === brief.id &&
      manifestFromDisk.readyForArchitecture === brief.readyForArchitecture,
    prdStatus: parsedPrd.success ? parsedPrd.data.status : "blocked",
    architectureStatus: parsedArchitecture.success
      ? parsedArchitecture.data.status
      : "blocked",
    architectureJudgeScore: architectureJudge.score,
    architectureJudgeVerdict: architectureJudge.verdict,
    requiredCoveredCount: manifest.requiredCoveredCount,
    requiredBucketCount: manifest.requiredBucketCount,
    missingRequiredBuckets: manifest.missingRequiredBuckets
  };
}

function renderMarkdownReport(input: {
  generatedAt: string;
  caseCount: number;
  passCount: number;
  averageArtifactCompleteness: number;
  schemaValidCount: number;
  prdSchemaValidCount: number;
  architectureSchemaValidCount: number;
  readinessPassCount: number;
  manifestMatchCount: number;
  results: CaseResult[];
}) {
  const lines = [
    "# Project Research Runner Benchmark",
    "",
    `Generated at: ${input.generatedAt}`,
    `Cases: ${input.caseCount}`,
    `Pass count: ${input.passCount}/${input.caseCount}`,
    `Average artifact completeness: ${pct(input.averageArtifactCompleteness)}`,
    `Schema valid: ${input.schemaValidCount}/${input.caseCount}`,
    `PRD schema valid: ${input.prdSchemaValidCount}/${input.caseCount}`,
    `Architecture schema valid: ${input.architectureSchemaValidCount}/${input.caseCount}`,
    `Readiness expectation pass: ${input.readinessPassCount}/${input.caseCount}`,
    `Manifest matches brief: ${input.manifestMatchCount}/${input.caseCount}`,
    `Threshold: all checks pass, artifact completeness >= ${pct(minArtifactCompleteness)}`,
    "",
    "## Cases",
    ""
  ];

  for (const result of input.results) {
    const passed =
      result.artifactCompleteness === 1 &&
      result.schemaValid &&
      result.prdSchemaValid &&
      result.architectureSchemaValid &&
      result.actualReady === result.expectedReady &&
      result.prdStatus === (result.expectedReady ? "ready" : "blocked") &&
      result.architectureStatus === (result.expectedReady ? "ready" : "blocked") &&
      (result.expectedReady
        ? result.architectureJudgeVerdict === "pass" &&
          result.architectureJudgeScore >= 90
        : result.architectureJudgeVerdict === "needs_review") &&
      result.manifestMatchesBrief;
    lines.push(`### ${passed ? "PASS" : "FAIL"} ${result.id}`);
    lines.push("");
    lines.push(`- Title: ${result.title}`);
    lines.push(`- Expected ready: ${result.expectedReady ? "yes" : "no"}`);
    lines.push(`- Actual ready: ${result.actualReady ? "yes" : "no"}`);
    lines.push(`- Artifact completeness: ${pct(result.artifactCompleteness)}`);
    lines.push(`- Schema valid: ${result.schemaValid ? "yes" : "no"}`);
    lines.push(`- PRD status: ${result.prdStatus}`);
    lines.push(`- Architecture status: ${result.architectureStatus}`);
    lines.push(`- Architecture judge score: ${result.architectureJudgeScore}/100`);
    lines.push(`- Architecture judge verdict: ${result.architectureJudgeVerdict}`);
    lines.push(
      `- Manifest matches brief: ${result.manifestMatchesBrief ? "yes" : "no"}`
    );
    lines.push(
      `- Coverage: ${result.requiredCoveredCount}/${result.requiredBucketCount}`
    );
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
      id: "trading_ready_artifacts",
      expectedReady: true,
      idea: tradingIdea,
      reviewedPapers: fullEvidenceForIdea(tradingIdea)
    },
    {
      id: "repo_ready_artifacts",
      expectedReady: true,
      idea: repoIdea,
      reviewedPapers: fullEvidenceForIdea(repoIdea)
    },
    {
      id: "trading_ready_from_source_papers",
      expectedReady: true,
      idea: tradingIdea,
      papers: sourcePapersForIdea(tradingIdea)
    },
    {
      id: "medical_mock_source_search_artifacts",
      expectedReady: true,
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
      }
    },
    {
      id: "repo_blocked_artifacts",
      expectedReady: false,
      idea: repoIdea,
      reviewedPapers: partialEvidenceForIdea(repoIdea)
    }
  ];
  const results = await Promise.all(cases.map(evaluateCase));
  const passCount = results.filter(
    (result) =>
      result.artifactCompleteness === 1 &&
      result.schemaValid &&
      result.prdSchemaValid &&
      result.architectureSchemaValid &&
      result.actualReady === result.expectedReady &&
      result.prdStatus === (result.expectedReady ? "ready" : "blocked") &&
      result.architectureStatus === (result.expectedReady ? "ready" : "blocked") &&
      (result.expectedReady
        ? result.architectureJudgeVerdict === "pass" &&
          result.architectureJudgeScore >= 90
        : result.architectureJudgeVerdict === "needs_review") &&
      result.manifestMatchesBrief
  ).length;
  const averageArtifactCompleteness =
    results.reduce((sum, result) => sum + result.artifactCompleteness, 0) /
    results.length;
  const schemaValidCount = results.filter((result) => result.schemaValid).length;
  const prdSchemaValidCount = results.filter(
    (result) => result.prdSchemaValid
  ).length;
  const architectureSchemaValidCount = results.filter(
    (result) => result.architectureSchemaValid
  ).length;
  const readinessPassCount = results.filter(
    (result) => result.actualReady === result.expectedReady
  ).length;
  const manifestMatchCount = results.filter(
    (result) => result.manifestMatchesBrief
  ).length;

  const report = {
    generatedAt: new Date().toISOString(),
    caseCount: results.length,
    passCount,
    averageArtifactCompleteness,
    schemaValidCount,
    prdSchemaValidCount,
    architectureSchemaValidCount,
    readinessPassCount,
    manifestMatchCount,
    minArtifactCompleteness,
    results
  };

  await writeTextFile(jsonOutputPath, JSON.stringify(report, null, 2));
  await writeTextFile(markdownOutputPath, renderMarkdownReport(report));

  console.log(
    [
      "Project research runner benchmark",
      `Cases: ${report.caseCount}`,
      `Pass: ${report.passCount}/${report.caseCount}`,
      `Average artifact completeness: ${pct(report.averageArtifactCompleteness)}`,
      `Schema valid: ${report.schemaValidCount}/${report.caseCount}`,
      `PRD schema valid: ${report.prdSchemaValidCount}/${report.caseCount}`,
      `Architecture schema valid: ${report.architectureSchemaValidCount}/${report.caseCount}`,
      `Readiness expectation pass: ${report.readinessPassCount}/${report.caseCount}`,
      `Manifest matches brief: ${report.manifestMatchCount}/${report.caseCount}`,
      `JSON: ${jsonOutputPath}`,
      `Markdown: ${markdownOutputPath}`
    ].join("\n")
  );

  if (
    report.passCount !== report.caseCount ||
    report.averageArtifactCompleteness < minArtifactCompleteness
  ) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

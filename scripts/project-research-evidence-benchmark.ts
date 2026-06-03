import {
  buildProjectResearchBrief,
  buildProjectResearchPlan,
  collectProjectEvidenceFromPapers
} from "@/lib/project-research";
import type {
  EvidenceBucket,
  ProjectIdeaInput
} from "@/lib/project-research/types";
import type { NormalizedPaper } from "@/lib/sources/types";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type BenchmarkCase = {
  id: string;
  idea: ProjectIdeaInput;
  papers: NormalizedPaper[];
  expectedReady: boolean;
};

type CaseResult = {
  id: string;
  title: string;
  expectedReady: boolean;
  collectorReady: boolean;
  briefReady: boolean;
  bucketCoverageRatio: number;
  reviewedPaperCount: number;
  missingRequiredBuckets: string[];
  metadataOnlyReviewedCount: number;
};

const jsonOutputPath =
  process.env.PROJECT_RESEARCH_EVIDENCE_BENCHMARK_JSON ??
  "benchmark-results/project-research-evidence-latest.json";
const markdownOutputPath =
  process.env.PROJECT_RESEARCH_EVIDENCE_BENCHMARK_MARKDOWN ??
  "benchmark-results/project-research-evidence-latest.md";
const minAverageBucketCoverage = 0.75;

const ideas: Record<string, ProjectIdeaInput> = {
  trading: {
    title: "AI Trading Bot",
    description:
      "Bot tradingowy na gieldzie uzywajacy AI, backtestow i kontroli ryzyka.",
    constraints: ["najpierw paper trading"],
    preferredDomains: ["algorithmic trading"],
    outputLanguage: "pl"
  },
  repo: {
    title: "Repo Optimizer AI",
    description:
      "Aplikacja skanujaca repozytoria, robiaca code review, wykrywajaca bugi i priorytetyzujaca refactor.",
    constraints: ["MVP tylko rekomenduje zmiany"],
    preferredDomains: ["software engineering", "LLM code review"],
    outputLanguage: "pl"
  },
  legal: {
    title: "Contract Compliance Reviewer",
    description:
      "Legal AI system for contract analysis, compliance review, document review and grounded citations.",
    constraints: ["czlowiek zatwierdza decyzje"],
    preferredDomains: [],
    outputLanguage: "pl"
  }
};

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

function fullPaperForBucket(bucket: EvidenceBucket, index: number): NormalizedPaper {
  return {
    id: `evidence_${bucket.id}_${index}`,
    title: `${bucket.label} ${bucket.keywords.join(" ")} evidence ${index}`,
    abstract: `${bucket.query}. ${bucket.targetQuestions.join(" ")}`,
    authors: ["Evidence Benchmark"],
    year: 2025,
    publishedAt: "2025-02-01",
    doi: `10.1000/evidence.${bucket.id}.${index}`,
    arxivId: null,
    semanticScholarId: `evidence-${bucket.id}-${index}`,
    openAlexId: null,
    sourceUrls: [`https://example.com/evidence/${bucket.id}/${index}`],
    pdfUrl: `https://example.com/evidence/${bucket.id}/${index}.pdf`,
    venue: "Evidence Benchmark Venue",
    citationCount: 100 + index,
    influentialCitationCount: 10 + index,
    source: "semantic_scholar",
    fullTextStatus: "parsed"
  };
}

function metadataOnlyPaperForBucket(bucket: EvidenceBucket, index: number): NormalizedPaper {
  return {
    ...fullPaperForBucket(bucket, index),
    id: `metadata_only_${bucket.id}_${index}`,
    abstract: null,
    doi: `10.1000/metadata.${bucket.id}.${index}`,
    arxivId: null,
    semanticScholarId: `metadata-${bucket.id}-${index}`,
    openAlexId: null,
    sourceUrls: [],
    pdfUrl: null,
    fullTextStatus: "unavailable"
  };
}

function fullEvidencePapers(idea: ProjectIdeaInput) {
  const { researchPlan } = buildProjectResearchPlan(idea);
  return researchPlan.evidenceBuckets.flatMap((bucket) => [
    fullPaperForBucket(bucket, 1),
    fullPaperForBucket(bucket, 2)
  ]);
}

function metadataOnlyEvidencePapers(idea: ProjectIdeaInput) {
  const { researchPlan } = buildProjectResearchPlan(idea);
  return researchPlan.evidenceBuckets.flatMap((bucket) => [
    metadataOnlyPaperForBucket(bucket, 1),
    metadataOnlyPaperForBucket(bucket, 2)
  ]);
}

function evaluateCase(testCase: BenchmarkCase): CaseResult {
  const { researchPlan } = buildProjectResearchPlan(testCase.idea);
  const collection = collectProjectEvidenceFromPapers({
    researchPlan,
    papers: testCase.papers,
    maxPapersPerBucket: 2
  });
  const brief = buildProjectResearchBrief({
    idea: testCase.idea,
    reviewedPapers: collection.reviewedPapers,
    generatedAt: "2026-06-03T14:30:00.000Z"
  });
  const bucketCoverageRatio =
    collection.requiredBucketCount === 0
      ? 0
      : collection.requiredReadyCount / collection.requiredBucketCount;

  return {
    id: testCase.id,
    title: testCase.idea.title,
    expectedReady: testCase.expectedReady,
    collectorReady: collection.canBuildReadyBrief,
    briefReady: brief.readyForArchitecture,
    bucketCoverageRatio,
    reviewedPaperCount: collection.reviewedPapers.length,
    missingRequiredBuckets: collection.missingRequiredBuckets,
    metadataOnlyReviewedCount: collection.reviewedPapers.filter(
      (paper) => paper.evidenceStrength === "metadata_only"
    ).length
  };
}

function renderMarkdownReport(input: {
  generatedAt: string;
  caseCount: number;
  passCount: number;
  readinessPassCount: number;
  averageBucketCoverage: number;
  results: CaseResult[];
}) {
  const lines = [
    "# Project Research Evidence Benchmark",
    "",
    `Generated at: ${input.generatedAt}`,
    `Cases: ${input.caseCount}`,
    `Pass count: ${input.passCount}/${input.caseCount}`,
    `Readiness pass: ${input.readinessPassCount}/${input.caseCount}`,
    `Average bucket coverage: ${pct(input.averageBucketCoverage)}`,
    `Threshold: all readiness checks pass, average coverage >= ${pct(minAverageBucketCoverage)}`,
    "",
    "## Cases",
    ""
  ];

  for (const result of input.results) {
    const passed =
      result.collectorReady === result.expectedReady &&
      result.briefReady === result.expectedReady;
    lines.push(`### ${passed ? "PASS" : "FAIL"} ${result.id}`);
    lines.push("");
    lines.push(`- Title: ${result.title}`);
    lines.push(`- Expected ready: ${result.expectedReady ? "yes" : "no"}`);
    lines.push(`- Collector ready: ${result.collectorReady ? "yes" : "no"}`);
    lines.push(`- Brief ready: ${result.briefReady ? "yes" : "no"}`);
    lines.push(`- Bucket coverage: ${pct(result.bucketCoverageRatio)}`);
    lines.push(`- Reviewed papers: ${result.reviewedPaperCount}`);
    lines.push(`- Metadata-only reviewed: ${result.metadataOnlyReviewedCount}`);
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
      id: "trading_full_evidence",
      idea: ideas.trading,
      papers: fullEvidencePapers(ideas.trading),
      expectedReady: true
    },
    {
      id: "repo_full_evidence",
      idea: ideas.repo,
      papers: fullEvidencePapers(ideas.repo),
      expectedReady: true
    },
    {
      id: "legal_full_evidence",
      idea: ideas.legal,
      papers: fullEvidencePapers(ideas.legal),
      expectedReady: true
    },
    {
      id: "repo_metadata_only_blocked",
      idea: ideas.repo,
      papers: metadataOnlyEvidencePapers(ideas.repo),
      expectedReady: false
    }
  ];
  const results = cases.map(evaluateCase);
  const readinessPassCount = results.filter(
    (result) =>
      result.collectorReady === result.expectedReady &&
      result.briefReady === result.expectedReady
  ).length;
  const averageBucketCoverage =
    results.reduce((sum, result) => sum + result.bucketCoverageRatio, 0) /
    results.length;
  const report = {
    generatedAt: new Date().toISOString(),
    caseCount: results.length,
    passCount: readinessPassCount,
    readinessPassCount,
    averageBucketCoverage,
    minAverageBucketCoverage,
    results
  };

  await writeTextFile(jsonOutputPath, JSON.stringify(report, null, 2));
  await writeTextFile(markdownOutputPath, renderMarkdownReport(report));

  console.log(
    [
      "Project research evidence benchmark",
      `Cases: ${report.caseCount}`,
      `Pass: ${report.passCount}/${report.caseCount}`,
      `Readiness pass: ${report.readinessPassCount}/${report.caseCount}`,
      `Average bucket coverage: ${pct(report.averageBucketCoverage)}`,
      `JSON: ${jsonOutputPath}`,
      `Markdown: ${markdownOutputPath}`
    ].join("\n")
  );

  if (
    report.passCount !== report.caseCount ||
    report.averageBucketCoverage < minAverageBucketCoverage
  ) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

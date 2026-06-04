import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type CheckResult = {
  id: string;
  kind: "script" | "artifact" | "metric";
  expected: string;
  packageScriptExists: boolean | null;
  documented: boolean;
  passed: boolean;
};

const jsonOutputPath =
  process.env.PROJECT_DOCS_CONSISTENCY_JSON ??
  "benchmark-results/project-docs-consistency-latest.json";
const markdownOutputPath =
  process.env.PROJECT_DOCS_CONSISTENCY_MARKDOWN ??
  "benchmark-results/project-docs-consistency-latest.md";

const docs = [
  "docs/PROJECT_IDEA_SCOUT_ARCHITECTURE.md",
  "docs/PROJECT_SYSTEM_AUDIT.md",
  "docs/PROJECT_OPTIMIZATION_PLAN.md",
  "docs/CURRENT_STATE.md",
  "docs/ROADMAP.md",
  "docs/PROMPTS.md"
];

const requiredScripts = [
  "project:ideas",
  "project:research",
  "benchmark:project-pipeline",
  "benchmark:project-repo-mri-real",
  "benchmark:project-repo-mri-local",
  "benchmark:project-repo-mri-github",
  "benchmark:project-ideas",
  "benchmark:project-ai-ideas",
  "benchmark:project-live-batch",
  "benchmark:project-bucket-relevance",
  "benchmark:project-paper-relevance",
  "benchmark:project-architecture"
];

const requiredArtifacts = [
  "project_ideas_audit.json",
  "project_ideas_audit.md",
  "trend_radar.json",
  "trend_radar.md",
  "source_curation_report.json",
  "source_curation_report.md",
  "idea_selection_report.json",
  "idea_selection_report.md",
  "ai_idea_curation_report.json",
  "ai_idea_curation_report.md",
  "shortlist.json",
  "project_idea_inputs.json",
  "project_idea_handoff_quality.json",
  "project_idea_handoff_quality.md",
  "research_handoff_audit.json",
  "research_handoff_audit.md",
  "handoff_context.json",
  "handoff_context.md",
  "handoff_flag_resolution.json",
  "handoff_flag_resolution.md",
  "paper_relevance_judgement.json",
  "paper_relevance_judgement.md",
  "docs/09-handoff-risk-resolution.md",
  "project_architecture_judge.json",
  "project_architecture_judge.md",
  "controlled_live_batch_summary.json",
  "controlled_live_batch_summary.md",
  "project-repo-mri-real-latest.json",
  "project-repo-mri-real-latest.md",
  "project-repo-mri-local-checkout-latest.json",
  "project-repo-mri-local-checkout-latest.md",
  "project-repo-mri-github-checkout-latest.json",
  "project-repo-mri-github-checkout-latest.md",
  "project-bucket-relevance-latest.json",
  "project-bucket-relevance-latest.md",
  "project-paper-relevance-judge-latest.json",
  "project-paper-relevance-judge-latest.md"
];

const requiredMetrics = [
  "shortlistSourceDominance",
  "maxIdeasPerSource",
  "cloneRejectedCount",
  "averageNovelty",
  "averageMvpFeasibility",
  "averagePersonalUtility",
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
  "characterizationTestActionQualityRate",
  "relatedTestsCompleteness",
  "unknownsCompleteness",
  "whyNotCompleteness",
  "averageHandoffQualityScore",
  "handoffReadyCount",
  "handoffReviewCount",
  "handoffBlockedCount",
  "handoffResolvedFlagCount",
  "handoffUnresolvedFlagCount",
  "handoffRiskResolution",
  "averageJudgeScore",
  "trendRepoCount",
  "sourceRepoCount",
  "blockerCount",
  "sourceEvidenceQuality",
  "reviewFlags",
  "falsePositiveRejectRate",
  "truePositiveAcceptRate",
  "paperJudgeFalsePositiveRejectRate",
  "paperJudgeTruePositiveKeepRate"
];

async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

async function readDocsCorpus() {
  const parts = await Promise.all(
    docs.map(async (path) => {
      try {
        return await readFile(path, "utf8");
      } catch {
        return "";
      }
    })
  );

  return parts.join("\n");
}

function renderMarkdownReport(input: {
  generatedAt: string;
  caseCount: number;
  passCount: number;
  scriptPassCount: number;
  artifactPassCount: number;
  metricPassCount: number;
  results: CheckResult[];
}) {
  const lines = [
    "# Project Docs Consistency Check",
    "",
    `Generated at: ${input.generatedAt}`,
    `Cases: ${input.caseCount}`,
    `Pass count: ${input.passCount}/${input.caseCount}`,
    `Scripts documented: ${input.scriptPassCount}/${requiredScripts.length}`,
    `Artifacts documented: ${input.artifactPassCount}/${requiredArtifacts.length}`,
    `Metrics documented: ${input.metricPassCount}/${requiredMetrics.length}`,
    "",
    "## Results",
    ""
  ];

  for (const result of input.results) {
    lines.push(`### ${result.passed ? "PASS" : "FAIL"} ${result.expected}`);
    lines.push("");
    lines.push(`- Kind: ${result.kind}`);
    lines.push(
      `- Package script exists: ${
        result.packageScriptExists === null
          ? "n/a"
          : result.packageScriptExists
            ? "yes"
            : "no"
      }`
    );
    lines.push(`- Documented: ${result.documented ? "yes" : "no"}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
    scripts?: Record<string, string>;
  };
  const scripts = packageJson.scripts ?? {};
  const corpus = await readDocsCorpus();
  const scriptResults: CheckResult[] = requiredScripts.map((script) => {
    const packageScriptExists = Boolean(scripts[script]);
    const documented = corpus.includes(script);

    return {
      id: `script_${script.replace(/[^a-z0-9]+/gi, "_")}`,
      kind: "script",
      expected: script,
      packageScriptExists,
      documented,
      passed: packageScriptExists && documented
    };
  });
  const artifactResults: CheckResult[] = requiredArtifacts.map((artifact) => {
    const documented = corpus.includes(artifact);

    return {
      id: `artifact_${artifact.replace(/[^a-z0-9]+/gi, "_")}`,
      kind: "artifact",
      expected: artifact,
      packageScriptExists: null,
      documented,
      passed: documented
    };
  });
  const metricResults: CheckResult[] = requiredMetrics.map((metric) => {
    const documented = corpus.includes(metric);

    return {
      id: `metric_${metric.replace(/[^a-z0-9]+/gi, "_")}`,
      kind: "metric",
      expected: metric,
      packageScriptExists: null,
      documented,
      passed: documented
    };
  });
  const results = [...scriptResults, ...artifactResults, ...metricResults];
  const report = {
    generatedAt: new Date().toISOString(),
    caseCount: results.length,
    passCount: results.filter((result) => result.passed).length,
    scriptPassCount: scriptResults.filter((result) => result.passed).length,
    artifactPassCount: artifactResults.filter((result) => result.passed).length,
    metricPassCount: metricResults.filter((result) => result.passed).length,
    results
  };

  await writeTextFile(jsonOutputPath, JSON.stringify(report, null, 2));
  await writeTextFile(markdownOutputPath, renderMarkdownReport(report));

  console.log(
    [
      "Project docs consistency check",
      `Cases: ${report.passCount}/${report.caseCount}`,
      `Scripts documented: ${report.scriptPassCount}/${requiredScripts.length}`,
      `Artifacts documented: ${report.artifactPassCount}/${requiredArtifacts.length}`,
      `Metrics documented: ${report.metricPassCount}/${requiredMetrics.length}`,
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

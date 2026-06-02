import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { evaluateBenchmarkQualityGate } from "@/lib/benchmarks/qualityGate";
import { resolveBenchmarkQualityThresholds } from "@/lib/benchmarks/qualityThresholds";

const jsonOutputPath =
  process.env.BENCHMARK_QUALITY_GATE_JSON ??
  "benchmark-results/quality-gate-latest.json";
const markdownOutputPath =
  process.env.BENCHMARK_QUALITY_GATE_MARKDOWN ??
  "benchmark-results/quality-gate-latest.md";

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

function renderMarkdownReport(
  result: Awaited<ReturnType<typeof evaluateBenchmarkQualityGate>>
) {
  const lines = [
    "# Benchmark Quality Gate",
    "",
    `Generated at: ${result.generatedAt}`,
    `Status: ${result.passed ? "PASS" : "FAIL"}`,
    "",
    "## Thresholds",
    "",
    `- Retrieval: top-1 >= ${pct(
      result.thresholds.retrieval.minTop1
    )}, recall@5 >= ${pct(
      result.thresholds.retrieval.minRecallAt5
    )}, excluded top failures <= ${result.thresholds.retrieval.maxExcludedTopFailures}`,
    `- Source quality: top-1 >= ${pct(
      result.thresholds.sourceQuality.minTop1
    )}, recall@5 >= ${pct(
      result.thresholds.sourceQuality.minRecallAt5
    )}, excluded top failures <= ${result.thresholds.sourceQuality.maxExcludedTopFailures}`,
    `- Claim-check: accuracy >= ${pct(
      result.thresholds.claimCheck.minClassificationAccuracy
    )}, requirement failures <= ${result.thresholds.claimCheck.maxRequirementFailures}`,
    "",
    "## Results",
    "",
    `- Retrieval: top-1 ${pct(
      result.suites.retrieval.top1Accuracy
    )}, recall@5 ${pct(
      result.suites.retrieval.meanRecallAt5
    )}, excluded top failures ${result.suites.retrieval.excludedFailureCount}`,
    `- Source quality: top-1 ${pct(
      result.suites.sourceQuality.top1Accuracy
    )}, recall@5 ${pct(
      result.suites.sourceQuality.meanRecallAt5
    )}, excluded top failures ${result.suites.sourceQuality.excludedFailureCount}`,
    `- Claim-check: accuracy ${pct(
      result.suites.claimCheck.classificationAccuracy
    )}, evidence failures ${result.suites.claimCheck.evidenceRequirementFailures}, similar-work failures ${result.suites.claimCheck.similarWorkRequirementFailures}, caveat failures ${result.suites.claimCheck.caveatRequirementFailures}, evidence-boundary failures ${result.suites.claimCheck.evidenceBoundaryRequirementFailures}`,
    "",
    "## Failures",
    ""
  ];

  if (result.failures.length) {
    for (const failure of result.failures) {
      lines.push(`- ${failure}`);
    }
  } else {
    lines.push("- none");
  }

  return `${lines.join("\n").trim()}\n`;
}

async function main() {
  const result = await evaluateBenchmarkQualityGate({
    thresholds: resolveBenchmarkQualityThresholds()
  });
  const claimRequirementFailures =
    result.suites.claimCheck.evidenceRequirementFailures +
    result.suites.claimCheck.similarWorkRequirementFailures +
    result.suites.claimCheck.caveatRequirementFailures +
    result.suites.claimCheck.evidenceBoundaryRequirementFailures;

  await writeTextFile(jsonOutputPath, `${JSON.stringify(result, null, 2)}\n`);
  await writeTextFile(markdownOutputPath, renderMarkdownReport(result));

  console.log("Benchmark quality gate");
  console.log(`Status: ${result.passed ? "PASS" : "FAIL"}`);
  console.log(
    `Retrieval: top-1 ${pct(
      result.suites.retrieval.top1Accuracy
    )}, recall@5 ${pct(result.suites.retrieval.meanRecallAt5)}`
  );
  console.log(
    `Source quality: top-1 ${pct(
      result.suites.sourceQuality.top1Accuracy
    )}, recall@5 ${pct(result.suites.sourceQuality.meanRecallAt5)}`
  );
  console.log(
    `Claim-check: accuracy ${pct(
      result.suites.claimCheck.classificationAccuracy
    )}, requirement failures ${claimRequirementFailures}`
  );
  console.log(`Wrote JSON report: ${jsonOutputPath}`);
  console.log(`Wrote Markdown report: ${markdownOutputPath}`);

  if (!result.passed) {
    console.error("");
    console.error("Benchmark quality gate failed:");
    for (const failure of result.failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

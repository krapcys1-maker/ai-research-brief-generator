import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { evaluateClaimCheckCases } from "@/lib/benchmarks/claimCheck";
import { resolveBenchmarkQualityThresholds } from "@/lib/benchmarks/qualityThresholds";

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

const thresholds = resolveBenchmarkQualityThresholds().claimCheck;
const minAccuracy = thresholds.minClassificationAccuracy;
const jsonOutputPath =
  process.env.CLAIM_CHECK_BENCHMARK_JSON ??
  "benchmark-results/claim-check-latest.json";
const markdownOutputPath =
  process.env.CLAIM_CHECK_BENCHMARK_MARKDOWN ??
  "benchmark-results/claim-check-latest.md";

async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

function renderMarkdownReport(input: {
  generatedAt: string;
  minAccuracy: number;
  result: Awaited<ReturnType<typeof evaluateClaimCheckCases>>;
}) {
  const lines = [
    "# Claim Check Benchmark",
    "",
    `Generated at: ${input.generatedAt}`,
    `Cases: ${input.result.caseCount}`,
    `Classification accuracy: ${pct(input.result.classificationAccuracy)}`,
    `Evidence requirement failures: ${input.result.evidenceRequirementFailures}`,
    `Similar-work requirement failures: ${input.result.similarWorkRequirementFailures}`,
    `Caveat requirement failures: ${input.result.caveatRequirementFailures}`,
    `Evidence-boundary requirement failures: ${input.result.evidenceBoundaryRequirementFailures}`,
    `Thresholds: accuracy >= ${pct(input.minAccuracy)}, requirement failures = 0`,
    "",
    "## Cases",
    ""
  ];

  for (const item of input.result.results) {
    const passed =
      item.classificationHit &&
      item.evidenceRequirementMet &&
      item.similarWorkRequirementMet &&
      item.caveatRequirementMet;
    const status = passed ? "PASS" : "CHECK";

    lines.push(`### ${status} ${item.name}`);
    lines.push("");
    lines.push(`- Claim: ${item.claim}`);
    lines.push(`- Expected: ${item.expectedClassification}`);
    lines.push(`- Actual: ${item.actualClassification}`);
    lines.push(`- Evidence snippets: ${item.evidenceSnippetCount}`);
    lines.push(`- Related papers: ${item.relatedPaperCount}`);
    lines.push(`- Caveats: ${item.caveatCount}`);
    lines.push(`- Evidence boundary: ${item.evidenceBoundary}`);
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

async function main() {
  const result = await evaluateClaimCheckCases();
  const generatedAt = new Date().toISOString();

  console.log("Claim check benchmark");
  console.log(`Cases: ${result.caseCount}`);
  console.log(`Classification accuracy: ${pct(result.classificationAccuracy)}`);
  console.log(`Evidence requirement failures: ${result.evidenceRequirementFailures}`);
  console.log(
    `Similar-work requirement failures: ${result.similarWorkRequirementFailures}`
  );
  console.log(`Caveat requirement failures: ${result.caveatRequirementFailures}`);
  console.log(
    `Evidence-boundary requirement failures: ${result.evidenceBoundaryRequirementFailures}`
  );
  console.log("");

  for (const item of result.results) {
    const passed =
      item.classificationHit &&
      item.evidenceRequirementMet &&
      item.similarWorkRequirementMet &&
      item.caveatRequirementMet;
    const status = passed ? "PASS" : "CHECK";

    console.log(`${status} ${item.name}`);
    console.log(`  expected: ${item.expectedClassification}`);
    console.log(`  actual: ${item.actualClassification}`);
    console.log(`  evidence snippets: ${item.evidenceSnippetCount}`);
    console.log(`  evidence boundary: ${item.evidenceBoundary}`);
  }

  const report = {
    generatedAt,
    thresholds: {
      minAccuracy,
      requirementFailures: thresholds.maxRequirementFailures
    },
    result
  };

  await writeTextFile(jsonOutputPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeTextFile(
    markdownOutputPath,
    renderMarkdownReport({
      generatedAt,
      minAccuracy,
      result
    })
  );

  console.log("");
  console.log(`Wrote JSON report: ${jsonOutputPath}`);
  console.log(`Wrote Markdown report: ${markdownOutputPath}`);

  const failed =
    result.classificationAccuracy < minAccuracy ||
    result.evidenceRequirementFailures > thresholds.maxRequirementFailures ||
    result.similarWorkRequirementFailures > thresholds.maxRequirementFailures ||
    result.caveatRequirementFailures > thresholds.maxRequirementFailures ||
    result.evidenceBoundaryRequirementFailures > thresholds.maxRequirementFailures;

  if (failed) {
    console.error("");
    console.error(
      `Claim-check benchmark failed thresholds: accuracy >= ${pct(
        minAccuracy
      )}, requirement failures = 0.`
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

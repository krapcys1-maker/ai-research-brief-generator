import { evaluateSourceQualityCases } from "@/lib/benchmarks/sourceQuality";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function numberEnv(name: string, fallback: number) {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const minTop1 = numberEnv("SOURCE_QUALITY_BENCHMARK_MIN_TOP1", 0.9);
const minRecall = numberEnv("SOURCE_QUALITY_BENCHMARK_MIN_RECALL", 0.9);
const jsonOutputPath =
  process.env.SOURCE_QUALITY_BENCHMARK_JSON ??
  "benchmark-results/source-quality-latest.json";
const markdownOutputPath =
  process.env.SOURCE_QUALITY_BENCHMARK_MARKDOWN ??
  "benchmark-results/source-quality-latest.md";

async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

function renderMarkdownReport(input: {
  generatedAt: string;
  minTop1: number;
  minRecall: number;
  result: Awaited<ReturnType<typeof evaluateSourceQualityCases>>;
}) {
  const lines = [
    "# Source Quality Benchmark",
    "",
    `Generated at: ${input.generatedAt}`,
    `Provider: ${input.result.provider}`,
    `Cases: ${input.result.caseCount}`,
    `Top-1 accuracy: ${pct(input.result.top1Accuracy)}`,
    `Mean recall@5: ${pct(input.result.meanRecallAt5)}`,
    `Excluded top failures: ${input.result.excludedFailureCount}`,
    `Thresholds: top1 >= ${pct(input.minTop1)}, recall@5 >= ${pct(input.minRecall)}, excluded failures = 0`,
    "",
    "## Cases",
    ""
  ];

  for (const item of input.result.results) {
    const status =
      item.top1Hit && item.recallAt5 === 1 && item.excludedTopFailures.length === 0
        ? "PASS"
        : "CHECK";

    lines.push(`### ${status} ${item.name}`);
    lines.push("");
    lines.push(`- Query: ${item.query}`);
    lines.push(`- Variants: ${item.queryVariants.join(" | ")}`);
    lines.push(`- Selected: ${item.selectedIds.join(", ") || "none"}`);
    lines.push(`- Expected: ${item.expectedTopIds.join(", ")}`);
    lines.push(`- Recall@5: ${pct(item.recallAt5)}`);

    if (item.excludedTopFailures.length) {
      lines.push(`- Excluded in top set: ${item.excludedTopFailures.join(", ")}`);
    }

    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

async function main() {
  const result = await evaluateSourceQualityCases();
  const generatedAt = new Date().toISOString();

  console.log("Source quality benchmark");
  console.log(`Provider: ${result.provider}`);
  console.log(`Cases: ${result.caseCount}`);
  console.log(`Top-1 accuracy: ${pct(result.top1Accuracy)}`);
  console.log(`Mean recall@5: ${pct(result.meanRecallAt5)}`);
  console.log(`Excluded top failures: ${result.excludedFailureCount}`);
  console.log("");

  for (const item of result.results) {
    const status =
      item.top1Hit && item.recallAt5 === 1 && item.excludedTopFailures.length === 0
        ? "PASS"
        : "CHECK";

    console.log(`${status} ${item.name}`);
    console.log(`  query: ${item.query}`);
    console.log(`  selected: ${item.selectedIds.join(", ") || "none"}`);
    console.log(`  expected: ${item.expectedTopIds.join(", ")}`);
    console.log(`  recall@5: ${pct(item.recallAt5)}`);

    if (item.excludedTopFailures.length) {
      console.log(`  excluded in top set: ${item.excludedTopFailures.join(", ")}`);
    }
  }

  const failed =
    result.top1Accuracy < minTop1 ||
    result.meanRecallAt5 < minRecall ||
    result.excludedFailureCount > 0;

  const report = {
    generatedAt,
    thresholds: {
      minTop1,
      minRecall,
      excludedFailureCount: 0
    },
    result
  };

  await writeTextFile(jsonOutputPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeTextFile(
    markdownOutputPath,
    renderMarkdownReport({
      generatedAt,
      minTop1,
      minRecall,
      result
    })
  );

  console.log("");
  console.log(`Wrote JSON report: ${jsonOutputPath}`);
  console.log(`Wrote Markdown report: ${markdownOutputPath}`);

  if (failed) {
    console.error("");
    console.error(
      `Source quality benchmark failed thresholds: top1 >= ${pct(
        minTop1
      )}, recall@5 >= ${pct(minRecall)}, excluded failures = 0.`
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

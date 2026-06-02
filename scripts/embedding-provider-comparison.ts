import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  compareEmbeddingProviders,
  type BenchmarkSuiteRun,
  type EmbeddingProviderComparisonResult
} from "@/lib/benchmarks/embeddingProviderComparison";

const jsonOutputPath =
  process.env.EMBEDDING_COMPARISON_JSON ??
  "benchmark-results/embedding-provider-comparison-latest.json";
const markdownOutputPath =
  process.env.EMBEDDING_COMPARISON_MARKDOWN ??
  "benchmark-results/embedding-provider-comparison-latest.md";

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function signedPct(value: number | null) {
  if (value === null) {
    return "n/a";
  }

  return `${value >= 0 ? "+" : ""}${pct(value)}`;
}

async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

function suiteLines(label: string, suite: BenchmarkSuiteRun) {
  return [
    `## ${label}`,
    "",
    `- Effective provider: ${suite.embeddingCheck.providerName}`,
    `- Vector dimensions: ${suite.embeddingCheck.dimensions}`,
    `- Retrieval top-1: ${pct(suite.retrieval.top1Accuracy)}`,
    `- Retrieval recall@5: ${pct(suite.retrieval.meanRecallAt5)}`,
    `- Source quality top-1: ${pct(suite.sourceQuality.top1Accuracy)}`,
    `- Source quality recall@5: ${pct(suite.sourceQuality.meanRecallAt5)}`,
    `- Claim-check accuracy: ${pct(suite.claimCheck.classificationAccuracy)}`,
    ""
  ];
}

function renderMarkdownReport(result: EmbeddingProviderComparisonResult) {
  const lines = [
    "# Embedding Provider Comparison",
    "",
    `Generated at: ${result.generatedAt}`,
    `Verdict: ${result.verdict}`,
    "",
    ...suiteLines("Local Fallback Baseline", result.localFallback)
  ];

  if (result.configuredProvider.status === "completed") {
    lines.push(
      ...suiteLines("Configured Model-Grade Provider", result.configuredProvider),
      "## Deltas vs Local Fallback",
      "",
      `- Retrieval top-1: ${signedPct(result.deltas.retrievalTop1)}`,
      `- Retrieval recall@5: ${signedPct(result.deltas.retrievalRecallAt5)}`,
      `- Source quality top-1: ${signedPct(result.deltas.sourceQualityTop1)}`,
      `- Source quality recall@5: ${signedPct(result.deltas.sourceQualityRecallAt5)}`,
      `- Claim-check accuracy: ${signedPct(result.deltas.claimCheckAccuracy)}`,
      ""
    );
  } else {
    lines.push(
      "## Configured Model-Grade Provider",
      "",
      `- Status: skipped`,
      `- Reason: ${result.configuredProvider.reason}`,
      `- Configured provider: ${result.configuredProvider.config.configuredProvider}`,
      ""
    );
  }

  return `${lines.join("\n").trim()}\n`;
}

function failsRegressionThresholds(result: EmbeddingProviderComparisonResult) {
  const configured = result.configuredProvider;

  if (configured.status === "skipped") {
    return false;
  }

  return (
    configured.retrieval.top1Accuracy < result.localFallback.retrieval.top1Accuracy ||
    configured.retrieval.meanRecallAt5 <
      result.localFallback.retrieval.meanRecallAt5 ||
    configured.sourceQuality.top1Accuracy <
      result.localFallback.sourceQuality.top1Accuracy ||
    configured.sourceQuality.meanRecallAt5 <
      result.localFallback.sourceQuality.meanRecallAt5 ||
    configured.claimCheck.classificationAccuracy <
      result.localFallback.claimCheck.classificationAccuracy
  );
}

async function main() {
  const result = await compareEmbeddingProviders();

  console.log("Embedding provider comparison");
  console.log(`Verdict: ${result.verdict}`);
  console.log(
    `Local fallback: retrieval top1=${pct(
      result.localFallback.retrieval.top1Accuracy
    )}, source top1=${pct(
      result.localFallback.sourceQuality.top1Accuracy
    )}, claim accuracy=${pct(result.localFallback.claimCheck.classificationAccuracy)}`
  );

  if (result.configuredProvider.status === "completed") {
    console.log(
      `Configured provider: retrieval top1=${pct(
        result.configuredProvider.retrieval.top1Accuracy
      )}, source top1=${pct(
        result.configuredProvider.sourceQuality.top1Accuracy
      )}, claim accuracy=${pct(
        result.configuredProvider.claimCheck.classificationAccuracy
      )}`
    );
  } else {
    console.log(`Configured provider skipped: ${result.configuredProvider.reason}`);
  }

  await writeTextFile(jsonOutputPath, `${JSON.stringify(result, null, 2)}\n`);
  await writeTextFile(markdownOutputPath, renderMarkdownReport(result));

  console.log(`Wrote JSON report: ${jsonOutputPath}`);
  console.log(`Wrote Markdown report: ${markdownOutputPath}`);

  if (failsRegressionThresholds(result)) {
    console.error(
      "Configured embedding provider regressed against the local fallback baseline."
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

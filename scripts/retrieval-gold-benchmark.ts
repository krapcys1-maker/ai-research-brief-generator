import { evaluateGoldQueries } from "@/lib/benchmarks/retrievalGold";

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

const minTop1 = numberEnv("RETRIEVAL_BENCHMARK_MIN_TOP1", 0.85);
const minRecall = numberEnv("RETRIEVAL_BENCHMARK_MIN_RECALL", 0.85);

async function main() {
  const result = await evaluateGoldQueries();

  console.log("Retrieval gold benchmark");
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

  if (failed) {
    console.error("");
    console.error(
      `Retrieval benchmark failed thresholds: top1 >= ${pct(
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

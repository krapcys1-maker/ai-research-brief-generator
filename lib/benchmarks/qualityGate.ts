import { evaluateClaimCheckCases } from "@/lib/benchmarks/claimCheck";
import { evaluateGoldQueries } from "@/lib/benchmarks/retrievalGold";
import { evaluateSourceQualityCases } from "@/lib/benchmarks/sourceQuality";
import {
  BenchmarkQualityThresholds,
  resolveBenchmarkQualityThresholds
} from "@/lib/benchmarks/qualityThresholds";

export type BenchmarkQualityGateResult = {
  generatedAt: string;
  passed: boolean;
  thresholds: BenchmarkQualityThresholds;
  suites: {
    retrieval: Awaited<ReturnType<typeof evaluateGoldQueries>>;
    sourceQuality: Awaited<ReturnType<typeof evaluateSourceQualityCases>>;
    claimCheck: Awaited<ReturnType<typeof evaluateClaimCheckCases>>;
  };
  failures: string[];
};

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function collectRetrievalFailures(
  result: Awaited<ReturnType<typeof evaluateGoldQueries>>,
  thresholds: BenchmarkQualityThresholds["retrieval"]
) {
  const failures: string[] = [];

  if (result.top1Accuracy < thresholds.minTop1) {
    failures.push(
      `retrieval top-1 ${pct(result.top1Accuracy)} below ${pct(
        thresholds.minTop1
      )}`
    );
  }

  if (result.meanRecallAt5 < thresholds.minRecallAt5) {
    failures.push(
      `retrieval recall@5 ${pct(result.meanRecallAt5)} below ${pct(
        thresholds.minRecallAt5
      )}`
    );
  }

  if (result.excludedFailureCount > thresholds.maxExcludedTopFailures) {
    failures.push(
      `retrieval excluded top failures ${result.excludedFailureCount} above ${thresholds.maxExcludedTopFailures}`
    );
  }

  return failures;
}

function collectSourceQualityFailures(
  result: Awaited<ReturnType<typeof evaluateSourceQualityCases>>,
  thresholds: BenchmarkQualityThresholds["sourceQuality"]
) {
  const failures: string[] = [];

  if (result.top1Accuracy < thresholds.minTop1) {
    failures.push(
      `source-quality top-1 ${pct(result.top1Accuracy)} below ${pct(
        thresholds.minTop1
      )}`
    );
  }

  if (result.meanRecallAt5 < thresholds.minRecallAt5) {
    failures.push(
      `source-quality recall@5 ${pct(result.meanRecallAt5)} below ${pct(
        thresholds.minRecallAt5
      )}`
    );
  }

  if (result.excludedFailureCount > thresholds.maxExcludedTopFailures) {
    failures.push(
      `source-quality excluded top failures ${result.excludedFailureCount} above ${thresholds.maxExcludedTopFailures}`
    );
  }

  return failures;
}

function collectClaimCheckFailures(
  result: Awaited<ReturnType<typeof evaluateClaimCheckCases>>,
  thresholds: BenchmarkQualityThresholds["claimCheck"]
) {
  const failures: string[] = [];

  if (result.classificationAccuracy < thresholds.minClassificationAccuracy) {
    failures.push(
      `claim-check accuracy ${pct(result.classificationAccuracy)} below ${pct(
        thresholds.minClassificationAccuracy
      )}`
    );
  }

  const requirementFailures =
    result.evidenceRequirementFailures +
    result.similarWorkRequirementFailures +
    result.caveatRequirementFailures +
    result.evidenceBoundaryRequirementFailures;

  if (requirementFailures > thresholds.maxRequirementFailures) {
    failures.push(
      `claim-check requirement failures ${requirementFailures} above ${thresholds.maxRequirementFailures}`
    );
  }

  return failures;
}

export async function evaluateBenchmarkQualityGate(input?: {
  thresholds?: BenchmarkQualityThresholds;
  generatedAt?: string;
}): Promise<BenchmarkQualityGateResult> {
  const thresholds = input?.thresholds ?? resolveBenchmarkQualityThresholds();
  const [retrieval, sourceQuality, claimCheck] = await Promise.all([
    evaluateGoldQueries(),
    evaluateSourceQualityCases(),
    evaluateClaimCheckCases()
  ]);
  const failures = [
    ...collectRetrievalFailures(retrieval, thresholds.retrieval),
    ...collectSourceQualityFailures(sourceQuality, thresholds.sourceQuality),
    ...collectClaimCheckFailures(claimCheck, thresholds.claimCheck)
  ];

  return {
    generatedAt: input?.generatedAt ?? new Date().toISOString(),
    passed: failures.length === 0,
    thresholds,
    suites: {
      retrieval,
      sourceQuality,
      claimCheck
    },
    failures
  };
}

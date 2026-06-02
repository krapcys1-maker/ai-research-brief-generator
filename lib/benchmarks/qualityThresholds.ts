export type RetrievalBenchmarkThresholds = {
  minTop1: number;
  minRecallAt5: number;
  maxExcludedTopFailures: number;
};

export type SourceQualityBenchmarkThresholds = {
  minTop1: number;
  minRecallAt5: number;
  maxExcludedTopFailures: number;
};

export type ClaimCheckBenchmarkThresholds = {
  minClassificationAccuracy: number;
  maxRequirementFailures: number;
};

export type BenchmarkQualityThresholds = {
  retrieval: RetrievalBenchmarkThresholds;
  sourceQuality: SourceQualityBenchmarkThresholds;
  claimCheck: ClaimCheckBenchmarkThresholds;
};

export const defaultBenchmarkQualityThresholds: BenchmarkQualityThresholds = {
  retrieval: {
    minTop1: 0.85,
    minRecallAt5: 0.85,
    maxExcludedTopFailures: 0
  },
  sourceQuality: {
    minTop1: 0.9,
    minRecallAt5: 0.9,
    maxExcludedTopFailures: 0
  },
  claimCheck: {
    minClassificationAccuracy: 0.9,
    maxRequirementFailures: 0
  }
};

function numberEnv(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number
) {
  const value = env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function resolveBenchmarkQualityThresholds(
  env: NodeJS.ProcessEnv = process.env
): BenchmarkQualityThresholds {
  return {
    retrieval: {
      minTop1: numberEnv(
        env,
        "RETRIEVAL_BENCHMARK_MIN_TOP1",
        defaultBenchmarkQualityThresholds.retrieval.minTop1
      ),
      minRecallAt5: numberEnv(
        env,
        "RETRIEVAL_BENCHMARK_MIN_RECALL",
        defaultBenchmarkQualityThresholds.retrieval.minRecallAt5
      ),
      maxExcludedTopFailures:
        defaultBenchmarkQualityThresholds.retrieval.maxExcludedTopFailures
    },
    sourceQuality: {
      minTop1: numberEnv(
        env,
        "SOURCE_QUALITY_BENCHMARK_MIN_TOP1",
        defaultBenchmarkQualityThresholds.sourceQuality.minTop1
      ),
      minRecallAt5: numberEnv(
        env,
        "SOURCE_QUALITY_BENCHMARK_MIN_RECALL",
        defaultBenchmarkQualityThresholds.sourceQuality.minRecallAt5
      ),
      maxExcludedTopFailures:
        defaultBenchmarkQualityThresholds.sourceQuality.maxExcludedTopFailures
    },
    claimCheck: {
      minClassificationAccuracy: numberEnv(
        env,
        "CLAIM_CHECK_BENCHMARK_MIN_ACCURACY",
        defaultBenchmarkQualityThresholds.claimCheck.minClassificationAccuracy
      ),
      maxRequirementFailures:
        defaultBenchmarkQualityThresholds.claimCheck.maxRequirementFailures
    }
  };
}

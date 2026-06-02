import {
  checkConfiguredEmbeddingProvider,
  getEmbeddingConfigSummary,
  type EmbeddingConfigSummary
} from "@/lib/embeddings/diagnostics";
import { evaluateClaimCheckCases } from "@/lib/benchmarks/claimCheck";
import { evaluateGoldQueries } from "@/lib/benchmarks/retrievalGold";
import { evaluateSourceQualityCases } from "@/lib/benchmarks/sourceQuality";

type EnvUpdates = Record<string, string | undefined>;

export type BenchmarkSuiteRun = {
  label: string;
  status: "completed";
  embeddingCheck: Awaited<ReturnType<typeof checkConfiguredEmbeddingProvider>>;
  retrieval: Awaited<ReturnType<typeof evaluateGoldQueries>>;
  sourceQuality: Awaited<ReturnType<typeof evaluateSourceQualityCases>>;
  claimCheck: Awaited<ReturnType<typeof evaluateClaimCheckCases>>;
};

export type SkippedBenchmarkSuiteRun = {
  label: string;
  status: "skipped";
  reason: string;
  config: EmbeddingConfigSummary;
};

export type EmbeddingProviderComparisonResult = {
  generatedAt: string;
  localFallback: BenchmarkSuiteRun;
  configuredProvider: BenchmarkSuiteRun | SkippedBenchmarkSuiteRun;
  deltas: {
    retrievalTop1: number | null;
    retrievalRecallAt5: number | null;
    sourceQualityTop1: number | null;
    sourceQualityRecallAt5: number | null;
    claimCheckAccuracy: number | null;
  };
  verdict: "model_grade_checked" | "model_grade_not_configured";
};

async function withEnv<T>(updates: EnvUpdates, callback: () => Promise<T>) {
  const previous = new Map<string, string | undefined>();

  for (const [key, value] of Object.entries(updates)) {
    previous.set(key, process.env[key]);

    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await callback();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

async function runSuite(label: string): Promise<BenchmarkSuiteRun> {
  const embeddingCheck = await checkConfiguredEmbeddingProvider();

  if (!embeddingCheck.ok) {
    throw new Error(
      `${label} embedding provider check failed: ${embeddingCheck.message}`
    );
  }

  return {
    label,
    status: "completed",
    embeddingCheck,
    retrieval: await evaluateGoldQueries(),
    sourceQuality: await evaluateSourceQualityCases(),
    claimCheck: await evaluateClaimCheckCases()
  };
}

function metricDeltas(
  localFallback: BenchmarkSuiteRun,
  configuredProvider: BenchmarkSuiteRun | SkippedBenchmarkSuiteRun
) {
  if (configuredProvider.status === "skipped") {
    return {
      retrievalTop1: null,
      retrievalRecallAt5: null,
      sourceQualityTop1: null,
      sourceQualityRecallAt5: null,
      claimCheckAccuracy: null
    };
  }

  return {
    retrievalTop1:
      configuredProvider.retrieval.top1Accuracy -
      localFallback.retrieval.top1Accuracy,
    retrievalRecallAt5:
      configuredProvider.retrieval.meanRecallAt5 -
      localFallback.retrieval.meanRecallAt5,
    sourceQualityTop1:
      configuredProvider.sourceQuality.top1Accuracy -
      localFallback.sourceQuality.top1Accuracy,
    sourceQualityRecallAt5:
      configuredProvider.sourceQuality.meanRecallAt5 -
      localFallback.sourceQuality.meanRecallAt5,
    claimCheckAccuracy:
      configuredProvider.claimCheck.classificationAccuracy -
      localFallback.claimCheck.classificationAccuracy
  };
}

export async function compareEmbeddingProviders(): Promise<EmbeddingProviderComparisonResult> {
  const configuredSummary = getEmbeddingConfigSummary();
  const localFallback = await withEnv(
    {
      EMBEDDING_PROVIDER: "local"
    },
    () => runSuite("local-fallback")
  );

  const configuredProvider =
    configuredSummary.provider === "openai_compatible" && configuredSummary.ready
      ? await runSuite("configured-model-grade")
      : {
          label: "configured-model-grade",
          status: "skipped" as const,
          reason:
            configuredSummary.provider === "local"
              ? "EMBEDDING_PROVIDER is not set to openai_compatible."
              : configuredSummary.provider === "unsupported"
                ? `Unsupported EMBEDDING_PROVIDER "${configuredSummary.configuredProvider}".`
                : `Missing embedding configuration: ${configuredSummary.missing.join(", ")}.`,
          config: configuredSummary
        };

  return {
    generatedAt: new Date().toISOString(),
    localFallback,
    configuredProvider,
    deltas: metricDeltas(localFallback, configuredProvider),
    verdict:
      configuredProvider.status === "completed"
        ? "model_grade_checked"
        : "model_grade_not_configured"
  };
}

import { afterEach, describe, expect, it, vi } from "vitest";
import { compareEmbeddingProviders } from "@/lib/benchmarks/embeddingProviderComparison";

describe("embedding provider comparison", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("runs a local fallback baseline and skips model-grade comparison when not configured", async () => {
    vi.stubEnv("EMBEDDING_PROVIDER", "");

    const result = await compareEmbeddingProviders();

    expect(result.verdict).toBe("model_grade_not_configured");
    expect(result.localFallback.status).toBe("completed");
    expect(result.localFallback.embeddingCheck.providerName).toBe(
      "local-hash-ngrams"
    );
    expect(result.localFallback.retrieval.caseCount).toBeGreaterThan(0);
    expect(result.localFallback.sourceQuality.caseCount).toBeGreaterThan(0);
    expect(result.localFallback.claimCheck.caseCount).toBeGreaterThan(0);
    expect(result.configuredProvider).toMatchObject({
      status: "skipped",
      reason: "EMBEDDING_PROVIDER is not set to openai_compatible."
    });
    expect(result.deltas).toEqual({
      retrievalTop1: null,
      retrievalRecallAt5: null,
      sourceQualityTop1: null,
      sourceQualityRecallAt5: null,
      claimCheckAccuracy: null
    });
  });
});

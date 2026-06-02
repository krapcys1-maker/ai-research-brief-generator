import { describe, expect, it } from "vitest";
import { evaluateBenchmarkQualityGate } from "@/lib/benchmarks/qualityGate";
import {
  defaultBenchmarkQualityThresholds,
  resolveBenchmarkQualityThresholds
} from "@/lib/benchmarks/qualityThresholds";

describe("benchmark quality gate", () => {
  it("resolves default CI thresholds and documented env overrides", () => {
    const thresholds = resolveBenchmarkQualityThresholds({
      RETRIEVAL_BENCHMARK_MIN_TOP1: "0.87",
      RETRIEVAL_BENCHMARK_MIN_RECALL: "0.88",
      SOURCE_QUALITY_BENCHMARK_MIN_TOP1: "0.91",
      SOURCE_QUALITY_BENCHMARK_MIN_RECALL: "0.92",
      CLAIM_CHECK_BENCHMARK_MIN_ACCURACY: "0.93"
    });

    expect(thresholds.retrieval.minTop1).toBe(0.87);
    expect(thresholds.retrieval.minRecallAt5).toBe(0.88);
    expect(thresholds.sourceQuality.minTop1).toBe(0.91);
    expect(thresholds.sourceQuality.minRecallAt5).toBe(0.92);
    expect(thresholds.claimCheck.minClassificationAccuracy).toBe(0.93);
    expect(thresholds.claimCheck.maxRequirementFailures).toBe(0);
  });

  it("falls back to default thresholds for invalid env overrides", () => {
    const thresholds = resolveBenchmarkQualityThresholds({
      RETRIEVAL_BENCHMARK_MIN_TOP1: "not-a-number",
      SOURCE_QUALITY_BENCHMARK_MIN_RECALL: "NaN"
    });

    expect(thresholds.retrieval.minTop1).toBe(
      defaultBenchmarkQualityThresholds.retrieval.minTop1
    );
    expect(thresholds.sourceQuality.minRecallAt5).toBe(
      defaultBenchmarkQualityThresholds.sourceQuality.minRecallAt5
    );
  });

  it("passes current retrieval, source-quality, and claim-check benchmark suites", async () => {
    const result = await evaluateBenchmarkQualityGate({
      generatedAt: "2026-06-02T00:00:00.000Z"
    });

    expect(result.passed).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.suites.retrieval.caseCount).toBeGreaterThan(0);
    expect(result.suites.sourceQuality.caseCount).toBeGreaterThan(0);
    expect(result.suites.claimCheck.caseCount).toBeGreaterThan(0);
  });
});

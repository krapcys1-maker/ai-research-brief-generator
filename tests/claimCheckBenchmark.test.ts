import { describe, expect, it } from "vitest";
import {
  claimCheckBenchmarkCases,
  evaluateClaimCheckCase,
  evaluateClaimCheckCases
} from "@/lib/benchmarks/claimCheck";

describe("claim-check benchmark suite", () => {
  it.each(claimCheckBenchmarkCases)(
    "classifies fixture: $name",
    async (benchmarkCase) => {
      const result = await evaluateClaimCheckCase(benchmarkCase);

      expect(result.actualClassification).toBe(
        benchmarkCase.expectedClassification
      );
      expect(result.evidenceRequirementMet).toBe(true);
      expect(result.similarWorkRequirementMet).toBe(true);
      expect(result.caveatRequirementMet).toBe(true);
      expect(result.evidenceBoundaryRequirementMet).toBe(true);
    }
  );

  it("keeps claim-check benchmark metrics above the configured floor", async () => {
    const result = await evaluateClaimCheckCases();

    expect(result.classificationAccuracy).toBeGreaterThanOrEqual(0.9);
    expect(result.evidenceRequirementFailures).toBe(0);
    expect(result.similarWorkRequirementFailures).toBe(0);
    expect(result.caveatRequirementFailures).toBe(0);
    expect(result.evidenceBoundaryRequirementFailures).toBe(0);
  });
});

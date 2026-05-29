import { describe, expect, it } from "vitest";
import {
  evaluateSourceQualityCases,
  rankSourceQualityCase,
  sourceQualityCases
} from "@/lib/benchmarks/sourceQuality";

describe("source quality benchmark suite", () => {
  it.each(sourceQualityCases)(
    "selects expected live-source papers for $name",
    async (sourceQualityCase) => {
      const { selected } = await rankSourceQualityCase(sourceQualityCase);
      const selectedIds = selected.map((paper) => paper.id);

      for (const expectedId of sourceQualityCase.expectedTopIds) {
        expect(selectedIds).toContain(expectedId);
      }

      for (const excludedId of sourceQualityCase.excludedFromTopIds ?? []) {
        expect(
          selectedIds.slice(0, sourceQualityCase.expectedTopIds.length)
        ).not.toContain(excludedId);
      }
    }
  );

  it("keeps source-quality metrics above the configured floor", async () => {
    const result = await evaluateSourceQualityCases();

    expect(result.top1Accuracy).toBeGreaterThanOrEqual(0.9);
    expect(result.meanRecallAt5).toBeGreaterThanOrEqual(0.9);
    expect(result.excludedFailureCount).toBe(0);
  });
});

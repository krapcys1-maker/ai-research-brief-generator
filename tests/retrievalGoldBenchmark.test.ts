import { describe, expect, it } from "vitest";
import {
  evaluateGoldQueries,
  goldQueries,
  rankGoldQuery
} from "@/lib/benchmarks/retrievalGold";

describe("retrieval gold benchmark suite", () => {
  it.each(goldQueries)(
    "selects expected sources for $name",
    async (goldQuery) => {
      const { selected } = await rankGoldQuery(goldQuery);
      const selectedIds = selected.map((paper) => paper.id);

      for (const expectedId of goldQuery.expectedTopIds) {
        expect(selectedIds).toContain(expectedId);
      }

      for (const excludedId of goldQuery.excludedFromTopIds ?? []) {
        expect(selectedIds.slice(0, goldQuery.expectedTopIds.length)).not.toContain(
          excludedId
        );
      }
    }
  );

  it("keeps top-1 accuracy high across gold queries", async () => {
    const result = await evaluateGoldQueries();

    expect(result.top1Accuracy).toBeGreaterThanOrEqual(0.85);
    expect(result.meanRecallAt5).toBeGreaterThanOrEqual(0.85);
    expect(result.excludedFailureCount).toBe(0);
  });
});


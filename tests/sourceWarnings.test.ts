import { describe, expect, it } from "vitest";
import { filterWarningsForSuccessfulSources } from "@/lib/sources";

describe("filterWarningsForSuccessfulSources", () => {
  it("hides empty or failed variant warnings for sources that succeeded elsewhere", () => {
    const warnings = [
      "openalex returned no papers.",
      "openalex failed: transient upstream timeout",
      "arxiv failed: rate limited",
      "semantic_scholar returned no papers."
    ];

    const filtered = filterWarningsForSuccessfulSources(warnings, [
      {
        source: "openalex",
        query: "query variant 1",
        status: "empty",
        resultCount: 0,
        cached: false
      },
      {
        source: "openalex",
        query: "query variant 2",
        status: "success",
        resultCount: 4,
        cached: false
      },
      {
        source: "arxiv",
        query: "query variant 1",
        status: "failed",
        resultCount: 0,
        cached: false
      },
      {
        source: "semantic_scholar",
        query: "query variant 1",
        status: "empty",
        resultCount: 0,
        cached: false
      }
    ]);

    expect(filtered).toEqual([
      "arxiv failed: rate limited",
      "semantic_scholar returned no papers."
    ]);
  });
});

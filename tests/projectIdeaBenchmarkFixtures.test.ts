import { describe, expect, it } from "vitest";
import {
  discoverProjectIdeas,
  IdeaSourceRepoSchema
} from "@/lib/project-ideas";
import { projectIdeaBenchmarkCases } from "@/lib/project-ideas/benchmarkFixtures";

describe("project idea benchmark fixtures", () => {
  it("keeps benchmark case IDs unique and source repos schema-valid", () => {
    const ids = projectIdeaBenchmarkCases.map((testCase) => testCase.id);

    expect(ids).toEqual([...new Set(ids)]);

    for (const testCase of projectIdeaBenchmarkCases) {
      expect(testCase.sourceRepos.length).toBeGreaterThan(0);
      for (const sourceRepo of testCase.sourceRepos) {
        expect(IdeaSourceRepoSchema.parse(sourceRepo)).toEqual(sourceRepo);
      }
    }
  });

  it("selects expected top ideas for regression fixture cases", () => {
    const fixtureCases = projectIdeaBenchmarkCases.filter(
      (testCase) => testCase.expectedTopIdeaTitle
    );

    expect(fixtureCases.length).toBeGreaterThanOrEqual(9);

    for (const testCase of fixtureCases) {
      const report = discoverProjectIdeas({
        domain: testCase.domain,
        constraints: testCase.constraints,
        maxIdeas: 3,
        sourceRepos: testCase.sourceRepos,
        outputLanguage: "pl"
      });

      expect(report.shortlist[0]?.title, testCase.id).toBe(
        testCase.expectedTopIdeaTitle
      );
    }
  });

  it("keeps noisy and multilingual fixture coverage in the benchmark set", () => {
    const tags = new Set(projectIdeaBenchmarkCases.flatMap((testCase) => testCase.tags));

    expect(tags.has("noisy-readme")).toBe(true);
    expect(tags.has("multilingual-issue")).toBe(true);
    expect(tags.has("incidental-noise")).toBe(true);
    expect(tags.has("source-diversity")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  buildGhArchiveTrendQuery,
  collectGhArchiveTrends,
  GhArchiveTrendResultSchema
} from "@/lib/project-ideas";

describe("GH Archive trend collector", () => {
  it("builds date-bounded GH Archive queries instead of scanning all tables", () => {
    const built = buildGhArchiveTrendQuery({
      startDate: "2025-01-01",
      endDate: "2025-01-02",
      maxRepos: 20,
      maxBytesBilled: 200_000_000
    });

    expect(built.query).toContain("`githubarchive.day.20250101`");
    expect(built.query).toContain("`githubarchive.day.20250102`");
    expect(built.query).toContain("LIMIT 20");
    expect(built.query).not.toContain("githubarchive.day.*");
    expect(built.query).toContain("COUNTIF(type = 'WatchEvent') > 0");
    expect(built.query).toContain("LEAST(COUNTIF(type = 'PushEvent'), 100)");
  });

  it("rejects ranges above maxDays before calling BigQuery", async () => {
    await expect(() =>
      collectGhArchiveTrends({
        startDate: "2025-01-01",
        endDate: "2025-01-10",
        maxDays: 3,
        bqExecutor: () => {
          throw new Error("should not run");
        }
      })
    ).rejects.toThrow("maxDays");
  });

  it("returns dry-run diagnostics without running the live query", async () => {
    const calls: string[][] = [];
    const result = await collectGhArchiveTrends({
      startDate: "2025-01-01",
      maxRepos: 10,
      maxBytesBilled: 200_000_000,
      dryRun: true,
      bqExecutor: (args) => {
        calls.push(args);
        return {
          status: 0,
          stdout:
            "Query successfully validated. Assuming the tables are not modified, running this query will process 155658473 bytes of data.",
          stderr: ""
        };
      }
    });

    expect(GhArchiveTrendResultSchema.parse(result)).toEqual(result);
    expect(result.repos).toEqual([]);
    expect(result.diagnostics.dryRun).toBe(true);
    expect(result.diagnostics.estimatedBytesProcessed).toBe(155658473);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("--dry_run");
  });

  it("blocks live query when dry-run estimate exceeds maxBytesBilled", async () => {
    const calls: string[][] = [];
    const result = await collectGhArchiveTrends({
      startDate: "2025-01-01",
      maxBytesBilled: 100,
      dryRun: false,
      bqExecutor: (args) => {
        calls.push(args);
        return {
          status: 0,
          stdout:
            "Query successfully validated. Assuming the tables are not modified, running this query will process 500 bytes of data.",
          stderr: ""
        };
      }
    });

    expect(result.repos).toEqual([]);
    expect(result.diagnostics.warnings.join(" ")).toContain("above maxBytesBilled");
    expect(calls).toHaveLength(1);
  });

  it("runs live query only after safe dry-run", async () => {
    const calls: string[][] = [];
    const result = await collectGhArchiveTrends({
      startDate: "2025-01-01",
      maxRepos: 2,
      maxBytesBilled: 200_000_000,
      dryRun: false,
      bqExecutor: (args) => {
        calls.push(args);
        if (args.includes("--dry_run")) {
          return {
            status: 0,
            stdout:
              "Query successfully validated. Assuming the tables are not modified, running this query will process 155658473 bytes of data.",
            stderr: ""
          };
        }

        return {
          status: 0,
          stdout: JSON.stringify([
            {
              repoFullName: "deepseek-ai/DeepSeek-V3",
              stars: "680",
              forks: "12",
              pushes: "8",
              issues: "3",
              trendScore: "3434"
            }
          ]),
          stderr: ""
        };
      }
    });

    expect(result.repos).toEqual([
      {
        repoFullName: "deepseek-ai/DeepSeek-V3",
        stars: 680,
        forks: 12,
        pushes: 8,
        issues: 3,
        trendScore: 3434
      }
    ]);
    expect(calls).toHaveLength(2);
  });
});

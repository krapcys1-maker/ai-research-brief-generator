import { beforeEach, describe, expect, it } from "vitest";
import {
  clearSourceDiagnostics,
  getRecentSourceDiagnostics,
  getSourceHealthSummary,
  recordSourceDiagnostics
} from "@/lib/storage/sourceDiagnosticsStore";

describe("sourceDiagnosticsStore", () => {
  beforeEach(() => {
    clearSourceDiagnostics();
  });

  it("summarizes recent source diagnostics by source", () => {
    recordSourceDiagnostics([
      {
        source: "mock",
        query: "retrieval augmented generation",
        status: "success",
        resultCount: 5,
        cached: false
      },
      {
        source: "openalex",
        query: "retrieval augmented generation",
        status: "failed",
        resultCount: 0,
        cached: false,
        message: "rate limited"
      },
      {
        source: "mock",
        query: "grounded generation",
        status: "success",
        resultCount: 5,
        cached: true
      }
    ]);

    const summary = getSourceHealthSummary();

    expect(summary.totalDiagnostics).toBe(3);
    expect(summary.bySource).toContainEqual({
      source: "mock",
      success: 2,
      empty: 0,
      failed: 0,
      cached: 1,
      lastStatus: "success",
      lastMessage: null
    });
    expect(summary.bySource).toContainEqual({
      source: "openalex",
      success: 0,
      empty: 0,
      failed: 1,
      cached: 0,
      lastStatus: "failed",
      lastMessage: "rate limited"
    });
    expect(getRecentSourceDiagnostics(1)[0].query).toBe("grounded generation");
  });
});

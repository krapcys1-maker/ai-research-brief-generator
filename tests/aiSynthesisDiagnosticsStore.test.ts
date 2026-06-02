import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAiSynthesisDiagnostics,
  clearAiSynthesisDiagnosticsMemoryForTests,
  getAiSynthesisHealthSummary,
  getRecentAiSynthesisDiagnostics,
  recordAiSynthesisDiagnostic
} from "@/lib/storage/aiSynthesisDiagnosticsStore";

describe("aiSynthesisDiagnosticsStore", () => {
  beforeEach(async () => {
    await clearAiSynthesisDiagnostics();
    clearAiSynthesisDiagnosticsMemoryForTests();
  });

  it("summarizes AI synthesis retries, fallbacks, and provider errors", async () => {
    await recordAiSynthesisDiagnostic({
      query: "retrieval augmented generation",
      provider: "deepseek",
      status: "success",
      attemptCount: 1,
      paperCount: 5
    });
    await recordAiSynthesisDiagnostic({
      query: "clinical retrieval augmented generation",
      provider: "deepseek",
      status: "retry",
      attemptCount: 1,
      paperCount: 5,
      message: "DeepSeek request timed out"
    });
    await recordAiSynthesisDiagnostic({
      query: "clinical retrieval augmented generation",
      provider: "deepseek",
      status: "provider_error",
      attemptCount: 2,
      paperCount: 5,
      message: "DeepSeek request timed out"
    });
    await recordAiSynthesisDiagnostic({
      query: "clinical retrieval augmented generation",
      provider: "deepseek",
      status: "fallback",
      attemptCount: 2,
      paperCount: 5,
      message: "DeepSeek request timed out"
    });

    const summary = await getAiSynthesisHealthSummary();
    const recent = await getRecentAiSynthesisDiagnostics(1);

    expect(summary.totalDiagnostics).toBe(4);
    expect(summary.success).toBe(1);
    expect(summary.retry).toBe(1);
    expect(summary.providerError).toBe(1);
    expect(summary.fallback).toBe(1);
    expect(summary.fallbackRate).toBe(0.5);
    expect(summary.byProvider).toContainEqual({
      provider: "deepseek",
      success: 1,
      retry: 1,
      fallback: 1,
      providerError: 1,
      validationError: 0,
      configurationError: 0,
      lastStatus: "fallback",
      lastMessage: "DeepSeek request timed out"
    });
    expect(recent[0]?.status).toBe("fallback");
  });
});

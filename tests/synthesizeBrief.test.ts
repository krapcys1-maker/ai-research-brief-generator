import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { synthesizeBrief } from "@/lib/ai/synthesizeBrief";
import { createBrief, createPaper } from "@/tests/fixtures";
import { AIProviderError, createAIProvider } from "@/lib/ai/client";
import {
  clearAiSynthesisDiagnostics,
  clearAiSynthesisDiagnosticsMemoryForTests,
  getAiSynthesisHealthSummary
} from "@/lib/storage/aiSynthesisDiagnosticsStore";

vi.mock("@/lib/ai/client", () => ({
  AIConfigurationError: class AIConfigurationError extends Error {},
  AIProviderError: class AIProviderError extends Error {},
  createAIProvider: vi.fn()
}));

describe("synthesizeBrief", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearAiSynthesisDiagnostics();
    clearAiSynthesisDiagnosticsMemoryForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses app-controlled metadata over model-supplied metadata", async () => {
    const paper = createPaper();
    const generatedByModel = "1999-01-01T00:00:00.000Z";

    vi.mocked(createAIProvider).mockReturnValue({
      name: "deepseek",
      generateStructured: async () =>
        createBrief({
          id: "model_brief_id",
          query: "model query",
          outputLanguage: "en",
          generatedAt: generatedByModel
        })
    });

    const brief = await synthesizeBrief({
      id: "brief_from_app",
      query: "halucynacje w modelach jezykowych",
      outputLanguage: "pl",
      queryVariants: ["halucynacje w modelach jezykowych"],
      papers: [paper],
      searchSummary: createBrief().searchSummary
    });

    expect(brief.id).toBe("brief_from_app");
    expect(brief.query).toBe("halucynacje w modelach jezykowych");
    expect(brief.outputLanguage).toBe("pl");
    expect(brief.generatedAt).not.toBe(generatedByModel);
    expect(Date.parse(brief.generatedAt)).not.toBeNaN();
  });

  it("passes grounding validation feedback to the retry prompt", async () => {
    const paper = createPaper();
    const validBrief = createBrief({
      id: "model_brief_id",
      query: "retrieval augmented generation",
      outputLanguage: "en"
    });
    const invalidBrief = {
      ...validBrief,
      executiveSummary: {
        ...validBrief.executiveSummary,
        paragraph:
          "Retrieval augmented generation outperforms unsupported generation in clinical systems.",
        evidence: [
          {
            paperId: paper.id,
            evidenceText:
              "Retrieval augmented generation grounds answers in retrieved evidence.",
            supportLevel: "direct" as const
          }
        ]
      }
    };
    const generateStructured = vi
      .fn()
      .mockResolvedValueOnce(invalidBrief)
      .mockResolvedValueOnce(validBrief);

    vi.mocked(createAIProvider).mockReturnValue({
      name: "deepseek",
      generateStructured
    });

    await synthesizeBrief({
      id: "brief_from_app",
      query: "retrieval augmented generation",
      outputLanguage: "en",
      queryVariants: ["retrieval augmented generation"],
      papers: [paper],
      searchSummary: validBrief.searchSummary
    });

    expect(generateStructured).toHaveBeenCalledTimes(2);
    expect(generateStructured.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        schemaName: "ResearchBrief",
        timeoutMs: 240000
      })
    );
    expect(generateStructured.mock.calls[1]?.[0].userPrompt).toContain(
      "Previous output failed server-side grounding validation"
    );
    expect(generateStructured.mock.calls[1]?.[0].userPrompt).toContain(
      "comparative detail not found in evidence"
    );
  });

  it("retries transient AI provider failures once", async () => {
    const paper = createPaper();
    const validBrief = createBrief({
      id: "model_brief_id",
      query: "retrieval augmented generation",
      outputLanguage: "en"
    });
    const generateStructured = vi
      .fn()
      .mockRejectedValueOnce(
        new AIProviderError(
          "DeepSeek request failed before a response was received: terminated"
        )
      )
      .mockResolvedValueOnce(validBrief);

    vi.mocked(createAIProvider).mockReturnValue({
      name: "deepseek",
      generateStructured
    });

    const brief = await synthesizeBrief({
      id: "brief_from_app",
      query: "retrieval augmented generation",
      outputLanguage: "en",
      queryVariants: ["retrieval augmented generation"],
      papers: [paper],
      searchSummary: validBrief.searchSummary
    });

    expect(generateStructured).toHaveBeenCalledTimes(2);
    expect(brief.id).toBe("brief_from_app");
  });

  it("returns a conservative grounded fallback after repeated provider failures", async () => {
    const paper = createPaper();
    const generatedBrief = createBrief();
    const generateStructured = vi
      .fn()
      .mockRejectedValue(
        new AIProviderError(
          "DeepSeek request failed before a response was received: terminated"
        )
      );

    vi.mocked(createAIProvider).mockReturnValue({
      name: "deepseek",
      generateStructured
    });

    const brief = await synthesizeBrief({
      id: "brief_from_app",
      query: "retrieval augmented generation",
      outputLanguage: "en",
      queryVariants: ["retrieval augmented generation"],
      papers: [paper],
      searchSummary: generatedBrief.searchSummary
    });

    expect(generateStructured).toHaveBeenCalledTimes(2);
    expect(brief.id).toBe("brief_from_app");
    expect(brief.title).toContain("Conservative source brief");
    expect(brief.searchSummary.warnings.join(" ")).toContain(
      "AI synthesis fallback used"
    );
    expect(brief.keyFindings[0]?.finding).toContain(paper.title);
    expect(brief.keyFindings[0]?.explanation).not.toBe(
      brief.keyFindings[0]?.finding
    );
    expect(brief.executiveSummary.evidence[0]?.paperId).toBe(paper.id);

    const diagnostics = await getAiSynthesisHealthSummary();
    expect(diagnostics.retry).toBe(1);
    expect(diagnostics.providerError).toBe(1);
    expect(diagnostics.fallback).toBe(1);
    expect(diagnostics.byProvider[0]?.provider).toBe("deepseek");
  });

  it("uses two synthesis attempts in development before falling back", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const paper = createPaper();
    const generatedBrief = createBrief();
    const generateStructured = vi
      .fn()
      .mockRejectedValue(
        new AIProviderError(
          "DeepSeek request failed before a response was received: terminated"
        )
      );

    vi.mocked(createAIProvider).mockReturnValue({
      name: "deepseek",
      generateStructured
    });

    const brief = await synthesizeBrief({
      id: "brief_from_app",
      query: "retrieval augmented generation",
      outputLanguage: "en",
      queryVariants: ["retrieval augmented generation"],
      papers: [paper],
      searchSummary: generatedBrief.searchSummary
    });

    expect(generateStructured).toHaveBeenCalledTimes(2);
    expect(brief.id).toBe("brief_from_app");
    expect(brief.title).toContain("Conservative source brief");

    const diagnostics = await getAiSynthesisHealthSummary();
    expect(diagnostics.retry).toBe(1);
    expect(diagnostics.providerError).toBe(1);
    expect(diagnostics.fallback).toBe(1);
  });

  it("creates Polish fallback copy for Polish requests", async () => {
    const paper = createPaper({
      title:
        "A Deep Reinforcement Learning-Based Decision Support System for Automated Stock Market Trading",
      abstract:
        "Deep reinforcement learning methods and trading bots are commonly utilized for algorithmic trading."
    });
    const generatedBrief = createBrief();
    const generateStructured = vi
      .fn()
      .mockRejectedValue(new AIProviderError("DeepSeek request timed out."));

    vi.mocked(createAIProvider).mockReturnValue({
      name: "deepseek",
      generateStructured
    });

    const brief = await synthesizeBrief({
      id: "brief_from_app",
      query: "tworzenie bota który gra na giełdzie",
      outputLanguage: "pl",
      queryVariants: ["automated trading bot stock market"],
      papers: [paper],
      searchSummary: generatedBrief.searchSummary
    });

    expect(brief.title).toContain("Ostrożny brief źródłowy");
    expect(brief.tldr).toContain("Provider AI nie zwrócił");
    expect(brief.executiveSummary.paragraph).toContain("Wybrane źródła");
    expect(brief.researchGaps[0]?.gap).toContain("pełnotekstowa");
    expect(brief.suggestedNextQuestions[0]).toContain("pełny tekst");
  });
});

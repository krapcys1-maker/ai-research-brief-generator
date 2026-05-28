import { describe, expect, it, vi } from "vitest";
import { synthesizeBrief } from "@/lib/ai/synthesizeBrief";
import { createBrief, createPaper } from "@/tests/fixtures";
import { createAIProvider } from "@/lib/ai/client";

vi.mock("@/lib/ai/client", () => ({
  AIConfigurationError: class AIConfigurationError extends Error {},
  AIProviderError: class AIProviderError extends Error {},
  createAIProvider: vi.fn()
}));

describe("synthesizeBrief", () => {
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
});

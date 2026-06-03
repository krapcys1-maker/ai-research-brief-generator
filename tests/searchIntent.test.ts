import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAIProvider, AIConfigurationError } from "@/lib/ai/client";
import { buildSearchIntent } from "@/lib/ai/searchIntent";

vi.mock("@/lib/ai/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/client")>(
    "@/lib/ai/client"
  );

  return {
    ...actual,
    createAIProvider: vi.fn()
  };
});

describe("buildSearchIntent", () => {
  beforeEach(() => {
    vi.mocked(createAIProvider).mockReset();
  });

  it("uses AI to translate informal Polish topics into academic search variants", async () => {
    const generateStructured = vi.fn().mockResolvedValue({
      outputLanguage: "pl",
      searchIntent: "algorithmic trading bot stock market",
      queryVariants: [
        "automated trading systems stock market",
        "reinforcement learning algorithmic trading",
        "machine learning stock trading strategies",
        "algorithmic trading financial markets"
      ]
    });

    vi.mocked(createAIProvider).mockReturnValue({
      name: "deepseek",
      generateStructured
    });

    const result = await buildSearchIntent(
      "tworzenie bota który gra na giełdzie"
    );

    expect(result.source).toBe("ai");
    expect(result.outputLanguage).toBe("pl");
    expect(result.queryVariants).toEqual(
      expect.arrayContaining([
        "tworzenie bota który gra na giełdzie",
        "algorithmic trading bot stock market",
        "automated trading systems stock market",
        "reinforcement learning algorithmic trading"
      ])
    );
    expect(generateStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaName: "SearchIntent",
        timeoutMs: 8000
      })
    );
  });

  it("falls back to local query variants when AI is unavailable", async () => {
    vi.mocked(createAIProvider).mockImplementation(() => {
      throw new AIConfigurationError("Missing DEEPSEEK_API_KEY.");
    });

    const result = await buildSearchIntent(
      "tworzenie bota który gra na giełdzie"
    );

    expect(result.source).toBe("fallback");
    expect(result.warning).toContain("Missing DEEPSEEK_API_KEY");
    expect(result.queryVariants).toContain("algorithmic trading bot stock market");
  });
});

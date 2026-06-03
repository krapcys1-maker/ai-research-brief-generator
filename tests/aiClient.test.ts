import { afterEach, describe, expect, it, vi } from "vitest";
import { createAIProvider } from "@/lib/ai/client";

describe("AI provider client", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("times out the full DeepSeek response cycle, including JSON body reads", async () => {
    vi.useFakeTimers();
    vi.stubEnv("AI_PROVIDER", "deepseek");
    vi.stubEnv("AI_MODEL", "deepseek-test");
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    vi.stubEnv("AI_REQUEST_TIMEOUT_MS", "5");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => new Promise(() => undefined)
      })
    );

    const provider = createAIProvider();
    const promise = provider.generateStructured({
      schemaName: "ResearchBrief",
      systemPrompt: "Return JSON.",
      userPrompt: "Return JSON."
    });
    const assertion = expect(promise).rejects.toThrow(
      "DeepSeek request timed out after 1 seconds."
    );

    await vi.advanceTimersByTimeAsync(5);
    await assertion;
  });

  it("sends bounded non-thinking JSON requests to DeepSeek by default", async () => {
    vi.stubEnv("AI_PROVIDER", "deepseek");
    vi.stubEnv("AI_MODEL", "deepseek-test");
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "{\"ok\":true}" } }]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createAIProvider();
    await provider.generateStructured({
      schemaName: "ResearchBrief",
      systemPrompt: "Return JSON.",
      userPrompt: "Return JSON."
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));

    expect(body).toEqual(
      expect.objectContaining({
        model: "deepseek-test",
        max_tokens: 7000,
        thinking: { type: "disabled" },
        response_format: { type: "json_object" }
      })
    );
  });

  it("allows DeepSeek output and thinking limits to be configured", async () => {
    vi.stubEnv("AI_PROVIDER", "deepseek");
    vi.stubEnv("AI_MODEL", "deepseek-test");
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    vi.stubEnv("AI_MAX_OUTPUT_TOKENS", "1200");
    vi.stubEnv("AI_THINKING_ENABLED", "true");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "{\"ok\":true}" } }]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createAIProvider();
    await provider.generateStructured({
      schemaName: "ResearchBrief",
      systemPrompt: "Return JSON.",
      userPrompt: "Return JSON."
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));

    expect(body.max_tokens).toBe(1200);
    expect(body.thinking).toEqual({ type: "enabled" });
  });

  it("allows a structured request to override model and output token limits", async () => {
    vi.stubEnv("AI_PROVIDER", "deepseek");
    vi.stubEnv("AI_MODEL", "deepseek-test");
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");
    vi.stubEnv("AI_MAX_OUTPUT_TOKENS", "7000");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "{\"ok\":true}" } }]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createAIProvider();
    await provider.generateStructured({
      schemaName: "ResearchBrief",
      systemPrompt: "Return JSON.",
      userPrompt: "Return JSON.",
      model: "deepseek-v4-flash",
      maxTokens: 4500
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));

    expect(body.model).toBe("deepseek-v4-flash");
    expect(body.max_tokens).toBe(4500);
  });

  it("reports invalid structured JSON as a provider error", async () => {
    vi.stubEnv("AI_PROVIDER", "deepseek");
    vi.stubEnv("AI_MODEL", "deepseek-test");
    vi.stubEnv("DEEPSEEK_API_KEY", "test-key");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "{\"ok\":" } }]
        })
      })
    );

    const provider = createAIProvider();

    await expect(
      provider.generateStructured({
        schemaName: "ResearchBrief",
        systemPrompt: "Return JSON.",
        userPrompt: "Return JSON."
      })
    ).rejects.toThrow("AI provider returned invalid JSON");
  });
});

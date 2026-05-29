import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkConfiguredEmbeddingProvider,
  getEmbeddingConfigSummary
} from "@/lib/embeddings/diagnostics";

describe("embedding diagnostics", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("reports local fallback as ready by default", () => {
    vi.stubEnv("EMBEDDING_PROVIDER", "");

    expect(getEmbeddingConfigSummary()).toMatchObject({
      provider: "local",
      usesLocalFallback: true,
      ready: true,
      missing: []
    });
  });

  it("reports missing OpenAI-compatible embedding configuration without secrets", () => {
    vi.stubEnv("EMBEDDING_PROVIDER", "openai_compatible");
    vi.stubEnv("EMBEDDING_BASE_URL", "");
    vi.stubEnv("EMBEDDING_API_KEY", "");
    vi.stubEnv("EMBEDDING_MODEL", "text-embedding-test");

    expect(getEmbeddingConfigSummary()).toMatchObject({
      provider: "openai_compatible",
      usesLocalFallback: false,
      ready: false,
      missing: ["EMBEDDING_BASE_URL", "EMBEDDING_API_KEY"]
    });
  });

  it("checks configured provider vector shape", async () => {
    vi.stubEnv("EMBEDDING_PROVIDER", "openai_compatible");
    vi.stubEnv("EMBEDDING_BASE_URL", "https://embeddings.example/v1");
    vi.stubEnv("EMBEDDING_API_KEY", "test-key");
    vi.stubEnv("EMBEDDING_MODEL", "text-embedding-test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            { index: 0, embedding: [1, 0, 0] },
            { index: 1, embedding: [0, 1, 0] }
          ]
        })
      })
    );

    const result = await checkConfiguredEmbeddingProvider(["first", "second"]);

    expect(result).toMatchObject({
      ok: true,
      providerName: "openai-compatible",
      dimensions: 3,
      checkedTexts: 2
    });
  });

  it("does not call the provider when required config is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubEnv("EMBEDDING_PROVIDER", "openai_compatible");
    vi.stubEnv("EMBEDDING_API_KEY", "");
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkConfiguredEmbeddingProvider(["first"]);

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Missing embedding configuration");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmbeddingProvider } from "@/lib/embeddings/client";
import { scorePapersForQueriesHybrid } from "@/lib/pipeline/score";
import { createPaper } from "@/tests/fixtures";

describe("embedding provider configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses local embeddings by default", async () => {
    const provider = createEmbeddingProvider();
    const [embedding] = await provider.embed(["retrieval augmented generation"]);

    expect(provider.name).toBe("local-hash-ngrams");
    expect(embedding.length).toBeGreaterThan(0);
  });

  it("calls an OpenAI-compatible embeddings endpoint when configured", async () => {
    vi.stubEnv("EMBEDDING_PROVIDER", "openai_compatible");
    vi.stubEnv("EMBEDDING_BASE_URL", "https://embeddings.example/v1");
    vi.stubEnv("EMBEDDING_API_KEY", "test-key");
    vi.stubEnv("EMBEDDING_MODEL", "test-embedding-model");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { index: 1, embedding: [0, 1, 0] },
          { index: 0, embedding: [1, 0, 0] }
        ]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = createEmbeddingProvider();
    const embeddings = await provider.embed(["first", "second"]);

    expect(provider.name).toBe("openai-compatible");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://embeddings.example/v1/embeddings",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key"
        }),
        body: JSON.stringify({
          model: "test-embedding-model",
          input: ["first", "second"]
        })
      })
    );
    expect(embeddings).toEqual([
      [1, 0, 0],
      [0, 1, 0]
    ]);
  });

  it("requires explicit configuration for OpenAI-compatible embeddings", () => {
    vi.stubEnv("EMBEDDING_PROVIDER", "openai_compatible");
    vi.stubEnv("EMBEDDING_BASE_URL", "");
    vi.stubEnv("EMBEDDING_API_KEY", "");
    vi.stubEnv("EMBEDDING_MODEL", "");

    expect(() => createEmbeddingProvider()).toThrow("EMBEDDING_API_KEY");
  });

  it("falls back to lexical scoring when embeddings are unavailable", async () => {
    const scored = await scorePapersForQueriesHybrid(
      [
        createPaper({
          id: "rag",
          title: "Retrieval-Augmented Generation in Medicine",
          abstract: "Retrieval grounding supports medical question answering.",
          source: "openalex"
        })
      ],
      ["retrieval augmented generation medicine"],
      {
        name: "broken-provider",
        async embed() {
          throw new Error("provider unavailable");
        }
      }
    );

    expect(scored[0].id).toBe("rag");
    expect(scored[0].semanticScore).toBe(0);
    expect(scored[0].relevanceScore).toBeGreaterThan(0);
  });
});


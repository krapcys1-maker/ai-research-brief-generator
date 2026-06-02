import { z } from "zod";
import type { EmbeddingProvider } from "@/lib/embeddings/types";

const EmbeddingResponseSchema = z.object({
  data: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      embedding: z.array(z.number())
    })
  )
});

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required when EMBEDDING_PROVIDER=openai_compatible.`);
  }

  return value;
}

function numberEnv(name: string, fallback: number) {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getEmbeddingsEndpoint() {
  const baseUrl = getRequiredEnv("EMBEDDING_BASE_URL").replace(/\/+$/, "");
  return `${baseUrl}/embeddings`;
}

export function createOpenAICompatibleEmbeddingProvider(): EmbeddingProvider {
  const apiKey = getRequiredEnv("EMBEDDING_API_KEY");
  const model = getRequiredEnv("EMBEDDING_MODEL");
  const endpoint = getEmbeddingsEndpoint();
  const timeoutMs = numberEnv("EMBEDDING_REQUEST_TIMEOUT_MS", 30000);

  return {
    name: "openai-compatible",
    async embed(texts: string[]) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      let response: Response;

      try {
        response = await fetch(endpoint, {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            input: texts
          })
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error(`Embedding provider request timed out after ${timeoutMs}ms`);
        }

        throw error;
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        throw new Error(
          `Embedding provider request failed with ${response.status} ${response.statusText}`.trim()
        );
      }

      const payload = EmbeddingResponseSchema.parse(await response.json());
      const embeddingsByIndex = new Map(
        payload.data.map((item) => [item.index, item.embedding])
      );

      return texts.map((_, index) => {
        const embedding = embeddingsByIndex.get(index);

        if (!embedding) {
          throw new Error(`Embedding provider response is missing index ${index}.`);
        }

        return embedding;
      });
    }
  };
}

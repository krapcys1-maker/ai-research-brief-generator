import { localEmbeddingProvider } from "@/lib/embeddings/local";
import { createOpenAICompatibleEmbeddingProvider } from "@/lib/embeddings/openaiCompatible";
import type { EmbeddingProvider } from "@/lib/embeddings/types";

export type EmbeddingProviderName = "local" | "openai_compatible";

function getConfiguredProviderName(): EmbeddingProviderName {
  const configured = process.env.EMBEDDING_PROVIDER?.trim().toLowerCase();

  if (!configured || configured === "local") {
    return "local";
  }

  if (configured === "openai_compatible" || configured === "openai-compatible") {
    return "openai_compatible";
  }

  throw new Error(
    `Unsupported EMBEDDING_PROVIDER "${configured}". Supported providers: local, openai_compatible.`
  );
}

export function createEmbeddingProvider(): EmbeddingProvider {
  const providerName = getConfiguredProviderName();

  if (providerName === "local") {
    return localEmbeddingProvider;
  }

  if (providerName === "openai_compatible") {
    return createOpenAICompatibleEmbeddingProvider();
  }

  return localEmbeddingProvider;
}

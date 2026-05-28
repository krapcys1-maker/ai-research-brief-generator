import { localEmbeddingProvider } from "@/lib/embeddings/local";
import type { EmbeddingProvider } from "@/lib/embeddings/types";

export type EmbeddingProviderName = "local";

function getConfiguredProviderName(): EmbeddingProviderName {
  const configured = process.env.EMBEDDING_PROVIDER?.trim().toLowerCase();

  if (!configured || configured === "local") {
    return "local";
  }

  throw new Error(
    `Unsupported EMBEDDING_PROVIDER "${configured}". Supported providers: local.`
  );
}

export function createEmbeddingProvider(): EmbeddingProvider {
  const providerName = getConfiguredProviderName();

  if (providerName === "local") {
    return localEmbeddingProvider;
  }

  return localEmbeddingProvider;
}


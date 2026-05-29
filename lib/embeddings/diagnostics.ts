import { createEmbeddingProvider } from "@/lib/embeddings/client";

export type EmbeddingConfigSummary = {
  provider: "local" | "openai_compatible" | "unsupported";
  configuredProvider: string;
  usesLocalFallback: boolean;
  ready: boolean;
  missing: string[];
};

const openAICompatibleRequiredEnv = [
  "EMBEDDING_BASE_URL",
  "EMBEDDING_API_KEY",
  "EMBEDDING_MODEL"
] as const;

function configuredProvider(env: NodeJS.ProcessEnv) {
  return env.EMBEDDING_PROVIDER?.trim().toLowerCase() || "local";
}

export function getEmbeddingConfigSummary(
  env: NodeJS.ProcessEnv = process.env
): EmbeddingConfigSummary {
  const provider = configuredProvider(env);

  if (provider === "local") {
    return {
      provider: "local",
      configuredProvider: provider,
      usesLocalFallback: true,
      ready: true,
      missing: []
    };
  }

  if (provider === "openai_compatible" || provider === "openai-compatible") {
    const missing = openAICompatibleRequiredEnv.filter(
      (name) => !env[name]?.trim()
    );

    return {
      provider: "openai_compatible",
      configuredProvider: provider,
      usesLocalFallback: false,
      ready: missing.length === 0,
      missing
    };
  }

  return {
    provider: "unsupported",
    configuredProvider: provider,
    usesLocalFallback: false,
    ready: false,
    missing: []
  };
}

export async function checkConfiguredEmbeddingProvider(texts = [
  "retrieval augmented generation",
  "transformer self attention",
  "medical question answering"
]) {
  const config = getEmbeddingConfigSummary();

  if (!config.ready) {
    return {
      config,
      ok: false,
      providerName: null,
      dimensions: null,
      checkedTexts: texts.length,
      message:
        config.provider === "unsupported"
          ? `Unsupported EMBEDDING_PROVIDER "${config.configuredProvider}".`
          : `Missing embedding configuration: ${config.missing.join(", ")}.`
    };
  }

  const provider = createEmbeddingProvider();
  const embeddings = await provider.embed(texts);
  const dimensions = embeddings[0]?.length ?? 0;
  const consistentDimensions = embeddings.every(
    (embedding) => embedding.length === dimensions
  );
  const finiteValues = embeddings.every((embedding) =>
    embedding.every((value) => Number.isFinite(value))
  );
  const ok = embeddings.length === texts.length && dimensions > 0 && consistentDimensions && finiteValues;

  return {
    config,
    ok,
    providerName: provider.name,
    dimensions,
    checkedTexts: texts.length,
    message: ok
      ? "Embedding provider returned valid vectors."
      : "Embedding provider returned invalid vectors."
  };
}

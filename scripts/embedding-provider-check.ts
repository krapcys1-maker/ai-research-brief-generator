import { checkConfiguredEmbeddingProvider } from "@/lib/embeddings/diagnostics";

async function main() {
  const result = await checkConfiguredEmbeddingProvider();

  console.log("Embedding provider check");
  console.log(`Configured provider: ${result.config.configuredProvider}`);
  console.log(`Effective provider: ${result.providerName ?? result.config.provider}`);
  console.log(
    `Mode: ${
      result.config.usesLocalFallback
        ? "local fallback"
        : result.config.provider === "openai_compatible"
          ? "production/model-grade"
          : "unsupported"
    }`
  );

  if (result.config.missing.length) {
    console.log(`Missing configuration: ${result.config.missing.join(", ")}`);
  }

  if (result.dimensions) {
    console.log(`Vector dimensions: ${result.dimensions}`);
  }

  console.log(`Checked texts: ${result.checkedTexts}`);
  console.log(`Status: ${result.ok ? "ok" : "failed"}`);
  console.log(result.message);

  if (!result.ok) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

import {
  AIConfigurationError,
  AIProviderError,
  createAIProvider
} from "@/lib/ai/client";
import { generateQueryVariants } from "@/lib/ai/generateQueryVariants";
import { detectQueryLanguage, type OutputLanguage } from "@/lib/utils/language";

export type SearchIntentResult = {
  outputLanguage: OutputLanguage;
  queryVariants: string[];
  source: "ai" | "fallback";
  warning?: string;
};

type SearchIntentRaw = {
  outputLanguage?: unknown;
  searchIntent?: unknown;
  queryVariants?: unknown;
};

function numberEnv(name: string, fallback: number) {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function unique(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values.map((item) => item.replace(/\s+/g, " ").trim())) {
    const key = value.toLowerCase();
    if (value && !seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }

  return result;
}

function sanitizeQueryVariant(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 180) : "";
}

function fallbackSearchIntent(query: string, warning?: string): SearchIntentResult {
  const outputLanguage = detectQueryLanguage(query);

  return {
    outputLanguage,
    queryVariants: generateQueryVariants({ query, outputLanguage }),
    source: "fallback",
    warning
  };
}

function parseSearchIntent(query: string, raw: unknown): SearchIntentResult {
  const parsed = raw as SearchIntentRaw;
  const localLanguage = detectQueryLanguage(query);
  const outputLanguage =
    parsed.outputLanguage === "pl" || parsed.outputLanguage === "en"
      ? parsed.outputLanguage
      : localLanguage;
  const searchIntent = sanitizeQueryVariant(parsed.searchIntent);
  const aiVariants = Array.isArray(parsed.queryVariants)
    ? parsed.queryVariants.map(sanitizeQueryVariant)
    : [];
  const fallbackVariants = generateQueryVariants({
    query,
    outputLanguage
  });
  const queryVariants = unique([
    query,
    searchIntent,
    ...aiVariants,
    ...fallbackVariants
  ]).slice(0, 6);

  if (queryVariants.length < 2) {
    throw new AIProviderError("AI search intent did not return usable variants.");
  }

  return {
    outputLanguage,
    queryVariants,
    source: "ai"
  };
}

export async function buildSearchIntent(query: string): Promise<SearchIntentResult> {
  const fallback = fallbackSearchIntent(query);

  try {
    const provider = createAIProvider();
    const raw = await provider.generateStructured({
      schemaName: "SearchIntent",
      timeoutMs: numberEnv("AI_QUERY_EXPANSION_TIMEOUT_MS", 8000),
      maxTokens: numberEnv("AI_QUERY_EXPANSION_MAX_TOKENS", 1200),
      systemPrompt:
        "You translate informal user research topics into source-search intent. Return only JSON. Prefer English academic search phrases because arXiv, OpenAlex, and Semantic Scholar work best in English. Do not answer the topic; only prepare search queries.",
      userPrompt: `Original user query:
${query}

Return JSON with:
{
  "outputLanguage": "pl or en, matching the user's original language",
  "searchIntent": "one concise English academic search phrase",
  "queryVariants": [
    "4-5 concise English scholarly search queries, no more than 12 words each"
  ]
}

Rules:
- Translate slang, broad ideas, and non-English text into precise academic search terms.
- If the user asks for a practical build idea, map it to the research domain behind it.
- Prefer terms that papers would use in titles/abstracts.
- Do not include explanations outside JSON.`
    });

    return parseSearchIntent(query, raw);
  } catch (error) {
    if (
      error instanceof AIConfigurationError ||
      error instanceof AIProviderError ||
      error instanceof Error
    ) {
      return fallbackSearchIntent(query, error.message);
    }

    return fallback;
  }
}

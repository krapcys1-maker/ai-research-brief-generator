import { ResearchBriefSchema, type ResearchBrief } from "@/lib/ai/schemas";
import {
  AIConfigurationError,
  AIProviderError,
  createAIProvider
} from "@/lib/ai/client";
import {
  buildResearchSynthesisPrompt,
  researchSynthesisSystemPrompt
} from "@/lib/ai/prompts";
import { validateBriefGrounding } from "@/lib/pipeline/validateGrounding";
import type { NormalizedPaper } from "@/lib/sources/types";
import type { OutputLanguage } from "@/lib/utils/language";

export type SynthesizeBriefInput = {
  id: string;
  query: string;
  outputLanguage: OutputLanguage;
  queryVariants: string[];
  papers: NormalizedPaper[];
  searchSummary: ResearchBrief["searchSummary"];
};

export async function synthesizeBrief(input: SynthesizeBriefInput) {
  const provider = createAIProvider();
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await provider.generateStructured({
        schemaName: "ResearchBrief",
        systemPrompt: researchSynthesisSystemPrompt,
        userPrompt: buildResearchSynthesisPrompt(input)
      });
      const rawObject =
        raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};

      const parsed = ResearchBriefSchema.parse({
        ...rawObject,
        id: input.id,
        query: input.query,
        outputLanguage: input.outputLanguage,
        generatedAt:
          typeof (rawObject as { generatedAt?: unknown }).generatedAt ===
          "string"
            ? (rawObject as { generatedAt: string }).generatedAt
            : new Date().toISOString(),
        searchSummary: input.searchSummary
      });

      validateBriefGrounding(parsed, input.papers);
      return parsed;
    } catch (error) {
      if (error instanceof AIConfigurationError || error instanceof AIProviderError) {
        throw error;
      }

      lastError = error;
    }
  }

  const message =
    lastError instanceof Error
      ? lastError.message
      : "AI output validation failed.";

  throw new Error(`Could not generate a valid grounded brief: ${message}`);
}

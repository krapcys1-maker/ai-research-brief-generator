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
import { recordAiSynthesisDiagnostic } from "@/lib/storage/aiSynthesisDiagnosticsStore";
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

function isRetryableProviderError(error: AIProviderError) {
  const message = error.message.toLowerCase();

  return (
    message.includes("timed out") ||
    message.includes("before a response") ||
    message.includes("terminated") ||
    message.includes("(408") ||
    message.includes("(429") ||
    message.includes("(500") ||
    message.includes("(502") ||
    message.includes("(503") ||
    message.includes("(504")
  );
}

function getEvidenceText(paper: NormalizedPaper) {
  const abstract = paper.abstract?.trim();
  const sourceText = abstract ? `${paper.title}. ${abstract}` : paper.title.trim();
  return sourceText.length > 520 ? `${sourceText.slice(0, 517)}...` : sourceText;
}

function getDisplayExcerpt(paper: NormalizedPaper) {
  const sourceText = paper.abstract?.trim() || paper.title.trim();
  return sourceText.length > 300 ? `${sourceText.slice(0, 297)}...` : sourceText;
}

function getFallbackCaveat() {
  return "This fallback section is extractive and limited to selected paper metadata or abstracts.";
}

function getDiagnosticStatus(error: unknown) {
  if (error instanceof AIProviderError) {
    return "provider_error" as const;
  }

  return "validation_error" as const;
}

function getDiagnosticMessage(error: unknown) {
  return error instanceof Error ? error.message : "AI output validation failed.";
}

function createFallbackBrief(
  input: SynthesizeBriefInput,
  error: unknown
): ResearchBrief {
  const primaryPaper = input.papers[0];

  if (!primaryPaper) {
    throw new Error("AI output validation failed and no papers were available.");
  }

  const primaryEvidenceText = getEvidenceText(primaryPaper);
  const primaryExcerpt = getDisplayExcerpt(primaryPaper);
  const primaryEvidence = [
    {
      paperId: primaryPaper.id,
      evidenceText: primaryEvidenceText,
      supportLevel: "direct" as const,
      evidenceLevel: primaryPaper.abstract ? ("abstract_supported" as const) : ("metadata_only" as const)
    }
  ];
  const fallbackReason =
    error instanceof Error ? error.message : "AI output validation failed.";
  const warnings = [
    ...input.searchSummary.warnings,
    `AI synthesis fallback used after provider/validation failure: ${fallbackReason}`
  ];

  return {
    id: input.id,
    query: input.query,
    outputLanguage: input.outputLanguage,
    generatedAt: new Date().toISOString(),
    title: `Source-grounded evidence summary: ${input.query}`,
    tldr:
      "The AI synthesis provider did not return a validated brief, so this fallback summary uses only selected paper metadata and abstract evidence.",
    executiveSummary: {
      paragraph: primaryExcerpt,
      sourcePaperIds: [primaryPaper.id],
      evidence: primaryEvidence
    },
    keyFindings: input.papers.slice(0, 3).map((paper) => {
      const evidenceText = getEvidenceText(paper);
      const excerpt = getDisplayExcerpt(paper);
      return {
        finding: paper.title,
        explanation: excerpt,
        confidence: "low" as const,
        sourcePaperIds: [paper.id],
        evidence: [
          {
            paperId: paper.id,
            evidenceText,
            supportLevel: "direct" as const,
            evidenceLevel: paper.abstract ? ("abstract_supported" as const) : ("metadata_only" as const)
          }
        ],
        caveats: [getFallbackCaveat()]
      };
    }),
    majorThemes: input.papers.slice(0, 3).map((paper) => {
      const evidenceText = getEvidenceText(paper);
      const excerpt = getDisplayExcerpt(paper);
      return {
        theme: paper.title,
        description: excerpt,
        sourcePaperIds: [paper.id],
        evidence: [
          {
            paperId: paper.id,
            evidenceText,
            supportLevel: "direct" as const,
            evidenceLevel: paper.abstract ? ("abstract_supported" as const) : ("metadata_only" as const)
          }
        ]
      };
    }),
    influentialPapers: input.papers.slice(0, 4).map((paper) => ({
      paperId: paper.id,
      reason: getDisplayExcerpt(paper)
    })),
    researchGaps: [
      {
        gap: primaryPaper.title,
        whyItMatters: primaryExcerpt,
        sourcePaperIds: [primaryPaper.id],
        evidence: primaryEvidence
      }
    ],
    controversiesOrUncertainties: [
      {
        issue: primaryPaper.title,
        explanation: primaryExcerpt,
        sourcePaperIds: [primaryPaper.id],
        evidence: primaryEvidence
      }
    ],
    suggestedNextQuestions: [
      "Which selected papers provide full-text evidence beyond abstracts?"
    ],
    searchSummary: {
      ...input.searchSummary,
      warnings
    },
    bibliography: input.papers.map((paper) => ({
      paperId: paper.id,
      title: paper.title,
      authors: paper.authors,
      year: paper.year,
      url: paper.sourceUrls[0] ?? null,
      doi: paper.doi
    }))
  };
}

export async function synthesizeBrief(input: SynthesizeBriefInput) {
  const provider = createAIProvider();
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await provider.generateStructured({
        schemaName: "ResearchBrief",
        systemPrompt: researchSynthesisSystemPrompt,
        userPrompt: buildResearchSynthesisPrompt({
          ...input,
          validationFeedback:
            lastError instanceof Error ? lastError.message : undefined
        })
      });
      const rawObject =
        raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};

      const parsed = ResearchBriefSchema.parse({
        ...rawObject,
        id: input.id,
        query: input.query,
        outputLanguage: input.outputLanguage,
        generatedAt: new Date().toISOString(),
        searchSummary: input.searchSummary
      });

      validateBriefGrounding(parsed, input.papers);
      await recordAiSynthesisDiagnostic({
        query: input.query,
        provider: provider.name,
        status: "success",
        attemptCount: attempt + 1,
        paperCount: input.papers.length
      });
      return parsed;
    } catch (error) {
      if (error instanceof AIConfigurationError) {
        await recordAiSynthesisDiagnostic({
          query: input.query,
          provider: provider.name,
          status: "configuration_error",
          attemptCount: attempt + 1,
          paperCount: input.papers.length,
          message: error.message
        });
        throw error;
      }

      if (error instanceof AIProviderError && !isRetryableProviderError(error)) {
        await recordAiSynthesisDiagnostic({
          query: input.query,
          provider: provider.name,
          status: "provider_error",
          attemptCount: attempt + 1,
          paperCount: input.papers.length,
          message: error.message
        });
        throw error;
      }

      lastError = error;
      await recordAiSynthesisDiagnostic({
        query: input.query,
        provider: provider.name,
        status: attempt === 0 ? "retry" : getDiagnosticStatus(error),
        attemptCount: attempt + 1,
        paperCount: input.papers.length,
        message: getDiagnosticMessage(error)
      });
    }
  }

  const fallback = ResearchBriefSchema.parse(createFallbackBrief(input, lastError));
  validateBriefGrounding(fallback, input.papers);
  await recordAiSynthesisDiagnostic({
    query: input.query,
    provider: provider.name,
    status: "fallback",
    attemptCount: 2,
    paperCount: input.papers.length,
    message: getDiagnosticMessage(lastError)
  });
  return fallback;
}

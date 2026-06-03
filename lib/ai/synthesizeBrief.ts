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

function getFallbackCopy(language: OutputLanguage) {
  if (language === "pl") {
    return {
      titlePrefix: "Ostrożny brief źródłowy",
      tldr:
        "Provider AI nie zwrócił pełnej zwalidowanej syntezy, więc ten brief pokazuje ostrożną analizę z tytułów, abstraktów i metadanych wybranych prac.",
      executiveIntro:
        "Wybrane źródła tworzą użyteczną bazę do wstępnej analizy tematu, ale ten wariant nie zastępuje pełnej syntezy modelowej ani weryfikacji pełnych tekstów.",
      caveat:
        "Sekcja awaryjna: wniosek oparty na abstraktach i metadanych, bez pełnotekstowej weryfikacji PDF.",
      sourceFindingPrefix: "Najbliższe źródło",
      abstractIndicates: "Abstrakt wskazuje",
      themes: [
        "Główny kierunek literatury",
        "Metody i dane wejściowe",
        "Praktyczne ograniczenia"
      ],
      gaps: [
        {
          title: "Potrzebna jest pełnotekstowa weryfikacja wyników",
          detail:
            "Ten przebieg korzysta z abstraktów i metadanych, więc przed decyzjami produktowymi trzeba sprawdzić metody, dane, metryki i ograniczenia w pełnych tekstach."
        },
        {
          title: "Ryzyko przeniesienia wyników z badań do realnego wdrożenia",
          detail:
            "Prace mogą raportować wyniki w warunkach eksperymentalnych; wdrożenie wymaga osobnej oceny kosztów, opóźnień, ryzyka i jakości danych."
        }
      ],
      uncertainties: [
        {
          title: "Niepewna porównywalność wyników między pracami",
          detail:
            "Wybrane źródła mogą używać różnych zbiorów danych, metryk i założeń, więc nie należy traktować wyników jako bezpośrednio porównywalnych bez ręcznej kontroli."
        }
      ],
      nextQuestions: [
        "Które wybrane prace mają dostępny pełny tekst i konkretne metryki?",
        "Jakie dane, założenia i ograniczenia powtarzają się w najlepszych źródłach?",
        "Które wyniki są wystarczająco praktyczne, żeby przełożyć je na wymagania produktu?"
      ]
    };
  }

  return {
    titlePrefix: "Conservative source brief",
    tldr:
      "The AI provider did not return a fully validated synthesis, so this brief gives a cautious analysis from selected paper titles, abstracts, and metadata.",
    executiveIntro:
      "The selected sources are useful for an initial analysis, but this fallback does not replace full model synthesis or full-text verification.",
    caveat:
      "Fallback section: abstract- and metadata-grounded, without full-text PDF verification.",
    sourceFindingPrefix: "Closest source",
    abstractIndicates: "The abstract indicates",
    themes: [
      "Main research direction",
      "Methods and input data",
      "Practical limitations"
    ],
    gaps: [
      {
        title: "Full-text verification is still needed",
        detail:
          "This run uses abstracts and metadata, so methods, data, metrics, and limitations should be checked in the full papers before product decisions."
      },
      {
        title: "Research-to-production transfer risk remains",
        detail:
          "Reported results may come from experimental settings; deployment needs a separate review of cost, latency, risk, and data quality."
      }
    ],
    uncertainties: [
      {
        title: "Results may not be directly comparable across papers",
        detail:
          "The selected sources may use different datasets, metrics, and assumptions, so their findings should not be compared directly without manual review."
      }
    ],
    nextQuestions: [
      "Which selected papers have full text and concrete metrics?",
      "Which data assumptions and limitations repeat across the strongest sources?",
      "Which findings are practical enough to turn into product requirements?"
    ]
  };
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

function numberEnv(name: string, fallback: number) {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getSynthesisAttemptCount() {
  return numberEnv("AI_SYNTHESIS_ATTEMPTS", 2);
}

function getSynthesisRequestTimeoutMs() {
  return numberEnv("AI_SYNTHESIS_REQUEST_TIMEOUT_MS", 240000);
}

function getPaperEvidence(paper: NormalizedPaper) {
  return [
    {
      paperId: paper.id,
      evidenceText: getEvidenceText(paper),
      supportLevel: "direct" as const,
      evidenceLevel: paper.abstract
        ? ("abstract_supported" as const)
        : ("metadata_only" as const)
    }
  ];
}

function createFallbackBrief(
  input: SynthesizeBriefInput,
  error: unknown
): ResearchBrief {
  const primaryPaper = input.papers[0];

  if (!primaryPaper) {
    throw new Error("AI output validation failed and no papers were available.");
  }

  const copy = getFallbackCopy(input.outputLanguage);
  const primaryExcerpt = getDisplayExcerpt(primaryPaper);
  const primaryEvidence = getPaperEvidence(primaryPaper);
  const topPapers = input.papers.slice(0, 3);
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
    title: `${copy.titlePrefix}: ${input.query}`,
    tldr: copy.tldr,
    executiveSummary: {
      paragraph: `${copy.executiveIntro} ${copy.abstractIndicates}: ${primaryExcerpt}`,
      sourcePaperIds: [primaryPaper.id],
      evidence: primaryEvidence
    },
    keyFindings: topPapers.map((paper) => {
      const excerpt = getDisplayExcerpt(paper);
      return {
        finding: `${copy.sourceFindingPrefix}: ${paper.title}`,
        explanation: `${copy.abstractIndicates}: ${excerpt}`,
        confidence: "low" as const,
        sourcePaperIds: [paper.id],
        evidence: getPaperEvidence(paper),
        caveats: [copy.caveat]
      };
    }),
    majorThemes: topPapers.map((paper, index) => ({
      theme: `${copy.themes[index] ?? copy.themes[0] ?? "Source theme"}: ${paper.title}`,
      description: `${copy.abstractIndicates}: ${getDisplayExcerpt(paper)}`,
      sourcePaperIds: [paper.id],
      evidence: getPaperEvidence(paper)
    })),
    influentialPapers: input.papers.slice(0, 4).map((paper) => ({
      paperId: paper.id,
      reason: getDisplayExcerpt(paper)
    })),
    researchGaps: topPapers.slice(0, 2).map((paper, index) => ({
      gap: `${copy.gaps[index]?.title ?? copy.gaps[0]?.title ?? "Evidence gap"}: ${paper.title}`,
      whyItMatters: `${copy.abstractIndicates}: ${getDisplayExcerpt(paper)}`,
      sourcePaperIds: [paper.id],
      evidence: getPaperEvidence(paper)
    })),
    controversiesOrUncertainties: [
      {
        issue: `${copy.uncertainties[0].title}: ${primaryPaper.title}`,
        explanation: `${copy.abstractIndicates}: ${primaryExcerpt}`,
        sourcePaperIds: [primaryPaper.id],
        evidence: primaryEvidence
      }
    ],
    suggestedNextQuestions: copy.nextQuestions,
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
  const maxAttempts = getSynthesisAttemptCount();
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const raw = await provider.generateStructured({
        schemaName: "ResearchBrief",
        timeoutMs: getSynthesisRequestTimeoutMs(),
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
        status:
          attempt < maxAttempts - 1 ? "retry" : getDiagnosticStatus(error),
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
    attemptCount: maxAttempts,
    paperCount: input.papers.length,
    message: getDiagnosticMessage(lastError)
  });
  return fallback;
}

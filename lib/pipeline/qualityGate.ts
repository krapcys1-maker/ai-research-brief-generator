import type { BriefRequest } from "@/lib/ai/schemas";
import { getPaperQueryAlignment } from "@/lib/pipeline/paperInsights";
import type { NormalizedPaper, ResearchSource } from "@/lib/sources/types";

export type ResearchQualityGateResult = {
  coverage: "good" | "limited" | "poor";
  canSynthesize: boolean;
  selectedPaperCount: number;
  livePaperCount: number;
  mockPaperCount: number;
  averageRelevance: number;
  warningCount: number;
  reasons: string[];
  suggestions: string[];
};

export class ResearchQualityGateError extends Error {
  constructor(public readonly qualityGate: ResearchQualityGateResult) {
    super(
      qualityGate.reasons[0] ??
        "The selected sources are not strong enough to generate a grounded brief."
    );
    this.name = "ResearchQualityGateError";
  }
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function getLiveSources(sources: ResearchSource[]) {
  return sources.filter((source) => source !== "mock");
}

function buildSuggestions(input: {
  request: BriefRequest;
  queryVariants: string[];
  selected: NormalizedPaper[];
}) {
  const suggestions = new Set<string>();
  const liveSources = getLiveSources(input.request.sources);

  if (!liveSources.length) {
    suggestions.add("Select at least one live academic source such as OpenAlex or arXiv.");
  }

  if (input.selected.length < 3) {
    suggestions.add("Broaden the query or remove a narrow year range.");
  }

  const usefulVariant = input.queryVariants.find(
    (variant) => variant.toLowerCase() !== input.request.query.toLowerCase()
  );

  if (usefulVariant) {
    suggestions.add(`Try this broader query: ${usefulVariant}`);
  }

  if (!input.request.sources.includes("openalex")) {
    suggestions.add("Try enabling OpenAlex for broader scholarly coverage.");
  }

  if (!input.request.sources.includes("arxiv")) {
    suggestions.add("Try enabling arXiv for preprints and recent technical work.");
  }

  return [...suggestions].slice(0, 4);
}

function getBestQueryAlignmentScore(paper: NormalizedPaper, queryVariants: string[]) {
  if (!queryVariants.length) {
    return 0;
  }

  return Math.max(
    ...queryVariants.map(
      (variant) => getPaperQueryAlignment(paper, variant).combinedScore
    )
  );
}

export function evaluateResearchQuality(input: {
  request: BriefRequest;
  selected: NormalizedPaper[];
  warnings: string[];
  queryVariants: string[];
}): ResearchQualityGateResult {
  const selectedPaperCount = input.selected.length;
  const mockPaperCount = input.selected.filter((paper) => paper.source === "mock")
    .length;
  const livePaperCount = selectedPaperCount - mockPaperCount;
  const averageRelevance = selectedPaperCount
    ? input.selected.reduce((sum, paper) => sum + (paper.relevanceScore ?? 0), 0) /
      selectedPaperCount
    : 0;
  const queryAlignmentScores = input.selected.map((paper) =>
    getBestQueryAlignmentScore(paper, input.queryVariants)
  );
  const strongQueryAlignmentPaperCount = queryAlignmentScores.filter(
    (score) => score >= 0.65
  ).length;
  const weakQueryAlignmentPaperCount = queryAlignmentScores.filter(
    (score) => score < 0.3
  ).length;
  const liveSourcesRequested = getLiveSources(input.request.sources).length > 0;
  const mockOnly = selectedPaperCount > 0 && mockPaperCount === selectedPaperCount;
  const reasons: string[] = [];

  if (!selectedPaperCount) {
    reasons.push("No relevant papers were available after deduplication and scoring.");
  }

  if (selectedPaperCount > 0 && selectedPaperCount < 2) {
    reasons.push("Only one relevant paper was selected, which is too thin for a reliable synthesis.");
  }

  if (averageRelevance > 0 && averageRelevance < 0.25) {
    reasons.push("The selected papers have weak relevance to the query.");
  }

  if (
    selectedPaperCount >= 3 &&
    strongQueryAlignmentPaperCount === 0 &&
    weakQueryAlignmentPaperCount >= selectedPaperCount * 0.6
  ) {
    reasons.push("The selected papers only weakly match the query wording and variants.");
  }

  if (liveSourcesRequested && mockOnly) {
    reasons.push("Only mock/demo papers were selected even though live sources were requested.");
  }

  const canSynthesize = reasons.length === 0;
  const hasStrongAlignment =
    strongQueryAlignmentPaperCount >= Math.max(1, selectedPaperCount * 0.25);
  const coverage =
    !canSynthesize
      ? "poor"
      : selectedPaperCount >= 6 &&
          livePaperCount >= 3 &&
          averageRelevance >= 0.45 &&
          hasStrongAlignment
        ? "good"
        : "limited";

  return {
    coverage,
    canSynthesize,
    selectedPaperCount,
    livePaperCount,
    mockPaperCount,
    averageRelevance: round2(averageRelevance),
    warningCount: input.warnings.length,
    reasons,
    suggestions: buildSuggestions({
      request: input.request,
      queryVariants: input.queryVariants,
      selected: input.selected
    })
  };
}

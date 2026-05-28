import {
  BriefRequestSchema,
  type BriefRequest,
  type ResearchBrief
} from "@/lib/ai/schemas";
import { generateQueryVariants } from "@/lib/ai/generateQueryVariants";
import { dedupePapers } from "@/lib/pipeline/dedupe";
import {
  evaluateResearchQuality,
  type ResearchQualityGateResult
} from "@/lib/pipeline/qualityGate";
import { scorePapersForQueriesHybrid, selectTopPapers } from "@/lib/pipeline/score";
import { searchAllSources, type SearchAllSourcesResult } from "@/lib/sources";
import type { NormalizedPaper, ResearchSource } from "@/lib/sources/types";
import { detectQueryLanguage, type OutputLanguage } from "@/lib/utils/language";

export type PreflightBriefDependencies = {
  search?: typeof searchAllSources;
};

export type ResearchPreflightResult = {
  request: BriefRequest;
  outputLanguage: OutputLanguage;
  queryVariants: string[];
  rawPapers: NormalizedPaper[];
  dedupedPapers: NormalizedPaper[];
  scoredPapers: NormalizedPaper[];
  selectedPapers: NormalizedPaper[];
  sourcesUsed: ResearchSource[];
  sourceDiagnostics: ResearchBrief["searchSummary"]["sourceDiagnostics"];
  warnings: string[];
  searchSummary: ResearchBrief["searchSummary"];
  qualityGate: ResearchQualityGateResult;
};

export function createSearchSummary(input: {
  raw: NormalizedPaper[];
  deduped: NormalizedPaper[];
  selected: NormalizedPaper[];
  requestedSources: ResearchSource[];
  sourcesUsed: ResearchSource[];
  sourceDiagnostics: ResearchBrief["searchSummary"]["sourceDiagnostics"];
  warnings: string[];
  queryVariants: string[];
}): ResearchBrief["searchSummary"] {
  const selectedSources = new Set(input.selected.map((paper) => paper.source));
  const requestedLiveSources = input.requestedSources.filter(
    (source) => source !== "mock"
  );
  const selectedOnlyMock =
    input.selected.length > 0 &&
    input.selected.every((paper) => paper.source === "mock");
  const averageRelevance =
    input.selected.reduce(
      (sum, paper) =>
        sum + Math.max(paper.relevanceScore ?? 0, (paper.semanticScore ?? 0) * 0.8),
      0
    ) /
    Math.max(1, input.selected.length);
  const qualityWarnings = [
    selectedOnlyMock && requestedLiveSources.length
      ? "brief quality warning: selected papers are mock/demo records only, even though live sources were requested."
      : null,
    averageRelevance < 0.35
      ? "brief quality warning: selected papers have weak lexical relevance to the query."
      : null,
    input.selected.length < 3
      ? "brief quality warning: only limited source coverage was available for this query."
      : null,
    requestedLiveSources.some((source) => !selectedSources.has(source)) &&
    selectedOnlyMock
      ? "brief quality warning: live source results were unavailable or not relevant enough for final selection."
      : null
  ].filter((warning): warning is string => Boolean(warning));

  return {
    requestedSources: input.requestedSources,
    sourcesUsed: input.sourcesUsed,
    totalFound: input.raw.length,
    totalAfterDeduplication: input.deduped.length,
    totalUsedInBrief: input.selected.length,
    queryVariants: input.queryVariants,
    sourceDiagnostics: input.sourceDiagnostics,
    warnings: [...input.warnings, ...qualityWarnings]
  };
}

function emptySearchResult(message: string): SearchAllSourcesResult {
  return {
    papers: [],
    sourcesUsed: [],
    sourceDiagnostics: [],
    warnings: [message]
  };
}

export async function preflightBrief(
  rawInput: unknown,
  dependencies: PreflightBriefDependencies = {}
): Promise<ResearchPreflightResult> {
  const search = dependencies.search ?? searchAllSources;
  const request = BriefRequestSchema.parse(rawInput);
  const outputLanguage = detectQueryLanguage(request.query);
  const queryVariants = generateQueryVariants({
    query: request.query,
    outputLanguage
  });

  const searchResult = await search({
    query: request.query,
    queryVariants,
    maxResults: Math.max(request.maxPapers * 2, 10),
    fromYear: request.fromYear,
    toYear: request.toYear,
    sources: request.sources
  }).catch((error) =>
    emptySearchResult(
      error instanceof Error
        ? error.message
        : "All query variants failed or returned no papers."
    )
  );

  const rawPapers = searchResult.papers;
  const dedupedPapers = dedupePapers(rawPapers);
  const scoredPapers = await scorePapersForQueriesHybrid(
    dedupedPapers,
    queryVariants
  );
  const selectedPapers = selectTopPapers(scoredPapers, request.maxPapers);
  const qualityGate = evaluateResearchQuality({
    request,
    selected: selectedPapers,
    warnings: searchResult.warnings,
    queryVariants
  });
  const searchSummary = createSearchSummary({
    raw: rawPapers,
    deduped: dedupedPapers,
    selected: selectedPapers,
    requestedSources: request.sources,
    sourcesUsed: searchResult.sourcesUsed,
    sourceDiagnostics: searchResult.sourceDiagnostics,
    warnings: searchResult.warnings,
    queryVariants
  });

  return {
    request,
    outputLanguage,
    queryVariants,
    rawPapers,
    dedupedPapers,
    scoredPapers,
    selectedPapers,
    sourcesUsed: searchResult.sourcesUsed,
    sourceDiagnostics: searchResult.sourceDiagnostics,
    warnings: searchResult.warnings,
    searchSummary,
    qualityGate
  };
}

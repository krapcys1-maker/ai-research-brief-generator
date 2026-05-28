import { BriefRequestSchema, type ResearchBrief } from "@/lib/ai/schemas";
import { generateQueryVariants } from "@/lib/ai/generateQueryVariants";
import {
  synthesizeBrief,
  type SynthesizeBriefInput
} from "@/lib/ai/synthesizeBrief";
import { dedupePapers } from "@/lib/pipeline/dedupe";
import {
  evaluateResearchQuality,
  ResearchQualityGateError
} from "@/lib/pipeline/qualityGate";
import { scorePapersForQueries, selectTopPapers } from "@/lib/pipeline/score";
import { searchAllSources } from "@/lib/sources";
import type { ResearchSource } from "@/lib/sources/types";
import type { NormalizedPaper } from "@/lib/sources/types";
import { getBriefRepository } from "@/lib/storage/repository";
import { detectQueryLanguage } from "@/lib/utils/language";

export type CreateBriefDependencies = {
  synthesize?: (input: SynthesizeBriefInput) => Promise<ResearchBrief>;
  search?: typeof searchAllSources;
};

function createBriefId() {
  return `brief_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function createSearchSummary(input: {
  query: string;
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
    input.selected.reduce((sum, paper) => sum + (paper.relevanceScore ?? 0), 0) /
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

export async function createBrief(
  rawInput: unknown,
  dependencies: CreateBriefDependencies = {}
) {
  const search = dependencies.search ?? searchAllSources;
  const synthesize = dependencies.synthesize ?? synthesizeBrief;
  const input = BriefRequestSchema.parse(rawInput);
  const outputLanguage = detectQueryLanguage(input.query);
  const queryVariants = generateQueryVariants({
    query: input.query,
    outputLanguage
  });

  const searchResult = await search({
    query: input.query,
    queryVariants,
    maxResults: Math.max(input.maxPapers * 2, 10),
    fromYear: input.fromYear,
    toYear: input.toYear,
    sources: input.sources
  });
  const rawPapers = searchResult.papers;

  if (!rawPapers.length) {
    throw new Error("No papers were available for this request.");
  }

  const deduped = dedupePapers(rawPapers);
  const scored = scorePapersForQueries(deduped, queryVariants);
  const selected = selectTopPapers(scored, input.maxPapers);
  const qualityGate = evaluateResearchQuality({
    request: input,
    selected,
    warnings: searchResult.warnings,
    queryVariants
  });

  if (!qualityGate.canSynthesize) {
    throw new ResearchQualityGateError(qualityGate);
  }

  const id = createBriefId();
  const searchSummary = createSearchSummary({
    query: input.query,
    raw: rawPapers,
    deduped,
    selected,
    requestedSources: input.sources,
    sourcesUsed: searchResult.sourcesUsed,
    sourceDiagnostics: searchResult.sourceDiagnostics,
    warnings: searchResult.warnings,
    queryVariants
  });

  const brief = await synthesize({
    id,
    query: input.query,
    outputLanguage,
    queryVariants,
    papers: selected,
    searchSummary
  });

  const briefRepository = await getBriefRepository();

  return briefRepository.saveWithPapers({
    brief,
    papers: selected
  });
}

import { BriefRequestSchema, type ResearchBrief } from "@/lib/ai/schemas";
import { generateQueryVariants } from "@/lib/ai/generateQueryVariants";
import {
  synthesizeBrief,
  type SynthesizeBriefInput
} from "@/lib/ai/synthesizeBrief";
import { dedupePapers } from "@/lib/pipeline/dedupe";
import { scorePapers, selectTopPapers } from "@/lib/pipeline/score";
import { searchAllSources } from "@/lib/sources";
import type { ResearchSource } from "@/lib/sources/types";
import type { NormalizedPaper } from "@/lib/sources/types";
import { saveBriefWithPapers } from "@/lib/storage/inMemoryBriefStore";
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
  warnings: string[];
  queryVariants: string[];
}): ResearchBrief["searchSummary"] {
  return {
    requestedSources: input.requestedSources,
    sourcesUsed: input.sourcesUsed,
    totalFound: input.raw.length,
    totalAfterDeduplication: input.deduped.length,
    totalUsedInBrief: input.selected.length,
    queryVariants: input.queryVariants,
    warnings: input.warnings
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
  const scored = scorePapers(deduped, input.query);
  const selected = selectTopPapers(scored, input.maxPapers);

  if (!selected.length) {
    throw new Error("No papers remained after deduplication and scoring.");
  }

  const id = createBriefId();
  const searchSummary = createSearchSummary({
    query: input.query,
    raw: rawPapers,
    deduped,
    selected,
    requestedSources: input.sources,
    sourcesUsed: searchResult.sourcesUsed,
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

  return saveBriefWithPapers({
    brief,
    papers: selected
  });
}

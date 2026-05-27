import { BriefRequestSchema, type ResearchBrief } from "@/lib/ai/schemas";
import { synthesizeBrief } from "@/lib/ai/synthesizeBrief";
import { dedupePapers } from "@/lib/pipeline/dedupe";
import { scorePapers, selectTopPapers } from "@/lib/pipeline/score";
import { searchAllSources } from "@/lib/sources";
import type { ResearchSource } from "@/lib/sources/types";
import type { NormalizedPaper } from "@/lib/sources/types";
import { saveBriefWithPapers } from "@/lib/storage/inMemoryBriefStore";
import { detectQueryLanguage } from "@/lib/utils/language";

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
  sourcesUsed: ResearchSource[];
  warnings: string[];
}): ResearchBrief["searchSummary"] {
  return {
    sourcesUsed: input.sourcesUsed,
    totalFound: input.raw.length,
    totalAfterDeduplication: input.deduped.length,
    totalUsedInBrief: input.selected.length,
    queryVariants: [input.query],
    warnings: input.warnings
  };
}

export async function createBrief(rawInput: unknown) {
  const input = BriefRequestSchema.parse(rawInput);
  const outputLanguage = detectQueryLanguage(input.query);

  const searchResult = await searchAllSources({
    query: input.query,
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
    sourcesUsed: searchResult.sourcesUsed,
    warnings: searchResult.warnings
  });

  const brief = await synthesizeBrief({
    id,
    query: input.query,
    outputLanguage,
    queryVariants: [input.query],
    papers: selected,
    searchSummary
  });

  return saveBriefWithPapers({
    brief,
    papers: selected
  });
}

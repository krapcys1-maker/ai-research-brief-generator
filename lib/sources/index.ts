import { arxivSourceAdapter } from "@/lib/sources/arxiv";
import { mockSourceAdapter } from "@/lib/sources/mockPapers";
import { openAlexSourceAdapter } from "@/lib/sources/openAlex";
import { semanticScholarSourceAdapter } from "@/lib/sources/semanticScholar";
import {
  getCachedSourcePapers,
  setCachedSourcePapers
} from "@/lib/storage/sourceApiCache";
import type {
  NormalizedPaper,
  ResearchSource,
  SearchPapersInput,
  SourceAdapter
} from "@/lib/sources/types";

const adapters: Record<ResearchSource, SourceAdapter> = {
  mock: mockSourceAdapter,
  arxiv: arxivSourceAdapter,
  semantic_scholar: semanticScholarSourceAdapter,
  openalex: openAlexSourceAdapter
};

export type SearchAllSourcesResult = {
  papers: NormalizedPaper[];
  sourcesUsed: ResearchSource[];
  warnings: string[];
};

export async function searchAllSources(input: SearchPapersInput & {
  sources: ResearchSource[];
}): Promise<SearchAllSourcesResult> {
  const selectedAdapters = input.sources.map((source) => adapters[source]);
  const settled = await Promise.allSettled(
    selectedAdapters.map(async (adapter) => {
      const searchInput = {
        query: input.query,
        maxResults: input.maxResults,
        fromYear: input.fromYear,
        toYear: input.toYear
      };
      const cached = getCachedSourcePapers({
        source: adapter.name,
        ...searchInput
      });

      if (cached) {
        return cached;
      }

      const papers = await adapter.searchPapers(searchInput);
      setCachedSourcePapers(
        {
          source: adapter.name,
          ...searchInput
        },
        papers
      );

      return papers;
    })
  );

  const papers: NormalizedPaper[] = [];
  const sourcesUsed: ResearchSource[] = [];
  const warnings: string[] = [];

  settled.forEach((result, index) => {
    const adapter = selectedAdapters[index];
    if (!adapter) {
      return;
    }

    if (result.status === "fulfilled") {
      papers.push(...result.value);
      sourcesUsed.push(adapter.name);
      if (!result.value.length) {
        warnings.push(`${adapter.name} returned no papers.`);
      }
      return;
    }

    warnings.push(
      `${adapter.name} failed: ${
        result.reason instanceof Error ? result.reason.message : "unknown error"
      }`
    );
  });

  if (!papers.length) {
    throw new Error(
      warnings.length
        ? `All selected sources failed or returned no papers. ${warnings.join(" ")}`
        : "All selected sources failed or returned no papers."
    );
  }

  return {
    papers,
    sourcesUsed,
    warnings
  };
}

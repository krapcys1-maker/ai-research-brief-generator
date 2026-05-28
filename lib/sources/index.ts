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
  SourceAdapter,
  SourceSearchDiagnostic
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
  sourceDiagnostics: SourceSearchDiagnostic[];
};

async function searchSourcesForOneQuery(input: SearchPapersInput & {
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
        return {
          papers: cached,
          cached: true
        };
      }

      const papers = await adapter.searchPapers(searchInput);
      setCachedSourcePapers(
        {
          source: adapter.name,
          ...searchInput
        },
        papers
      );

      return {
        papers,
        cached: false
      };
    })
  );

  const papers: NormalizedPaper[] = [];
  const sourcesUsed: ResearchSource[] = [];
  const warnings: string[] = [];
  const sourceDiagnostics: SourceSearchDiagnostic[] = [];

  settled.forEach((result, index) => {
    const adapter = selectedAdapters[index];
    if (!adapter) {
      return;
    }

    if (result.status === "fulfilled") {
      papers.push(...result.value.papers);
      if (result.value.papers.length) {
        sourcesUsed.push(adapter.name);
      }
      sourceDiagnostics.push({
        source: adapter.name,
        query: input.query,
        status: result.value.papers.length ? "success" : "empty",
        resultCount: result.value.papers.length,
        cached: result.value.cached,
        message: result.value.papers.length ? undefined : "No papers returned."
      });
      if (!result.value.papers.length) {
        warnings.push(`${adapter.name} returned no papers.`);
      }
      return;
    }

    const message =
      result.reason instanceof Error ? result.reason.message : "unknown error";
    sourceDiagnostics.push({
      source: adapter.name,
      query: input.query,
      status: "failed",
      resultCount: 0,
      cached: false,
      message
    });
    warnings.push(`${adapter.name} failed: ${message}`);
  });

  return {
    papers,
    sourcesUsed,
    warnings,
    sourceDiagnostics
  };
}

export async function searchAllSources(input: SearchPapersInput & {
  sources: ResearchSource[];
  queryVariants?: string[];
}): Promise<SearchAllSourcesResult> {
  const queryVariants = input.queryVariants?.length
    ? input.queryVariants
    : [input.query];

  const settled = await Promise.allSettled(
    queryVariants.map((query) =>
      searchSourcesForOneQuery({
        query,
        maxResults: input.maxResults,
        fromYear: input.fromYear,
        toYear: input.toYear,
        sources: input.sources
      })
    )
  );

  const papers: NormalizedPaper[] = [];
  const sourcesUsed = new Set<ResearchSource>();
  const warnings: string[] = [];
  const sourceDiagnostics: SourceSearchDiagnostic[] = [];

  settled.forEach((result, index) => {
    const variant = queryVariants[index] ?? input.query;

    if (result.status === "fulfilled") {
      papers.push(...result.value.papers);
      result.value.sourcesUsed.forEach((source) => sourcesUsed.add(source));
      warnings.push(...result.value.warnings);
      sourceDiagnostics.push(...result.value.sourceDiagnostics);
      return;
    }

    sourceDiagnostics.push(
      ...input.sources.map((source) => ({
        source,
        query: variant,
        status: "failed" as const,
        resultCount: 0,
        cached: false,
        message:
          result.reason instanceof Error ? result.reason.message : "unknown error"
      }))
    );
    warnings.push(
      `query variant "${variant}" failed: ${
        result.reason instanceof Error ? result.reason.message : "unknown error"
      }`
    );
  });

  if (!papers.length) {
    throw new Error(
      warnings.length
        ? `All query variants failed or returned no papers. ${warnings.join(" ")}`
        : "All query variants failed or returned no papers."
    );
  }

  return {
    papers,
    sourcesUsed: [...sourcesUsed],
    warnings,
    sourceDiagnostics
  };
}

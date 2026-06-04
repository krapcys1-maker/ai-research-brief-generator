import { arxivSourceAdapter } from "@/lib/sources/arxiv";
import { mockSourceAdapter } from "@/lib/sources/mockPapers";
import { openAlexSourceAdapter } from "@/lib/sources/openAlex";
import { semanticScholarSourceAdapter } from "@/lib/sources/semanticScholar";
import {
  getCachedSourcePapers,
  setCachedSourcePapers
} from "@/lib/storage/sourceApiCache";
import { recordSourceDiagnostics } from "@/lib/storage/sourceDiagnosticsStore";
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

const sourceSearchLimits: Record<
  ResearchSource,
  { concurrency: number; minDelayMs: number }
> = {
  mock: { concurrency: 8, minDelayMs: 0 },
  arxiv: { concurrency: 1, minDelayMs: 3000 },
  semantic_scholar: { concurrency: 1, minDelayMs: 1100 },
  openalex: { concurrency: 4, minDelayMs: 0 }
};

export type SearchAllSourcesResult = {
  papers: NormalizedPaper[];
  sourcesUsed: ResearchSource[];
  warnings: string[];
  sourceDiagnostics: SourceSearchDiagnostic[];
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uniqueWarnings(warnings: string[]) {
  return Array.from(new Set(warnings));
}

function sourceDelayMs(source: ResearchSource) {
  if (process.env.NODE_ENV === "test") {
    return 0;
  }

  return sourceSearchLimits[source].minDelayMs;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
) {
  const results: R[] = [];
  let cursor = 0;

  async function runNext() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index] as T, index);
    }
  }

  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), items.length) },
    () => runNext()
  );
  await Promise.all(workers);

  return results;
}

export function filterWarningsForSuccessfulSources(
  warnings: string[],
  sourceDiagnostics: SourceSearchDiagnostic[]
) {
  const successfulSources = new Set(
    sourceDiagnostics
      .filter((diagnostic) => diagnostic.status === "success")
      .map((diagnostic) => diagnostic.source)
  );

  return uniqueWarnings(warnings).filter(
    (warning) =>
      ![...successfulSources].some(
        (source) =>
          warning === `${source} returned no papers.` ||
          warning.startsWith(`${source} failed:`)
      )
  );
}

async function searchOneSourceForOneQuery(
  adapter: SourceAdapter,
  input: SearchPapersInput
): Promise<SearchAllSourcesResult> {
  const searchInput = {
    query: input.query,
    maxResults: input.maxResults,
    fromYear: input.fromYear,
    toYear: input.toYear
  };

  try {
    const cached = await getCachedSourcePapers({
      source: adapter.name,
      ...searchInput
    });

    if (cached) {
      return {
        papers: cached,
        sourcesUsed: [adapter.name],
        warnings: [],
        sourceDiagnostics: [
          {
            source: adapter.name,
            query: input.query,
            status: "success",
            resultCount: cached.length,
            cached: true
          }
        ]
      };
    }

    const papers = await adapter.searchPapers(searchInput);
    await setCachedSourcePapers(
      {
        source: adapter.name,
        ...searchInput
      },
      papers
    );

    return {
      papers,
      sourcesUsed: papers.length ? [adapter.name] : [],
      warnings: papers.length ? [] : [`${adapter.name} returned no papers.`],
      sourceDiagnostics: [
        {
          source: adapter.name,
          query: input.query,
          status: papers.length ? "success" : "empty",
          resultCount: papers.length,
          cached: false,
          message: papers.length ? undefined : "No papers returned."
        }
      ]
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";

    return {
      papers: [],
      sourcesUsed: [],
      warnings: [`${adapter.name} failed: ${message}`],
      sourceDiagnostics: [
        {
          source: adapter.name,
          query: input.query,
          status: "failed",
          resultCount: 0,
          cached: false,
          message
        }
      ]
    };
  }
}

async function searchOneSourceAcrossQueries(input: SearchPapersInput & {
  source: ResearchSource;
  queryVariants: string[];
}): Promise<SearchAllSourcesResult> {
  const adapter = adapters[input.source];
  const limits = sourceSearchLimits[input.source];
  const delayMs = sourceDelayMs(input.source);
  let previousRequestStartedAt = 0;

  const results = await mapWithConcurrency(
    input.queryVariants,
    limits.concurrency,
    async (query) => {
      if (delayMs > 0 && previousRequestStartedAt > 0) {
        const elapsed = Date.now() - previousRequestStartedAt;
        if (elapsed < delayMs) {
          await sleep(delayMs - elapsed);
        }
      }
      previousRequestStartedAt = Date.now();

      return searchOneSourceForOneQuery(adapter, {
        query,
        maxResults: input.maxResults,
        fromYear: input.fromYear,
        toYear: input.toYear
      });
    }
  );

  return {
    papers: results.flatMap((result) => result.papers),
    sourcesUsed: Array.from(
      new Set(results.flatMap((result) => result.sourcesUsed))
    ),
    warnings: uniqueWarnings(results.flatMap((result) => result.warnings)),
    sourceDiagnostics: results.flatMap((result) => result.sourceDiagnostics)
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
    input.sources.map((source) =>
      searchOneSourceAcrossQueries({
        source,
        query: input.query,
        queryVariants,
        maxResults: input.maxResults,
        fromYear: input.fromYear,
        toYear: input.toYear
      })
    )
  );

  const papers: NormalizedPaper[] = [];
  const sourcesUsed = new Set<ResearchSource>();
  const warnings: string[] = [];
  const sourceDiagnostics: SourceSearchDiagnostic[] = [];

  settled.forEach((result, index) => {
    const source = input.sources[index];
    if (!source) {
      return;
    }

    if (result.status === "fulfilled") {
      papers.push(...result.value.papers);
      result.value.sourcesUsed.forEach((source) => sourcesUsed.add(source));
      warnings.push(...result.value.warnings);
      sourceDiagnostics.push(...result.value.sourceDiagnostics);
      return;
    }

    sourceDiagnostics.push(
      ...queryVariants.map((variant) => ({
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
      `${source} query queue failed: ${
        result.reason instanceof Error ? result.reason.message : "unknown error"
      }`
    );
  });

  await recordSourceDiagnostics(sourceDiagnostics);

  if (!papers.length) {
    throw new Error(
      warnings.length
        ? `All query variants failed or returned no papers. ${warnings.join(" ")}`
        : "All query variants failed or returned no papers."
    );
  }

  const filteredWarnings = filterWarningsForSuccessfulSources(
    warnings,
    sourceDiagnostics
  );

  return {
    papers,
    sourcesUsed: [...sourcesUsed],
    warnings: uniqueWarnings(filteredWarnings),
    sourceDiagnostics
  };
}

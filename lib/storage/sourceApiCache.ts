import type { NormalizedPaper, ResearchSource } from "@/lib/sources/types";

export type SourceCacheKeyInput = {
  source: ResearchSource;
  query: string;
  maxResults: number;
  fromYear?: number;
  toYear?: number;
};

type SourceCacheRecord = {
  papers: NormalizedPaper[];
  expiresAt: number;
  createdAt: number;
};

const globalForSourceCache = globalThis as typeof globalThis & {
  __sourceApiCache?: Map<string, SourceCacheRecord>;
};

const cache =
  globalForSourceCache.__sourceApiCache ??
  new Map<string, SourceCacheRecord>();

globalForSourceCache.__sourceApiCache = cache;

export function createSourceCacheKey(input: SourceCacheKeyInput) {
  return JSON.stringify({
    source: input.source,
    query: input.query.trim().toLowerCase(),
    maxResults: input.maxResults,
    fromYear: input.fromYear ?? null,
    toYear: input.toYear ?? null
  });
}

export function getCachedSourcePapers(input: SourceCacheKeyInput) {
  const key = createSourceCacheKey(input);
  const record = cache.get(key);

  if (!record) {
    return null;
  }

  if (record.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return record.papers;
}

export function setCachedSourcePapers(
  input: SourceCacheKeyInput,
  papers: NormalizedPaper[],
  ttlMs = 1000 * 60 * 30
) {
  cache.set(createSourceCacheKey(input), {
    papers,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlMs
  });
}

export function getSourceCacheStats() {
  const now = Date.now();
  let active = 0;
  let expired = 0;

  for (const record of cache.values()) {
    if (record.expiresAt > now) {
      active += 1;
    } else {
      expired += 1;
    }
  }

  return {
    active,
    expired,
    total: cache.size
  };
}

export function clearExpiredSourceCache() {
  const now = Date.now();
  for (const [key, record] of cache.entries()) {
    if (record.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

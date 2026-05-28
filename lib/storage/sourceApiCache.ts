import type { NormalizedPaper, ResearchSource } from "@/lib/sources/types";
import { NormalizedPaperSchema } from "@/lib/ai/schemas";
import { getPersistenceStatus } from "@/lib/storage/repository";
import { z } from "zod";

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

const CachedPapersSchema = z.array(NormalizedPaperSchema);

function getMemoryCacheStats() {
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

async function getPersistentCacheStats() {
  if (!getPersistenceStatus().hasValidPostgresUrl) {
    return {
      active: 0,
      expired: 0,
      total: 0
    };
  }

  const { prisma } = await import("@/lib/storage/prismaClient");
  const now = new Date();
  const [active, expired, total] = await Promise.all([
    prisma.apiCache.count({
      where: {
        expiresAt: {
          gt: now
        }
      }
    }),
    prisma.apiCache.count({
      where: {
        expiresAt: {
          lte: now
        }
      }
    }),
    prisma.apiCache.count()
  ]);

  return {
    active,
    expired,
    total
  };
}

export async function getCachedSourcePapers(input: SourceCacheKeyInput) {
  const key = createSourceCacheKey(input);
  const record = cache.get(key);

  if (record) {
    if (record.expiresAt <= Date.now()) {
      cache.delete(key);
    } else {
      return record.papers;
    }
  }

  if (!getPersistenceStatus().hasValidPostgresUrl) {
    return null;
  }

  const { prisma } = await import("@/lib/storage/prismaClient");
  const persistentRecord = await prisma.apiCache.findUnique({
    where: {
      cacheKey: key
    }
  });

  if (!persistentRecord) {
    return null;
  }

  if (persistentRecord.expiresAt.getTime() <= Date.now()) {
    await prisma.apiCache.delete({
      where: {
        cacheKey: key
      }
    });
    return null;
  }

  const parsed = CachedPapersSchema.safeParse(persistentRecord.response);
  if (!parsed.success) {
    await prisma.apiCache.delete({
      where: {
        cacheKey: key
      }
    });
    return null;
  }

  cache.set(key, {
    papers: parsed.data,
    createdAt: persistentRecord.createdAt.getTime(),
    expiresAt: persistentRecord.expiresAt.getTime()
  });

  return parsed.data;
}

export async function setCachedSourcePapers(
  input: SourceCacheKeyInput,
  papers: NormalizedPaper[],
  ttlMs = 1000 * 60 * 30
) {
  const key = createSourceCacheKey(input);
  const now = Date.now();
  const expiresAt = now + ttlMs;

  cache.set(key, {
    papers,
    createdAt: now,
    expiresAt
  });

  if (!getPersistenceStatus().hasValidPostgresUrl) {
    return;
  }

  const { prisma } = await import("@/lib/storage/prismaClient");
  await prisma.apiCache.upsert({
    where: {
      cacheKey: key
    },
    create: {
      cacheKey: key,
      source: input.source,
      query: input.query,
      response: papers,
      expiresAt: new Date(expiresAt)
    },
    update: {
      source: input.source,
      query: input.query,
      response: papers,
      expiresAt: new Date(expiresAt)
    }
  });
}

export async function getSourceCacheStats() {
  const persistence = getPersistenceStatus();
  const memory = getMemoryCacheStats();
  const persistent = await getPersistentCacheStats();
  const primary = persistence.hasValidPostgresUrl ? persistent : memory;

  return {
    active: primary.active,
    expired: primary.expired,
    total: primary.total,
    memory,
    persistent
  };
}

export async function clearExpiredSourceCache() {
  const now = Date.now();
  for (const [key, record] of cache.entries()) {
    if (record.expiresAt <= now) {
      cache.delete(key);
    }
  }

  if (!getPersistenceStatus().hasValidPostgresUrl) {
    return;
  }

  const { prisma } = await import("@/lib/storage/prismaClient");
  await prisma.apiCache.deleteMany({
    where: {
      expiresAt: {
        lte: new Date()
      }
    }
  });
}

export function clearSourceApiMemoryCacheForTests() {
  cache.clear();
}

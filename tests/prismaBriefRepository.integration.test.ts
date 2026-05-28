import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createBrief, createPaper } from "@/tests/fixtures";
import { prisma } from "@/lib/storage/prismaClient";
import { prismaBriefRepository } from "@/lib/storage/prismaBriefRepository";
import {
  clearSourceApiMemoryCacheForTests,
  getCachedSourcePapers,
  getSourceCacheStats,
  setCachedSourcePapers
} from "@/lib/storage/sourceApiCache";

const hasPostgresDatabaseUrl =
  process.env.DATABASE_URL?.startsWith("postgresql://") ||
  process.env.DATABASE_URL?.startsWith("postgres://") ||
  false;

const describeWithPostgres = hasPostgresDatabaseUrl ? describe : describe.skip;

describeWithPostgres("prismaBriefRepository", () => {
  beforeEach(async () => {
    await prismaBriefRepository.clear();
    await prisma.apiCache.deleteMany();
    clearSourceApiMemoryCacheForTests();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("persists brief records and paper scores in PostgreSQL", async () => {
    const brief = createBrief({
      id: "brief_prisma_integration",
      title: "PostgreSQL Persistence Brief"
    });
    const paper = createPaper({
      id: "paper_prisma_integration",
      finalScore: 0.91,
      relevanceScore: 0.88
    });

    const saved = await prismaBriefRepository.saveWithPapers({
      brief,
      papers: [paper]
    });

    const reloaded = await prismaBriefRepository.getById(brief.id);
    const summaries = await prismaBriefRepository.listSummaries();

    expect(saved.brief.id).toBe(brief.id);
    expect(reloaded?.brief.title).toBe("PostgreSQL Persistence Brief");
    expect(reloaded?.papers[0]?.id).toBe("paper_prisma_integration");
    expect(reloaded?.papers[0]?.finalScore).toBe(0.91);
    expect(summaries).toEqual([
      {
        id: brief.id,
        title: brief.title,
        query: brief.query,
        generatedAt: brief.generatedAt,
        outputLanguage: brief.outputLanguage,
        createdAt: saved.createdAt
      }
    ]);
  });

  it("persists source API cache records across memory cache resets", async () => {
    const cacheInput = {
      source: "arxiv" as const,
      query: "retrieval augmented generation persistence test",
      maxResults: 3
    };
    const paper = createPaper({
      id: "paper_source_cache_integration",
      source: "arxiv",
      arxivId: "2601.00001"
    });

    expect(await getCachedSourcePapers(cacheInput)).toBeNull();

    await setCachedSourcePapers(cacheInput, [paper], 1000 * 60);
    clearSourceApiMemoryCacheForTests();

    const cached = await getCachedSourcePapers(cacheInput);
    const stats = await getSourceCacheStats();

    expect(cached).toEqual([paper]);
    expect(stats.persistent.active).toBe(1);
    expect(stats.active).toBe(1);
  });
});

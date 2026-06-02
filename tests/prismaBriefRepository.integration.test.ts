import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createBrief, createPaper } from "@/tests/fixtures";
import { prisma } from "@/lib/storage/prismaClient";
import { prismaBriefRepository } from "@/lib/storage/prismaBriefRepository";
import { prismaBriefJobRepository } from "@/lib/jobs/prismaBriefJobRepository";
import {
  clearSourceApiMemoryCacheForTests,
  getCachedSourcePapers,
  getSourceCacheStats,
  setCachedSourcePapers
} from "@/lib/storage/sourceApiCache";
import {
  clearSourceDiagnostics,
  clearSourceDiagnosticsMemoryForTests,
  getRecentSourceDiagnostics,
  getSourceHealthSummary,
  recordSourceDiagnostics
} from "@/lib/storage/sourceDiagnosticsStore";

const hasPostgresDatabaseUrl =
  process.env.DATABASE_URL?.startsWith("postgresql://") ||
  process.env.DATABASE_URL?.startsWith("postgres://") ||
  false;

const describeWithPostgres = hasPostgresDatabaseUrl ? describe : describe.skip;

describeWithPostgres("prismaBriefRepository", () => {
  beforeEach(async () => {
    await prismaBriefRepository.clear();
    await prismaBriefJobRepository.clear();
    await prisma.apiCache.deleteMany();
    await clearSourceDiagnostics();
    clearSourceApiMemoryCacheForTests();
    clearSourceDiagnosticsMemoryForTests();
  });

  it("persists brief generation job status in PostgreSQL", async () => {
    const queued = await prismaBriefJobRepository.create({
      id: "job_prisma_integration",
      status: "queued",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      attemptCount: 0,
      maxAttempts: 2,
      request: {
        query: "retrieval augmented generation",
        maxPapers: 5,
        sources: ["mock"]
      }
    });

    await prismaBriefJobRepository.update(queued.id, {
      status: "completed",
      briefId: "brief_prisma_job_done"
    });

    const reloaded = await prismaBriefJobRepository.getById(queued.id);

    expect(reloaded?.status).toBe("completed");
    expect(reloaded?.briefId).toBe("brief_prisma_job_done");
    expect(reloaded?.request.query).toBe("retrieval augmented generation");
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
      papers: [paper],
      ownerSessionId: "brief_session_prisma"
    });

    const reloaded = await prismaBriefRepository.getById(brief.id);
    const summaries = await prismaBriefRepository.listSummaries();
    const sessionSummaries = await prismaBriefRepository.listSummaries({
      ownerSessionId: "brief_session_prisma"
    });
    const otherSessionSummaries = await prismaBriefRepository.listSummaries({
      ownerSessionId: "brief_session_other"
    });

    expect(saved.brief.id).toBe(brief.id);
    expect(saved.ownerSessionId).toBe("brief_session_prisma");
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
    expect(sessionSummaries.map((item) => item.id)).toEqual([brief.id]);
    expect(otherSessionSummaries).toEqual([]);
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

  it("persists source diagnostics across memory resets", async () => {
    await recordSourceDiagnostics([
      {
        source: "openalex",
        query: "retrieval augmented generation diagnostics test",
        status: "success",
        resultCount: 2,
        cached: true
      }
    ]);
    clearSourceDiagnosticsMemoryForTests();

    const recent = await getRecentSourceDiagnostics(5);
    const summary = await getSourceHealthSummary();

    expect(recent).toHaveLength(1);
    expect(recent[0]?.source).toBe("openalex");
    expect(recent[0]?.cached).toBe(true);
    expect(summary).toEqual({
      totalDiagnostics: 1,
      bySource: [
        {
          source: "openalex",
          success: 1,
          empty: 0,
          failed: 0,
          cached: 1,
          lastStatus: "success",
          lastMessage: null
        }
      ]
    });
  });
});

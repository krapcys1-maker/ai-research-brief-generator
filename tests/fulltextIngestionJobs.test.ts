import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createFullTextIngestionJob,
  getFullTextIngestionJob,
  resetFullTextIngestionJobsForTests,
  resetStaleFullTextIngestionJobs,
  runNextFullTextIngestionJob
} from "@/lib/fulltext/ingestionJobs";
import { getFullTextIngestionJobRepository } from "@/lib/fulltext/ingestionJobRepository";
import type { NormalizedPaper } from "@/lib/sources/types";
import type { PaperFullText, PaperTextChunk } from "@/lib/fulltext/types";

function paper(id = "arxiv:2401.00001"): NormalizedPaper {
  return {
    id,
    title: "Background full-text ingestion",
    abstract: "A paper with an open PDF.",
    authors: ["Ada Researcher"],
    year: 2024,
    publishedAt: "2024-01-01",
    doi: null,
    arxivId: id.replace("arxiv:", ""),
    semanticScholarId: null,
    openAlexId: null,
    sourceUrls: [`https://arxiv.org/abs/${id.replace("arxiv:", "")}`],
    pdfUrl: `https://arxiv.org/pdf/${id.replace("arxiv:", "")}`,
    venue: "arXiv",
    citationCount: 12,
    influentialCitationCount: 2,
    source: "arxiv"
  };
}

function fullText(paperId: string, status: PaperFullText["status"]): PaperFullText {
  return {
    id: `fulltext_${paperId}`,
    paperId,
    status,
    sourceType: status === "unavailable" ? "none" : "arxiv",
    sourceUrl: status === "unavailable" ? null : "https://arxiv.org/pdf/2401.00001",
    parserName: status === "parsed" ? "test-parser" : null,
    textHash: status === "parsed" ? "hash" : null,
    extractedAt: status === "parsed" ? "2026-01-01T00:00:00.000Z" : null,
    errorMessage: status === "failed" ? "PDF parse failed" : null,
    qualityScore: status === "parsed" ? 0.95 : null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

function chunk(paperId: string): PaperTextChunk {
  return {
    id: `chunk_${paperId}`,
    paperId,
    fullTextId: `fulltext_${paperId}`,
    sectionTitle: null,
    chunkIndex: 0,
    text: "Parsed full-text chunk.",
    tokenEstimate: 4,
    pageStart: 1,
    pageEnd: 1,
    evidenceLevel: "full_text_supported"
  };
}

describe("full-text ingestion jobs", () => {
  afterEach(async () => {
    vi.useRealTimers();
    await resetFullTextIngestionJobsForTests();
    delete process.env.FULL_TEXT_INGESTION_JOB_AUTORUN;
    delete process.env.FULL_TEXT_INGESTION_JOB_MAX_ATTEMPTS;
    delete process.env.FULL_TEXT_INGESTION_JOB_TIMEOUT_MS;
  });

  it("queues ownership-aware jobs and processes them through the worker path", async () => {
    process.env.FULL_TEXT_INGESTION_JOB_AUTORUN = "false";
    const papers = [paper("arxiv:2401.00001"), paper("arxiv:2401.00002")];

    const job = await createFullTextIngestionJob(papers, {
      ownerSessionId: "session_a",
      ownerId: "user_a",
      workspaceId: "workspace_a",
      createdByUserId: "user_a",
      visibility: "workspace",
      ingestion: {
        limit: 2,
        timeoutMs: 1234,
        pageRange: { start: 1, end: 2 }
      }
    });

    expect(job).toMatchObject({
      status: "queued",
      stage: "queued",
      ownerSessionId: "session_a",
      ownerId: "user_a",
      workspaceId: "workspace_a",
      createdByUserId: "user_a",
      visibility: "workspace"
    });

    const finalJob = await runNextFullTextIngestionJob({
      ingestFullText: async (inputPapers, options) => {
        expect(inputPapers.map((item) => item.id)).toEqual([
          "arxiv:2401.00001",
          "arxiv:2401.00002"
        ]);
        expect(options).toMatchObject({
          limit: 2,
          timeoutMs: 1234,
          pageRange: { start: 1, end: 2 }
        });

        return {
          papers: inputPapers.map((item) => ({
            ...item,
            fullTextStatus: "parsed"
          })),
          results: [
            {
              paper: inputPapers[0],
              fullText: fullText(inputPapers[0].id, "parsed"),
              chunks: [chunk(inputPapers[0].id)]
            },
            {
              paper: inputPapers[1],
              fullText: fullText(inputPapers[1].id, "unavailable"),
              chunks: []
            }
          ]
        };
      }
    });

    expect(finalJob?.status).toBe("completed");
    expect(finalJob?.stage).toBe("completed");
    expect(finalJob?.attemptCount).toBe(1);
    expect(finalJob?.lockedAt).toBeUndefined();
    expect(finalJob?.result).toMatchObject({
      paperCount: 2,
      processedCount: 2,
      parsedCount: 1,
      failedCount: 0,
      unavailableCount: 1,
      chunkCount: 1
    });
  });

  it("stores failed ingestion job errors without losing retry metadata", async () => {
    process.env.FULL_TEXT_INGESTION_JOB_AUTORUN = "false";
    await createFullTextIngestionJob([paper()]);

    const finalJob = await runNextFullTextIngestionJob({
      ingestFullText: async () => {
        throw new Error("PDF provider unavailable");
      }
    });

    expect(finalJob?.status).toBe("failed");
    expect(finalJob?.stage).toBe("failed");
    expect(finalJob?.attemptCount).toBe(1);
    expect(finalJob?.error).toContain("PDF provider unavailable");
  });

  it("resets stale running ingestion jobs before attempts are exhausted", async () => {
    const repository = await getFullTextIngestionJobRepository();
    const timestamp = "2026-01-01T00:00:00.000Z";

    await repository.create({
      id: "fulltext_job_stale_retry",
      status: "running",
      stage: "ingestion",
      stageStartedAt: timestamp,
      papers: [paper()],
      options: {},
      createdAt: timestamp,
      updatedAt: timestamp,
      attemptCount: 1,
      maxAttempts: 2,
      lockedAt: timestamp,
      ownerSessionId: null,
      ownerId: null,
      workspaceId: null,
      createdByUserId: null,
      visibility: "private"
    });

    const resetCount = await resetStaleFullTextIngestionJobs(1);
    const job = await getFullTextIngestionJob("fulltext_job_stale_retry");

    expect(resetCount).toBe(1);
    expect(job?.status).toBe("queued");
    expect(job?.lockedAt).toBeUndefined();
    expect(job?.error).toContain("stale worker lease");
  });

  it("fails stale ingestion jobs after the configured attempt limit", async () => {
    const repository = await getFullTextIngestionJobRepository();
    const timestamp = "2026-01-01T00:00:00.000Z";

    await repository.create({
      id: "fulltext_job_stale_exhausted",
      status: "running",
      stage: "ingestion",
      stageStartedAt: timestamp,
      papers: [paper()],
      options: {},
      createdAt: timestamp,
      updatedAt: timestamp,
      attemptCount: 2,
      maxAttempts: 2,
      lockedAt: timestamp,
      ownerSessionId: null,
      ownerId: null,
      workspaceId: null,
      createdByUserId: null,
      visibility: "private"
    });

    const resetCount = await resetStaleFullTextIngestionJobs(1);
    const job = await getFullTextIngestionJob("fulltext_job_stale_exhausted");

    expect(resetCount).toBe(1);
    expect(job?.status).toBe("failed");
    expect(job?.lockedAt).toBeUndefined();
    expect(job?.error).toContain("exceeded 2 attempt");
  });
});

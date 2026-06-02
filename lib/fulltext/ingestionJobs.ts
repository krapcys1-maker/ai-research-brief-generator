import { ingestFullTextForPapers } from "@/lib/fulltext/ingest";
import {
  getFullTextIngestionJobRepository,
  resetFullTextIngestionJobRepositoryForTests
} from "@/lib/fulltext/ingestionJobRepository";
import type {
  FullTextIngestionJob,
  SerializableFullTextIngestionOptions
} from "@/lib/fulltext/ingestionJobTypes";
import { getPersistenceStatus } from "@/lib/storage/repository";
import type { BriefOwnership } from "@/lib/storage/types";
import type { NormalizedPaper } from "@/lib/sources/types";

export type CreateFullTextIngestionJobOptions = BriefOwnership & {
  ingestion?: SerializableFullTextIngestionOptions;
};

export type RunFullTextIngestionJobDependencies = {
  ingestFullText?: typeof ingestFullTextForPapers;
};

function createJobId() {
  return `fulltext_job_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

function numberEnv(name: string, fallback: number) {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return null;
}

function shouldAutoRunFullTextIngestionJobs() {
  const explicit = parseBoolean(process.env.FULL_TEXT_INGESTION_JOB_AUTORUN);

  if (explicit !== null) {
    return explicit;
  }

  const persistence = getPersistenceStatus();
  return persistence.mode === "memory" || !persistence.isProduction;
}

function getMaxAttempts() {
  return numberEnv("FULL_TEXT_INGESTION_JOB_MAX_ATTEMPTS", 2);
}

function withJobTimeout<T>(promise: Promise<T>) {
  const timeoutMs = numberEnv("FULL_TEXT_INGESTION_JOB_TIMEOUT_MS", 10 * 60 * 1000);
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timeout = setTimeout(() => {
      reject(
        new Error(`Full-text ingestion job timed out after ${timeoutMs} ms.`)
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });
}

async function updateJob(id: string, patch: Partial<FullTextIngestionJob>) {
  const repository = await getFullTextIngestionJobRepository();
  return repository.update(id, patch);
}

function summarizeIngestionResult(
  paperCount: number,
  result: Awaited<ReturnType<typeof ingestFullTextForPapers>>
) {
  return {
    paperCount,
    processedCount: result.results.length,
    parsedCount: result.results.filter(
      (item) => item.fullText.status === "parsed"
    ).length,
    failedCount: result.results.filter(
      (item) => item.fullText.status === "failed"
    ).length,
    unavailableCount: result.results.filter(
      (item) => item.fullText.status === "unavailable"
    ).length,
    chunkCount: result.results.reduce((sum, item) => sum + item.chunks.length, 0),
    completedAt: now()
  };
}

async function runClaimedFullTextIngestionJob(
  job: FullTextIngestionJob,
  dependencies: RunFullTextIngestionJobDependencies = {}
) {
  try {
    const ingest = dependencies.ingestFullText ?? ingestFullTextForPapers;
    const result = await withJobTimeout(ingest(job.papers, job.options));

    await updateJob(job.id, {
      status: "completed",
      stage: "completed",
      stageStartedAt: now(),
      lockedAt: undefined,
      result: summarizeIngestionResult(job.papers.length, result)
    });
  } catch (error) {
    await updateJob(job.id, {
      status: "failed",
      stage: "failed",
      stageStartedAt: now(),
      lockedAt: undefined,
      error:
        error instanceof Error
          ? error.message
          : "Could not ingest selected paper full text."
    });
  }
}

export async function createFullTextIngestionJob(
  papers: NormalizedPaper[],
  options: CreateFullTextIngestionJobOptions = {}
) {
  const id = createJobId();
  const timestamp = now();
  const job: FullTextIngestionJob = {
    id,
    status: "queued",
    stage: "queued",
    stageStartedAt: timestamp,
    papers,
    options: options.ingestion ?? {},
    result: undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
    attemptCount: 0,
    maxAttempts: getMaxAttempts(),
    ownerSessionId: options.ownerSessionId ?? null,
    ownerId: options.ownerId ?? null,
    workspaceId: options.workspaceId ?? null,
    createdByUserId: options.createdByUserId ?? null,
    visibility: options.visibility ?? "private"
  };

  const repository = await getFullTextIngestionJobRepository();
  const saved = await repository.create(job);

  if (shouldAutoRunFullTextIngestionJobs()) {
    void runFullTextIngestionJob(id);
  }

  return saved;
}

export async function runFullTextIngestionJob(
  id: string,
  dependencies: RunFullTextIngestionJobDependencies = {}
) {
  const repository = await getFullTextIngestionJobRepository();
  const job = await repository.getById(id);

  if (!job) {
    return;
  }

  const runningJob =
    job.status === "running"
      ? job
      : await updateJob(id, {
          status: "running",
          stage: "ingestion",
          stageStartedAt: now(),
          attemptCount: job.attemptCount + 1,
          lockedAt: now(),
          error: undefined,
          result: undefined
        });

  if (runningJob) {
    await runClaimedFullTextIngestionJob(runningJob, dependencies);
  }
}

export async function runNextFullTextIngestionJob(
  dependencies: RunFullTextIngestionJobDependencies = {}
) {
  const repository = await getFullTextIngestionJobRepository();
  const job = await repository.claimNextQueued();

  if (!job) {
    return null;
  }

  await runClaimedFullTextIngestionJob(job, dependencies);
  return repository.getById(job.id);
}

export async function getFullTextIngestionJob(id: string) {
  const repository = await getFullTextIngestionJobRepository();
  return repository.getById(id);
}

export async function resetStaleFullTextIngestionJobs(staleMs: number) {
  const repository = await getFullTextIngestionJobRepository();
  return repository.resetStaleRunning(staleMs);
}

export async function resetFullTextIngestionJobsForTests() {
  resetFullTextIngestionJobRepositoryForTests();
  const repository = await getFullTextIngestionJobRepository();
  await repository.clear();
}

import { ZodError } from "zod";
import { AIConfigurationError, AIProviderError } from "@/lib/ai/client";
import { createBrief } from "@/lib/pipeline/createBrief";
import { ResearchQualityGateError } from "@/lib/pipeline/qualityGate";
import type { BriefRequest } from "@/lib/ai/schemas";
import {
  getBriefJobRepository,
  resetBriefJobRepositoryForTests
} from "@/lib/jobs/repository";
import type { BriefJob, BriefJobStage } from "@/lib/jobs/types";
import { getPersistenceStatus } from "@/lib/storage/repository";
import type { BriefOwnership } from "@/lib/storage/types";

export type CreateBriefJobOptions = BriefOwnership;

function numberEnv(name: string, fallback: number) {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function withJobTimeout<T>(promise: Promise<T>) {
  const timeoutMs = numberEnv("BRIEF_JOB_TIMEOUT_MS", 240000);
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`Brief generation job timed out after ${timeoutMs} ms.`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });
}

function createJobId() {
  return `job_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

async function updateJob(id: string, patch: Partial<BriefJob>) {
  const repository = await getBriefJobRepository();
  return repository.update(id, patch);
}

async function updateJobStage(id: string, stage: BriefJobStage) {
  await updateJob(id, {
    stage,
    stageStartedAt: now()
  });
}

function getMaxAttempts() {
  return numberEnv("BRIEF_JOB_MAX_ATTEMPTS", 2);
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

function shouldAutoRunBriefJobs() {
  const explicit = parseBoolean(process.env.BRIEF_JOB_AUTORUN);

  if (explicit !== null) {
    return explicit;
  }

  const persistence = getPersistenceStatus();
  return persistence.mode === "memory" || !persistence.isProduction;
}

function getJobFailure(error: unknown): Pick<
  BriefJob,
  "status" | "error" | "qualityGate"
> {
  if (error instanceof ResearchQualityGateError) {
    return {
      status: "quality_gate_failed",
      error: error.message,
      qualityGate: error.qualityGate
    };
  }

  if (error instanceof AIConfigurationError) {
    return {
      status: "configuration_error",
      error: error.message
    };
  }

  if (error instanceof AIProviderError) {
    return {
      status: "failed",
      error: error.message
    };
  }

  if (error instanceof ZodError) {
    return {
      status: "failed",
      error: error.issues.map((issue) => issue.message).join("; ")
    };
  }

  const message =
    error instanceof Error ? error.message : "Could not generate the research brief.";

  if (message.includes("DEEPSEEK_API_KEY") || message.includes("AI_PROVIDER")) {
    return {
      status: "configuration_error",
      error: message
    };
  }

  return {
    status: "failed",
    error: message
  };
}

async function runClaimedBriefJob(job: BriefJob) {
  try {
    const record = await withJobTimeout(
      createBrief(job.request, {}, {
        ownerSessionId: job.ownerSessionId ?? null,
        ownerId: job.ownerId ?? null,
        workspaceId: job.workspaceId ?? null,
        createdByUserId: job.createdByUserId ?? null,
        visibility: job.visibility,
        onStage: (stage) => updateJobStage(job.id, stage)
      })
    );
    await updateJob(job.id, {
      status: "completed",
      stage: "completed",
      stageStartedAt: now(),
      lockedAt: undefined,
      briefId: record.brief.id
    });
  } catch (error) {
    await updateJob(job.id, {
      ...getJobFailure(error),
      stage: "failed",
      stageStartedAt: now(),
      lockedAt: undefined
    });
  }
}

export async function runBriefJob(id: string) {
  const repository = await getBriefJobRepository();
  const job = await repository.getById(id);

  if (!job) {
    return;
  }

  const runningJob =
    job.status === "running"
      ? job
      : await updateJob(id, {
          status: "running",
          stage: "preflight",
          stageStartedAt: now(),
          attemptCount: job.attemptCount + 1,
          lockedAt: now(),
          error: undefined,
          qualityGate: undefined
        });

  if (runningJob) {
    await runClaimedBriefJob(runningJob);
  }
}

export async function runNextBriefJob() {
  const repository = await getBriefJobRepository();
  const job = await repository.claimNextQueued();

  if (!job) {
    return null;
  }

  await runClaimedBriefJob(job);
  return repository.getById(job.id);
}

export async function createBriefJob(
  request: BriefRequest,
  options: CreateBriefJobOptions = {}
) {
  const id = createJobId();
  const timestamp = now();
  const job: BriefJob = {
    id,
    status: "queued",
    stage: "queued",
    stageStartedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    attemptCount: 0,
    maxAttempts: getMaxAttempts(),
    ownerSessionId: options.ownerSessionId ?? null,
    ownerId: options.ownerId ?? null,
    workspaceId: options.workspaceId ?? null,
    createdByUserId: options.createdByUserId ?? null,
    visibility: options.visibility ?? "private",
    request
  };

  const repository = await getBriefJobRepository();
  const saved = await repository.create(job);

  if (shouldAutoRunBriefJobs()) {
    void runBriefJob(id);
  }

  return saved;
}

export async function getBriefJob(id: string) {
  const repository = await getBriefJobRepository();
  return repository.getById(id);
}

export async function resetStaleBriefJobs(staleMs: number) {
  const repository = await getBriefJobRepository();
  return repository.resetStaleRunning(staleMs);
}

export async function resetBriefJobsForTests() {
  resetBriefJobRepositoryForTests();
  const repository = await getBriefJobRepository();
  await repository.clear();
}

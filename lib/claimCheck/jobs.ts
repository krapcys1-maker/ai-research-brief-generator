import { ZodError } from "zod";
import { AIConfigurationError, AIProviderError } from "@/lib/ai/client";
import { compareClaimsWithScience } from "@/lib/claimCheck/compare";
import {
  getCompareJobRepository,
  resetCompareJobRepositoryForTests
} from "@/lib/claimCheck/jobRepository";
import type {
  CompareJob,
  CompareJobOwnership,
  CompareJobStage
} from "@/lib/claimCheck/jobTypes";
import { getCompareReportRepository } from "@/lib/claimCheck/reportRepository";
import type { ClaimCheckRequest } from "@/lib/claimCheck/schemas";
import type { DocumentSource } from "@/lib/documents/schemas";
import { getDocumentRepository } from "@/lib/documents/repository";

function numberEnv(name: string, fallback: number) {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function createJobId() {
  return `compare_job_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

function getMaxAttempts() {
  return numberEnv("CLAIM_CHECK_JOB_MAX_ATTEMPTS", 1);
}

function getTimeoutMs() {
  return numberEnv("CLAIM_CHECK_JOB_TIMEOUT_MS", 180000);
}

function withJobTimeout<T>(promise: Promise<T>) {
  const timeoutMs = getTimeoutMs();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_resolve, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`Claim-check job timed out after ${timeoutMs} ms.`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });
}

async function updateJob(id: string, patch: Partial<CompareJob>) {
  const repository = await getCompareJobRepository();
  return repository.update(id, patch);
}

async function updateJobStage(id: string, stage: CompareJobStage) {
  await updateJob(id, {
    stage,
    stageStartedAt: now()
  });
}

function getJobFailure(error: unknown): Pick<CompareJob, "status" | "error"> {
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
    error instanceof Error ? error.message : "Could not compare claims.";

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

export async function runCompareJob(id: string) {
  const repository = await getCompareJobRepository();
  const job = await repository.getById(id);

  if (!job) {
    return null;
  }

  const runningJob = await repository.update(id, {
    status: "running",
    stage: "retrieval",
    stageStartedAt: now(),
    attemptCount: job.attemptCount + 1,
    lockedAt: now(),
    error: undefined
  });

  if (!runningJob) {
    return null;
  }

  try {
    const documentRepository = await getDocumentRepository();
    await updateJobStage(id, "comparison");
    const report = await withJobTimeout(
      compareClaimsWithScience({
        request: runningJob.request,
        documentSource: runningJob.documentSource,
        dependencies: { documentRepository }
      })
    );
    await updateJobStage(id, "persistence");
    const compareReportRepository = await getCompareReportRepository();
    const savedReport = await compareReportRepository.save({
      request: runningJob.request,
      report,
      ownerSessionId: runningJob.ownerSessionId ?? null,
      ownerId: runningJob.ownerId ?? null,
      workspaceId: runningJob.workspaceId ?? null,
      createdByUserId: runningJob.createdByUserId ?? null,
      visibility: runningJob.visibility ?? "private"
    });

    return updateJob(id, {
      status: "completed",
      stage: "completed",
      stageStartedAt: now(),
      lockedAt: undefined,
      reportId: savedReport.id,
      report
    });
  } catch (error) {
    return updateJob(id, {
      ...getJobFailure(error),
      stage: "failed",
      stageStartedAt: now(),
      lockedAt: undefined
    });
  }
}

export async function createCompareJob(input: {
  request: ClaimCheckRequest;
  documentSource: DocumentSource;
  ownership: Required<CompareJobOwnership>;
}) {
  const timestamp = now();
  const job: CompareJob = {
    id: createJobId(),
    status: "queued",
    stage: "queued",
    stageStartedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    attemptCount: 0,
    maxAttempts: getMaxAttempts(),
    request: input.request,
    documentSource: input.documentSource,
    ownerSessionId: input.ownership.ownerSessionId,
    ownerId: input.ownership.ownerId,
    workspaceId: input.ownership.workspaceId,
    createdByUserId: input.ownership.createdByUserId,
    visibility: input.ownership.visibility
  };
  const repository = await getCompareJobRepository();
  const saved = await repository.create(job);

  void runCompareJob(saved.id);

  return saved;
}

export async function getCompareJob(id: string) {
  const repository = await getCompareJobRepository();
  return repository.getById(id);
}

export async function resetCompareJobsForTests() {
  resetCompareJobRepositoryForTests();
  const repository = await getCompareJobRepository();
  await repository.clear();
}

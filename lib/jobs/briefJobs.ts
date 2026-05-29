import { ZodError } from "zod";
import { AIConfigurationError, AIProviderError } from "@/lib/ai/client";
import { createBrief } from "@/lib/pipeline/createBrief";
import { ResearchQualityGateError } from "@/lib/pipeline/qualityGate";
import type { BriefRequest } from "@/lib/ai/schemas";
import type { ResearchQualityGateResult } from "@/lib/pipeline/qualityGate";

export type BriefJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "quality_gate_failed"
  | "configuration_error"
  | "failed";

export type BriefJob = {
  id: string;
  status: BriefJobStatus;
  createdAt: string;
  updatedAt: string;
  request: BriefRequest;
  briefId?: string;
  error?: string;
  qualityGate?: ResearchQualityGateResult;
};

const globalForBriefJobs = globalThis as typeof globalThis & {
  __researchBriefJobs?: Map<string, BriefJob>;
};

const jobs =
  globalForBriefJobs.__researchBriefJobs ?? new Map<string, BriefJob>();

globalForBriefJobs.__researchBriefJobs = jobs;

function numberEnv(name: string, fallback: number) {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function withJobTimeout<T>(promise: Promise<T>) {
  const timeoutMs = numberEnv("BRIEF_JOB_TIMEOUT_MS", 180000);
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

function updateJob(id: string, patch: Partial<BriefJob>) {
  const existing = jobs.get(id);

  if (!existing) {
    return null;
  }

  const updated: BriefJob = {
    ...existing,
    ...patch,
    updatedAt: now()
  };

  jobs.set(id, updated);
  return updated;
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

  if (error instanceof AIConfigurationError || error instanceof AIProviderError) {
    return {
      status: "configuration_error",
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

export async function runBriefJob(id: string) {
  const job = jobs.get(id);

  if (!job) {
    return;
  }

  updateJob(id, { status: "running", error: undefined, qualityGate: undefined });

  try {
    const record = await withJobTimeout(createBrief(job.request));
    updateJob(id, {
      status: "completed",
      briefId: record.brief.id
    });
  } catch (error) {
    updateJob(id, getJobFailure(error));
  }
}

export function createBriefJob(request: BriefRequest) {
  const id = createJobId();
  const timestamp = now();
  const job: BriefJob = {
    id,
    status: "queued",
    createdAt: timestamp,
    updatedAt: timestamp,
    request
  };

  jobs.set(id, job);

  void runBriefJob(id);

  return job;
}

export function getBriefJob(id: string) {
  return jobs.get(id) ?? null;
}

export function resetBriefJobsForTests() {
  jobs.clear();
}

import { afterEach, describe, expect, it, vi } from "vitest";
import { createBrief as mockedCreateBrief } from "@/lib/pipeline/createBrief";
import { AIProviderError } from "@/lib/ai/client";
import type { BriefRequest } from "@/lib/ai/schemas";
import { BRIEF_HISTORY_SESSION_COOKIE } from "@/lib/briefs/session";
import { ResearchQualityGateError } from "@/lib/pipeline/qualityGate";
import {
  createBriefJob,
  getBriefJob,
  runNextBriefJob,
  resetStaleBriefJobs,
  resetBriefJobsForTests
} from "@/lib/jobs/briefJobs";
import { getBriefJobRepository } from "@/lib/jobs/repository";
import { createBrief as createBriefFixture } from "./fixtures";

vi.mock("@/lib/pipeline/createBrief", () => ({
  createBrief: vi.fn()
}));

const createBriefMock = vi.mocked(mockedCreateBrief);

const request: BriefRequest = {
  query: "retrieval augmented generation",
  maxPapers: 5,
  sources: ["mock"]
};

async function waitForJob(id: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const job = await getBriefJob(id);

    if (
      job &&
      ["completed", "quality_gate_failed", "configuration_error", "failed"].includes(
        job.status
      )
    ) {
      return job;
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  throw new Error("Job did not finish during test.");
}

async function waitForJobStage(id: string, stage: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const job = await getBriefJob(id);

    if (job?.stage === stage) {
      return job;
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  throw new Error(`Job did not reach stage ${stage} during test.`);
}

describe("brief jobs", () => {
  afterEach(async () => {
    vi.useRealTimers();
    vi.resetAllMocks();
    await resetBriefJobsForTests();
    delete process.env.BRIEF_JOB_TIMEOUT_MS;
    delete process.env.BRIEF_JOB_AUTORUN;
    delete process.env.BRIEF_JOB_MAX_ATTEMPTS;
  });

  it("stores completed job status and brief ID", async () => {
    createBriefMock.mockResolvedValueOnce({
      brief: createBriefFixture({ id: "brief_done" }),
      papers: [],
      createdAt: "2026-01-01T00:00:00.000Z"
    });

    const job = await createBriefJob(request);
    const finalJob = await waitForJob(job.id);

    expect(finalJob.status).toBe("completed");
    expect(finalJob.briefId).toBe("brief_done");
    expect(createBriefMock).toHaveBeenCalledWith(
      request,
      {},
      expect.objectContaining({ ownerSessionId: null })
    );
  });

  it("can process queued jobs through the worker path", async () => {
    process.env.BRIEF_JOB_AUTORUN = "false";
    createBriefMock.mockResolvedValueOnce({
      brief: createBriefFixture({ id: "brief_worker_done" }),
      papers: [],
      createdAt: "2026-01-01T00:00:00.000Z"
    });

    const job = await createBriefJob(request);
    expect((await getBriefJob(job.id))?.status).toBe("queued");

    const finalJob = await runNextBriefJob();

    expect(finalJob?.status).toBe("completed");
    expect(finalJob?.briefId).toBe("brief_worker_done");
    expect(finalJob?.attemptCount).toBe(1);
    expect(finalJob?.lockedAt).toBeUndefined();
  });

  it("passes the owner session from queued jobs to brief persistence", async () => {
    process.env.BRIEF_JOB_AUTORUN = "false";
    createBriefMock.mockResolvedValueOnce({
      brief: createBriefFixture({ id: "brief_private_done" }),
      papers: [],
      createdAt: "2026-01-01T00:00:00.000Z"
    });

    await createBriefJob(request, {
      ownerSessionId: "brief_session_test"
    });
    await runNextBriefJob();

    expect(createBriefMock).toHaveBeenCalledWith(
      request,
      {},
      expect.objectContaining({ ownerSessionId: "brief_session_test" })
    );
  });

  it("carries app-native ownership metadata from jobs to brief persistence", async () => {
    process.env.BRIEF_JOB_AUTORUN = "false";
    createBriefMock.mockResolvedValueOnce({
      brief: createBriefFixture({ id: "brief_workspace_done" }),
      papers: [],
      createdAt: "2026-01-01T00:00:00.000Z"
    });

    const job = await createBriefJob(request, {
      ownerId: "user_owner",
      workspaceId: "workspace_a",
      createdByUserId: "user_creator",
      visibility: "workspace"
    });
    await runNextBriefJob();

    expect(job).toMatchObject({
      ownerId: "user_owner",
      workspaceId: "workspace_a",
      createdByUserId: "user_creator",
      visibility: "workspace"
    });
    expect(createBriefMock).toHaveBeenCalledWith(
      request,
      {},
      expect.objectContaining({
        ownerId: "user_owner",
        workspaceId: "workspace_a",
        createdByUserId: "user_creator",
        visibility: "workspace"
      })
    );
  });

  it("tracks the current generation stage for polling clients", async () => {
    let finishBrief: (
      value: Awaited<ReturnType<typeof mockedCreateBrief>>
    ) => void = () => undefined;
    createBriefMock.mockImplementationOnce(async (_request, _dependencies, options) => {
      await options?.onStage?.("preflight");
      await options?.onStage?.("full_text_ingestion");
      await options?.onStage?.("synthesis");

      return new Promise((resolve) => {
        finishBrief = resolve;
      });
    });

    const job = await createBriefJob(request);

    await waitForJobStage(job.id, "synthesis");

    finishBrief({
      brief: createBriefFixture({ id: "brief_stage_done" }),
      papers: [],
      createdAt: "2026-01-01T00:00:00.000Z"
    });

    const finalJob = await waitForJob(job.id);

    expect(finalJob.status).toBe("completed");
    expect(finalJob.stage).toBe("completed");
    expect(finalJob.stageStartedAt).toBeDefined();
  });

  it("resets stale running jobs back to the queue before attempts are exhausted", async () => {
    const repository = await getBriefJobRepository();
    const timestamp = "2026-01-01T00:00:00.000Z";

    await repository.create({
      id: "job_stale_retry",
      status: "running",
      createdAt: timestamp,
      updatedAt: timestamp,
      attemptCount: 1,
      maxAttempts: 2,
      lockedAt: "2026-01-01T00:00:00.000Z",
      request
    });

    const resetCount = await resetStaleBriefJobs(1);
    const job = await getBriefJob("job_stale_retry");

    expect(resetCount).toBe(1);
    expect(job?.status).toBe("queued");
    expect(job?.lockedAt).toBeUndefined();
    expect(job?.error).toContain("stale worker lease");
  });

  it("fails stale running jobs after the configured attempt limit", async () => {
    const repository = await getBriefJobRepository();
    const timestamp = "2026-01-01T00:00:00.000Z";

    await repository.create({
      id: "job_stale_exhausted",
      status: "running",
      createdAt: timestamp,
      updatedAt: timestamp,
      attemptCount: 2,
      maxAttempts: 2,
      lockedAt: "2026-01-01T00:00:00.000Z",
      request
    });

    const resetCount = await resetStaleBriefJobs(1);
    const job = await getBriefJob("job_stale_exhausted");

    expect(resetCount).toBe(1);
    expect(job?.status).toBe("failed");
    expect(job?.lockedAt).toBeUndefined();
    expect(job?.error).toContain("exceeded 2 attempt");
  });

  it("stores quality gate failures for polling clients", async () => {
    createBriefMock.mockRejectedValueOnce(
      new ResearchQualityGateError({
        coverage: "poor",
        canSynthesize: false,
        selectedPaperCount: 0,
        livePaperCount: 0,
        mockPaperCount: 0,
        averageRelevance: 0,
        warningCount: 0,
        reasons: ["No relevant papers were available after deduplication and scoring."],
        suggestions: ["Try this broader query: stem cells"]
      })
    );

    const job = await createBriefJob(request);
    const finalJob = await waitForJob(job.id);

    expect(finalJob.status).toBe("quality_gate_failed");
    expect(finalJob.qualityGate?.coverage).toBe("poor");
    expect(finalJob.error).toContain("No relevant papers");
  });

  it("stores configuration failures separately from generic failures", async () => {
    createBriefMock.mockRejectedValueOnce(
      new Error("Missing DEEPSEEK_API_KEY. Add it to .env.")
    );

    const job = await createBriefJob(request);
    const finalJob = await waitForJob(job.id);

    expect(finalJob.status).toBe("configuration_error");
    expect(finalJob.error).toContain("DEEPSEEK_API_KEY");
  });

  it("stores AI provider runtime failures as failed jobs", async () => {
    createBriefMock.mockRejectedValueOnce(
      new AIProviderError("DeepSeek request timed out after 90 seconds.")
    );

    const job = await createBriefJob(request);
    const finalJob = await waitForJob(job.id);

    expect(finalJob.status).toBe("failed");
    expect(finalJob.error).toContain("DeepSeek request timed out");
  });

  it("fails jobs that exceed the configured timeout", async () => {
    vi.useFakeTimers();
    process.env.BRIEF_JOB_TIMEOUT_MS = "10";
    createBriefMock.mockReturnValueOnce(new Promise(() => undefined));

    const job = await createBriefJob(request);

    await vi.advanceTimersByTimeAsync(10);
    const finalJob = await getBriefJob(job.id);

    expect(finalJob?.status).toBe("failed");
    expect(finalJob?.error).toContain("timed out");
  });

  it("exposes jobs through the job status route", async () => {
    createBriefMock.mockResolvedValueOnce({
      brief: createBriefFixture({ id: "brief_route_done" }),
      papers: [],
      createdAt: "2026-01-01T00:00:00.000Z"
    });

    const job = await createBriefJob(request);
    await waitForJob(job.id);

    const { GET } = await import("@/app/api/briefs/jobs/[id]/route");
    const response = await GET(
      new Request(`http://localhost/api/briefs/jobs/${job.id}`),
      { params: Promise.resolve({ id: job.id }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("completed");
    expect(payload.stage).toBe("completed");
    expect(payload.stageStartedAt).toBeDefined();
    expect(payload.briefId).toBe("brief_route_done");
  });

  it("exposes private job status only to the owning session", async () => {
    process.env.BRIEF_JOB_AUTORUN = "false";

    const job = await createBriefJob(request, {
      ownerSessionId: "brief_session_owner"
    });

    const { GET } = await import("@/app/api/briefs/jobs/[id]/route");
    const response = await GET(
      new Request(`http://localhost/api/briefs/jobs/${job.id}`, {
        headers: {
          cookie: `${BRIEF_HISTORY_SESSION_COOKIE}=brief_session_owner`
        }
      }),
      { params: Promise.resolve({ id: job.id }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.jobId).toBe(job.id);
    expect(payload.status).toBe("queued");
  });

  it("blocks private job status for another session", async () => {
    process.env.BRIEF_JOB_AUTORUN = "false";

    const job = await createBriefJob(request, {
      ownerSessionId: "brief_session_owner"
    });

    const { GET } = await import("@/app/api/briefs/jobs/[id]/route");
    const response = await GET(
      new Request(`http://localhost/api/briefs/jobs/${job.id}`, {
        headers: {
          cookie: `${BRIEF_HISTORY_SESSION_COOKIE}=brief_session_other`
        }
      }),
      { params: Promise.resolve({ id: job.id }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.status).toBe("forbidden");
    expect(payload.error).toContain("brief generation job");
  });

  it("exposes workspace-owned job status only to the owning trusted user", async () => {
    process.env.BRIEF_JOB_AUTORUN = "false";

    const job = await createBriefJob(request, {
      ownerId: "user_alpha",
      workspaceId: "workspace_alpha",
      createdByUserId: "user_alpha",
      visibility: "workspace"
    });

    const { GET } = await import("@/app/api/briefs/jobs/[id]/route");
    const response = await GET(
      new Request(`http://localhost/api/briefs/jobs/${job.id}`, {
        headers: {
          "x-ai-brief-user-id": "user_alpha",
          "x-ai-brief-workspace-id": "workspace_alpha"
        }
      }),
      { params: Promise.resolve({ id: job.id }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.jobId).toBe(job.id);
    expect(payload.status).toBe("queued");
  });

  it("blocks workspace-owned job status for another trusted user", async () => {
    process.env.BRIEF_JOB_AUTORUN = "false";

    const job = await createBriefJob(request, {
      ownerId: "user_alpha",
      workspaceId: "workspace_alpha",
      createdByUserId: "user_alpha",
      visibility: "workspace"
    });

    const { GET } = await import("@/app/api/briefs/jobs/[id]/route");
    const response = await GET(
      new Request(`http://localhost/api/briefs/jobs/${job.id}`, {
        headers: {
          "x-ai-brief-user-id": "user_beta",
          "x-ai-brief-workspace-id": "workspace_alpha"
        }
      }),
      { params: Promise.resolve({ id: job.id }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.status).toBe("forbidden");
  });

  it("blocks workspace-owned job status for another workspace", async () => {
    process.env.BRIEF_JOB_AUTORUN = "false";

    const job = await createBriefJob(request, {
      ownerId: "user_alpha",
      workspaceId: "workspace_alpha",
      createdByUserId: "user_alpha",
      visibility: "workspace"
    });

    const { GET } = await import("@/app/api/briefs/jobs/[id]/route");
    const response = await GET(
      new Request(`http://localhost/api/briefs/jobs/${job.id}`, {
        headers: {
          "x-ai-brief-user-id": "user_alpha",
          "x-ai-brief-workspace-id": "workspace_beta"
        }
      }),
      { params: Promise.resolve({ id: job.id }) }
    );

    expect(response.status).toBe(403);
  });

  it("returns 404 for missing jobs", async () => {
    const { GET } = await import("@/app/api/briefs/jobs/[id]/route");
    const response = await GET(
      new Request("http://localhost/api/briefs/jobs/missing"),
      { params: Promise.resolve({ id: "missing" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.status).toBe("not_found");
  });
});

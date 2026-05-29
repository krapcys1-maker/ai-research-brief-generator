import { afterEach, describe, expect, it, vi } from "vitest";
import { createBrief as mockedCreateBrief } from "@/lib/pipeline/createBrief";
import { ResearchQualityGateError } from "@/lib/pipeline/qualityGate";
import {
  createBriefJob,
  getBriefJob,
  resetBriefJobsForTests
} from "@/lib/jobs/briefJobs";
import { createBrief as createBriefFixture } from "./fixtures";

vi.mock("@/lib/pipeline/createBrief", () => ({
  createBrief: vi.fn()
}));

const createBriefMock = vi.mocked(mockedCreateBrief);

const request = {
  query: "retrieval augmented generation",
  maxPapers: 5,
  sources: ["mock"] as const
};

async function waitForJob(id: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const job = getBriefJob(id);

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

describe("brief jobs", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
    resetBriefJobsForTests();
    delete process.env.BRIEF_JOB_TIMEOUT_MS;
  });

  it("stores completed job status and brief ID", async () => {
    createBriefMock.mockResolvedValueOnce({
      brief: createBriefFixture({ id: "brief_done" }),
      papers: [],
      createdAt: "2026-01-01T00:00:00.000Z"
    });

    const job = createBriefJob(request);
    const finalJob = await waitForJob(job.id);

    expect(finalJob.status).toBe("completed");
    expect(finalJob.briefId).toBe("brief_done");
    expect(createBriefMock).toHaveBeenCalledWith(request);
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

    const job = createBriefJob(request);
    const finalJob = await waitForJob(job.id);

    expect(finalJob.status).toBe("quality_gate_failed");
    expect(finalJob.qualityGate?.coverage).toBe("poor");
    expect(finalJob.error).toContain("No relevant papers");
  });

  it("stores configuration failures separately from generic failures", async () => {
    createBriefMock.mockRejectedValueOnce(
      new Error("Missing DEEPSEEK_API_KEY. Add it to .env.")
    );

    const job = createBriefJob(request);
    const finalJob = await waitForJob(job.id);

    expect(finalJob.status).toBe("configuration_error");
    expect(finalJob.error).toContain("DEEPSEEK_API_KEY");
  });

  it("fails jobs that exceed the configured timeout", async () => {
    vi.useFakeTimers();
    process.env.BRIEF_JOB_TIMEOUT_MS = "10";
    createBriefMock.mockReturnValueOnce(new Promise(() => undefined));

    const job = createBriefJob(request);

    await vi.advanceTimersByTimeAsync(10);
    const finalJob = getBriefJob(job.id);

    expect(finalJob?.status).toBe("failed");
    expect(finalJob?.error).toContain("timed out");
  });

  it("exposes jobs through the job status route", async () => {
    createBriefMock.mockResolvedValueOnce({
      brief: createBriefFixture({ id: "brief_route_done" }),
      papers: [],
      createdAt: "2026-01-01T00:00:00.000Z"
    });

    const job = createBriefJob(request);
    await waitForJob(job.id);

    const { GET } = await import("@/app/api/briefs/jobs/[id]/route");
    const response = await GET(
      new Request(`http://localhost/api/briefs/jobs/${job.id}`),
      { params: Promise.resolve({ id: job.id }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("completed");
    expect(payload.briefId).toBe("brief_route_done");
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

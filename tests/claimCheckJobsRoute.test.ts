import { beforeEach, describe, expect, it } from "vitest";
import { inMemoryCompareReportRepository } from "@/lib/claimCheck/inMemoryCompareReportRepository";
import { resetCompareJobsForTests } from "@/lib/claimCheck/jobs";
import { resetRateLimitForTests } from "@/lib/security/rateLimit";

const request = {
  claims: ["Retrieval augmented generation improves factuality in language tasks."],
  sources: ["mock"],
  maxPapers: 5
};

async function waitForCompareJob(
  jobId: string,
  cookie: string,
  maxAttempts = 30
) {
  const { GET } = await import("@/app/api/claim-check/jobs/[id]/route");

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await GET(
      new Request(`http://localhost/api/claim-check/jobs/${jobId}`, {
        headers: { cookie }
      }),
      { params: Promise.resolve({ id: jobId }) }
    );
    const payload = await response.json();

    if (payload.status === "completed") {
      return { response, payload };
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  throw new Error("Compare job did not finish during test.");
}

describe("claim-check background job API routes", () => {
  beforeEach(async () => {
    await resetCompareJobsForTests();
    await inMemoryCompareReportRepository.clear();
    resetRateLimitForTests();
  });

  it("queues, polls, completes, and saves compare reports for the owning session", async () => {
    const { POST } = await import("@/app/api/claim-check/jobs/route");
    const response = await POST(
      new Request("http://localhost/api/claim-check/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
      })
    );
    const queued = await response.json();
    const cookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(202);
    expect(queued.status).toBe("queued");
    expect(queued.jobId).toMatch(/^compare_job_/);
    expect(cookie).toContain("ai_brief_doc_session");

    const { payload } = await waitForCompareJob(queued.jobId, cookie);

    expect(payload.status).toBe("completed");
    expect(payload.stage).toBe("completed");
    expect(payload.reportId).toBe(payload.report.id);
    expect(payload.report.items[0].claimText).toBe(request.claims[0]);
    expect(payload.report.items[0].evidenceSnippets.length).toBeGreaterThan(0);

    const reportsRoute = await import("@/app/api/claim-check/reports/route");
    const reportsResponse = await reportsRoute.GET(
      new Request("http://localhost/api/claim-check/reports", {
        headers: { cookie }
      })
    );
    const reportsPayload = await reportsResponse.json();

    expect(reportsPayload.reports).toEqual([
      expect.objectContaining({
        id: payload.reportId,
        claimCount: 1
      })
    ]);
  });

  it("does not expose compare job polling across sessions", async () => {
    const { POST } = await import("@/app/api/claim-check/jobs/route");
    const response = await POST(
      new Request("http://localhost/api/claim-check/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
      })
    );
    const queued = await response.json();

    const { GET } = await import("@/app/api/claim-check/jobs/[id]/route");
    const otherResponse = await GET(
      new Request(`http://localhost/api/claim-check/jobs/${queued.jobId}`, {
        headers: { cookie: "ai_brief_doc_session=other_session" }
      }),
      { params: Promise.resolve({ id: queued.jobId }) }
    );
    const otherPayload = await otherResponse.json();

    expect(otherResponse.status).toBe(404);
    expect(otherPayload.error).toContain("not found");
  });

  it("polls workspace-owned compare jobs only inside the trusted workspace", async () => {
    const { POST } = await import("@/app/api/claim-check/jobs/route");
    const response = await POST(
      new Request("http://localhost/api/claim-check/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-brief-user-id": "user_alpha",
          "x-ai-brief-workspace-id": "workspace_alpha"
        },
        body: JSON.stringify(request)
      })
    );
    const queued = await response.json();
    const { GET } = await import("@/app/api/claim-check/jobs/[id]/route");
    const sameWorkspace = await GET(
      new Request(`http://localhost/api/claim-check/jobs/${queued.jobId}`, {
        headers: {
          "x-ai-brief-user-id": "user_alpha",
          "x-ai-brief-workspace-id": "workspace_alpha"
        }
      }),
      { params: Promise.resolve({ id: queued.jobId }) }
    );
    const otherWorkspace = await GET(
      new Request(`http://localhost/api/claim-check/jobs/${queued.jobId}`, {
        headers: {
          "x-ai-brief-user-id": "user_alpha",
          "x-ai-brief-workspace-id": "workspace_beta"
        }
      }),
      { params: Promise.resolve({ id: queued.jobId }) }
    );

    expect(sameWorkspace.status).toBe(200);
    expect(otherWorkspace.status).toBe(404);
  });
});

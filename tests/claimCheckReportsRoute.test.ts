import { beforeEach, describe, expect, it } from "vitest";
import { inMemoryCompareReportRepository } from "@/lib/claimCheck/inMemoryCompareReportRepository";
import type { ClaimCheckReport, ClaimCheckRequest } from "@/lib/claimCheck/schemas";
import { resetRateLimitForTests } from "@/lib/security/rateLimit";

const request: ClaimCheckRequest = {
  claims: ["Retrieval augmented generation improves factuality in language tasks."],
  sources: ["mock"],
  maxPapers: 5
};

function storedReport(id: string, title = "Saved compare report"): ClaimCheckReport {
  return {
    id,
    title,
    createdAt: "2026-06-02T00:00:00.000Z",
    summary: "A saved compare report.",
    items: [
      {
        claimText:
          "Retrieval augmented generation improves factuality in language tasks.",
        classification: "supported",
        confidence: "medium",
        explanation: "Retrieved evidence supports the claim.",
        whatMatchesScience: ["The evidence discusses retrieval grounding."],
        whatDoesNotMatchScience: [],
        caveats: ["The report is bounded by retrieved evidence."],
        suggestedRevision: null,
        evidenceSnippets: [
          {
            id: "ev_1",
            sourceType: "paper_abstract",
            sourceId: "paper_1",
            paperId: "paper_1",
            text: "Retrieval augmented generation improves factuality.",
            evidenceLevel: "abstract_supported",
            supportRelation: "supports"
          }
        ],
        relatedPapers: [
          {
            paperId: "paper_1",
            title: "Retrieval-Augmented Generation",
            authors: ["Ada Researcher"],
            year: 2020,
            url: null,
            doi: null,
            evidenceBoundary: "abstract_supported"
          }
        ],
        evidenceBoundary: "abstract_supported"
      }
    ],
    similarWork: [],
    overallCaveats: ["Not a definitive review."],
    recommendedNextSteps: ["Read the cited paper."]
  };
}

describe("claim-check saved report API routes", () => {
  beforeEach(async () => {
    await inMemoryCompareReportRepository.clear();
    resetRateLimitForTests();
  });

  it("saves completed compare reports and lists them only for the same session", async () => {
    const claimCheckRoute = await import("@/app/api/claim-check/route");
    const response = await claimCheckRoute.POST(
      new Request("http://localhost/api/claim-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
      })
    );
    const payload = await response.json();
    const cookie = response.headers.get("set-cookie");

    expect(response.status).toBe(200);
    expect(payload.status).toBe("completed");
    expect(payload.savedReport.id).toBe(payload.report.id);
    expect(cookie).toContain("ai_brief_doc_session");

    const reportsRoute = await import("@/app/api/claim-check/reports/route");
    const sameSessionResponse = await reportsRoute.GET(
      new Request("http://localhost/api/claim-check/reports", {
        headers: { cookie: cookie ?? "" }
      })
    );
    const sameSessionPayload = await sameSessionResponse.json();
    const otherSessionResponse = await reportsRoute.GET(
      new Request("http://localhost/api/claim-check/reports", {
        headers: { cookie: "ai_brief_doc_session=other_session" }
      })
    );
    const otherSessionPayload = await otherSessionResponse.json();

    expect(sameSessionResponse.headers.get("cache-control")).toContain("no-store");
    expect(sameSessionPayload.historyScope).toBe("session");
    expect(sameSessionPayload.reports).toEqual([
      expect.objectContaining({
        id: payload.savedReport.id,
        claimCount: payload.report.items.length,
        visibility: "private"
      })
    ]);
    expect(otherSessionPayload.reports).toEqual([]);
  });

  it("blocks loading a saved report from another private session", async () => {
    await inMemoryCompareReportRepository.save({
      request,
      report: storedReport("compare_session_owner"),
      ownerSessionId: "session_owner"
    });

    const reportRoute = await import("@/app/api/claim-check/reports/[id]/route");
    const ownerResponse = await reportRoute.GET(
      new Request("http://localhost/api/claim-check/reports/compare_session_owner", {
        headers: { cookie: "ai_brief_doc_session=session_owner" }
      }),
      { params: Promise.resolve({ id: "compare_session_owner" }) }
    );
    const otherResponse = await reportRoute.GET(
      new Request("http://localhost/api/claim-check/reports/compare_session_owner", {
        headers: { cookie: "ai_brief_doc_session=session_other" }
      }),
      { params: Promise.resolve({ id: "compare_session_owner" }) }
    );
    const ownerPayload = await ownerResponse.json();
    const otherPayload = await otherResponse.json();

    expect(ownerResponse.status).toBe(200);
    expect(ownerPayload.report.id).toBe("compare_session_owner");
    expect(otherResponse.status).toBe(404);
    expect(otherPayload.error).toContain("not found");
  });

  it("lists only reports in the trusted user workspace", async () => {
    await inMemoryCompareReportRepository.save({
      request,
      report: storedReport("compare_workspace_a", "Workspace A report"),
      ownerId: "user_1",
      workspaceId: "workspace_a",
      createdByUserId: "user_1",
      visibility: "workspace"
    });
    await inMemoryCompareReportRepository.save({
      request,
      report: storedReport("compare_workspace_b", "Workspace B report"),
      ownerId: "user_1",
      workspaceId: "workspace_b",
      createdByUserId: "user_1",
      visibility: "workspace"
    });

    const reportsRoute = await import("@/app/api/claim-check/reports/route");
    const response = await reportsRoute.GET(
      new Request("http://localhost/api/claim-check/reports", {
        headers: {
          "x-ai-brief-user-id": "user_1",
          "x-ai-brief-workspace-id": "workspace_a"
        }
      })
    );
    const payload = await response.json();

    expect(response.headers.get("x-document-privacy-scope")).toBe("user");
    expect(payload.historyScope).toBe("user");
    expect(payload.reports.map((item: { id: string }) => item.id)).toEqual([
      "compare_workspace_a"
    ]);
  });
});

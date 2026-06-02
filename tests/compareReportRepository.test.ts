import { beforeEach, describe, expect, it } from "vitest";
import { inMemoryCompareReportRepository } from "@/lib/claimCheck/inMemoryCompareReportRepository";
import type { ClaimCheckReport, ClaimCheckRequest } from "@/lib/claimCheck/schemas";

const request: ClaimCheckRequest = {
  claims: ["RAG improves citation faithfulness in medical QA."],
  sources: ["mock"],
  maxPapers: 5
};

function report(id: string, title = "Compare report"): ClaimCheckReport {
  return {
    id,
    title,
    createdAt: "2026-06-02T00:00:00.000Z",
    summary: "A saved compare report.",
    items: [
      {
        claimText: "RAG improves citation faithfulness in medical QA.",
        classification: "supported",
        confidence: "medium",
        explanation: "Retrieved evidence supports the claim.",
        whatMatchesScience: ["The evidence discusses citation faithfulness."],
        whatDoesNotMatchScience: [],
        caveats: ["The report is bounded by retrieved evidence."],
        suggestedRevision: null,
        evidenceSnippets: [
          {
            id: "ev_1",
            sourceType: "paper_abstract",
            sourceId: "paper_1",
            paperId: "paper_1",
            text: "A benchmark reports citation faithfulness improvements.",
            evidenceLevel: "abstract_supported",
            supportRelation: "supports"
          }
        ],
        relatedPapers: [
          {
            paperId: "paper_1",
            title: "Citation Faithfulness",
            authors: ["Ada Researcher"],
            year: 2025,
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

describe("compare report repository", () => {
  beforeEach(async () => {
    await inMemoryCompareReportRepository.clear();
  });

  it("stores compare reports with user and workspace ownership", async () => {
    const saved = await inMemoryCompareReportRepository.save({
      request,
      report: report("compare_workspace_a"),
      ownerId: "user_owner",
      workspaceId: "workspace_a",
      createdByUserId: "user_owner",
      visibility: "workspace"
    });
    await inMemoryCompareReportRepository.save({
      request,
      report: report("compare_workspace_b", "Other workspace"),
      ownerId: "user_owner",
      workspaceId: "workspace_b",
      createdByUserId: "user_owner",
      visibility: "workspace"
    });

    expect(saved).toMatchObject({
      id: "compare_workspace_a",
      ownerId: "user_owner",
      workspaceId: "workspace_a",
      createdByUserId: "user_owner",
      visibility: "workspace",
      claimCount: 1
    });

    const workspaceReports = await inMemoryCompareReportRepository.listSummaries({
      ownerId: "user_owner",
      workspaceId: "workspace_a"
    });

    expect(workspaceReports).toEqual([
      expect.objectContaining({
        id: "compare_workspace_a",
        ownerId: "user_owner",
        workspaceId: "workspace_a",
        claimCount: 1
      })
    ]);
  });

  it("stores session-owned compare reports for private demo mode", async () => {
    await inMemoryCompareReportRepository.save({
      request,
      report: report("compare_session_owner"),
      ownerSessionId: "session_owner"
    });
    await inMemoryCompareReportRepository.save({
      request,
      report: report("compare_session_other"),
      ownerSessionId: "session_other"
    });

    const ownerReports = await inMemoryCompareReportRepository.listSummaries({
      ownerSessionId: "session_owner"
    });

    expect(ownerReports.map((item) => item.id)).toEqual(["compare_session_owner"]);
  });
});

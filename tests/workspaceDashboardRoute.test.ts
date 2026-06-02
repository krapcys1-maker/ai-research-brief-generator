import { beforeEach, describe, expect, it } from "vitest";
import type { ClaimCheckReport, ClaimCheckRequest } from "@/lib/claimCheck/schemas";
import { inMemoryCompareReportRepository } from "@/lib/claimCheck/inMemoryCompareReportRepository";
import { inMemoryDocumentRepository } from "@/lib/documents/inMemoryDocumentRepository";
import type { UserDocument } from "@/lib/documents/schemas";
import { inMemoryBriefRepository } from "@/lib/storage/inMemoryBriefStore";
import { createBrief, createPaper } from "@/tests/fixtures";

const compareRequest: ClaimCheckRequest = {
  claims: ["Retrieval augmented generation improves factuality."],
  sources: ["mock"],
  maxPapers: 5
};

function compareReport(id: string, title: string): ClaimCheckReport {
  return {
    id,
    title,
    createdAt: "2026-06-02T00:00:00.000Z",
    summary: "A saved compare report.",
    items: [
      {
        claimText: "Retrieval augmented generation improves factuality.",
        classification: "supported",
        confidence: "medium",
        explanation: "Retrieved evidence supports the claim.",
        whatMatchesScience: ["Retrieved evidence discusses grounding."],
        whatDoesNotMatchScience: [],
        caveats: ["Bounded by retrieved evidence."],
        suggestedRevision: null,
        evidenceSnippets: [
          {
            id: "ev_1",
            sourceType: "paper_abstract",
            sourceId: "paper_1",
            paperId: "paper_1",
            text: "Retrieval grounding improves factuality.",
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

function document(overrides: Partial<UserDocument>): UserDocument {
  return {
    id: "doc_1",
    ownerId: null,
    workspaceId: null,
    sessionId: "doc_session_a",
    filename: "notes.md",
    mimeType: "text/markdown",
    sizeBytes: 2048,
    status: "parsed",
    textHash: "hash_1",
    createdAt: "2026-06-02T00:00:00.000Z",
    deletedAt: null,
    privacyScope: "session",
    errorMessage: null,
    ...overrides
  };
}

describe("workspace dashboard API route", () => {
  beforeEach(async () => {
    await inMemoryBriefRepository.clear();
    await inMemoryDocumentRepository.clear();
    await inMemoryCompareReportRepository.clear();
  });

  it("summarizes only resources from the same private sessions", async () => {
    await inMemoryBriefRepository.saveWithPapers({
      brief: createBrief({ id: "brief_session_a", title: "Session A brief" }),
      papers: [createPaper()],
      ownerSessionId: "brief_session_a"
    });
    await inMemoryBriefRepository.saveWithPapers({
      brief: createBrief({ id: "brief_session_b", title: "Session B brief" }),
      papers: [createPaper()],
      ownerSessionId: "brief_session_b"
    });
    await inMemoryDocumentRepository.saveParsedDocument({
      document: document({
        id: "doc_session_a",
        sessionId: "doc_session_a",
        filename: "session-a.md"
      }),
      chunks: []
    });
    await inMemoryDocumentRepository.saveParsedDocument({
      document: document({
        id: "doc_session_b",
        sessionId: "doc_session_b",
        filename: "session-b.md"
      }),
      chunks: []
    });
    await inMemoryCompareReportRepository.save({
      request: compareRequest,
      report: compareReport("compare_session_a", "Session A report"),
      ownerSessionId: "doc_session_a"
    });
    await inMemoryCompareReportRepository.save({
      request: compareRequest,
      report: compareReport("compare_session_b", "Session B report"),
      ownerSessionId: "doc_session_b"
    });

    const { GET } = await import("@/app/api/workspace/dashboard/route");
    const response = await GET(
      new Request("http://localhost/api/workspace/dashboard", {
        headers: {
          cookie:
            "ai_brief_history_session=brief_session_a; ai_brief_doc_session=doc_session_a"
        }
      })
    );
    const payload = await response.json();

    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-workspace-dashboard-scope")).toBe("session");
    expect(payload.dashboard.totals).toEqual({
      briefs: 1,
      documents: 1,
      parsedDocuments: 1,
      compareReports: 1
    });
    expect(payload.dashboard.recentBriefs.map((item: { id: string }) => item.id))
      .toEqual(["brief_session_a"]);
    expect(payload.dashboard.recentDocuments.map((item: { id: string }) => item.id))
      .toEqual(["doc_session_a"]);
    expect(
      payload.dashboard.recentCompareReports.map((item: { id: string }) => item.id)
    ).toEqual(["compare_session_a"]);
  });

  it("summarizes only resources from the trusted user workspace", async () => {
    await inMemoryBriefRepository.saveWithPapers({
      brief: createBrief({ id: "brief_workspace_a", title: "Workspace A brief" }),
      papers: [createPaper()],
      ownerId: "user_1",
      workspaceId: "workspace_a",
      createdByUserId: "user_1",
      visibility: "workspace"
    });
    await inMemoryBriefRepository.saveWithPapers({
      brief: createBrief({ id: "brief_workspace_b", title: "Workspace B brief" }),
      papers: [createPaper()],
      ownerId: "user_1",
      workspaceId: "workspace_b",
      createdByUserId: "user_1",
      visibility: "workspace"
    });
    await inMemoryDocumentRepository.saveParsedDocument({
      document: document({
        id: "doc_workspace_a",
        ownerId: "user_1",
        workspaceId: "workspace_a",
        sessionId: null,
        filename: "workspace-a.md",
        privacyScope: "user"
      }),
      chunks: []
    });
    await inMemoryDocumentRepository.saveParsedDocument({
      document: document({
        id: "doc_workspace_b",
        ownerId: "user_1",
        workspaceId: "workspace_b",
        sessionId: null,
        filename: "workspace-b.md",
        privacyScope: "user"
      }),
      chunks: []
    });
    await inMemoryCompareReportRepository.save({
      request: compareRequest,
      report: compareReport("compare_workspace_a", "Workspace A report"),
      ownerId: "user_1",
      workspaceId: "workspace_a",
      createdByUserId: "user_1",
      visibility: "workspace"
    });
    await inMemoryCompareReportRepository.save({
      request: compareRequest,
      report: compareReport("compare_workspace_b", "Workspace B report"),
      ownerId: "user_1",
      workspaceId: "workspace_b",
      createdByUserId: "user_1",
      visibility: "workspace"
    });

    const { GET } = await import("@/app/api/workspace/dashboard/route");
    const response = await GET(
      new Request("http://localhost/api/workspace/dashboard", {
        headers: {
          "x-ai-brief-user-id": "user_1",
          "x-ai-brief-workspace-id": "workspace_a"
        }
      })
    );
    const payload = await response.json();

    expect(response.headers.get("x-workspace-dashboard-scope")).toBe("user");
    expect(payload.dashboard.workspaceId).toBe("workspace_a");
    expect(payload.dashboard.totals).toEqual({
      briefs: 1,
      documents: 1,
      parsedDocuments: 1,
      compareReports: 1
    });
    expect(payload.dashboard.recentBriefs.map((item: { id: string }) => item.id))
      .toEqual(["brief_workspace_a"]);
    expect(payload.dashboard.recentDocuments.map((item: { id: string }) => item.id))
      .toEqual(["doc_workspace_a"]);
    expect(
      payload.dashboard.recentCompareReports.map((item: { id: string }) => item.id)
    ).toEqual(["compare_workspace_a"]);
  });
});

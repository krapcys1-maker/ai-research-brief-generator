import { afterEach, describe, expect, it, vi } from "vitest";
import { BRIEF_HISTORY_SESSION_COOKIE } from "@/lib/briefs/session";
import { getBriefRepository as mockedGetBriefRepository } from "@/lib/storage/repository";
import { synthesizeAnswer as mockedSynthesizeAnswer } from "@/lib/ai/synthesizeAnswer";
import { resetRateLimitForTests } from "@/lib/security/rateLimit";
import { createBrief, createPaper } from "@/tests/fixtures";

vi.mock("@/lib/storage/repository", () => ({
  getBriefRepository: vi.fn()
}));

vi.mock("@/lib/ai/synthesizeAnswer", () => ({
  synthesizeAnswer: vi.fn()
}));

const getBriefRepositoryMock = vi.mocked(mockedGetBriefRepository);
const synthesizeAnswerMock = vi.mocked(mockedSynthesizeAnswer);

describe("POST /api/briefs/[id]/questions", () => {
  afterEach(() => {
    vi.resetAllMocks();
    resetRateLimitForTests();
    vi.unstubAllEnvs();
  });

  it("answers a question for an existing brief", async () => {
    const brief = createBrief();
    const paper = createPaper();

    getBriefRepositoryMock.mockResolvedValueOnce({
      saveWithPapers: vi.fn(),
      getById: vi.fn().mockResolvedValue({
        brief,
        papers: [paper],
        createdAt: "2026-01-01T00:00:00.000Z"
      }),
      list: vi.fn(),
      listSummaries: vi.fn(),
      clear: vi.fn()
    });
    synthesizeAnswerMock.mockResolvedValueOnce({
      question: "Dlaczego ten artykul zostal wybrany?",
      outputLanguage: "pl",
      answer: "Bo wybrany artykul bezposrednio dotyczy RAG w diagnostyce.",
      confidence: "medium",
      notAnswerableFromSources: false,
      claims: [
        {
          claim: "Artykul dotyczy RAG w diagnostyce.",
          explanation: "Tytul laczy RAG i diagnostyke medyczna.",
          sourcePaperIds: ["paper_1"],
          evidence: [
            {
              paperId: "paper_1",
              evidenceText: "Retrieval-Augmented Generation for Medical Diagnosis",
              supportLevel: "direct"
            }
          ]
        }
      ],
      suggestedFollowUpQuestions: []
    });

    const { POST } = await import("@/app/api/briefs/[id]/questions/route");
    const response = await POST(
      new Request("http://localhost/api/briefs/brief_1/questions", {
        method: "POST",
        body: JSON.stringify({
          question: "Dlaczego ten artykul zostal wybrany?"
        })
      }),
      { params: Promise.resolve({ id: "brief_1" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("completed");
    expect(payload.answer.outputLanguage).toBe("pl");
    expect(synthesizeAnswerMock).toHaveBeenCalledWith({
      question: "Dlaczego ten artykul zostal wybrany?",
      outputLanguage: "pl",
      brief,
      papers: [paper]
    });
  });

  it("returns 404 when the brief is missing", async () => {
    getBriefRepositoryMock.mockResolvedValueOnce({
      saveWithPapers: vi.fn(),
      getById: vi.fn().mockResolvedValue(null),
      list: vi.fn(),
      listSummaries: vi.fn(),
      clear: vi.fn()
    });

    const { POST } = await import("@/app/api/briefs/[id]/questions/route");
    const response = await POST(
      new Request("http://localhost/api/briefs/missing/questions", {
        method: "POST",
        body: JSON.stringify({
          question: "Why?"
        })
      }),
      { params: Promise.resolve({ id: "missing" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.status).toBe("error");
    expect(synthesizeAnswerMock).not.toHaveBeenCalled();
  });

  it("blocks questions for a brief owned by another private session", async () => {
    const brief = createBrief();
    const paper = createPaper();

    getBriefRepositoryMock.mockResolvedValueOnce({
      saveWithPapers: vi.fn(),
      getById: vi.fn().mockResolvedValue({
        brief,
        papers: [paper],
        createdAt: "2026-01-01T00:00:00.000Z",
        ownerSessionId: "brief_session_owner"
      }),
      list: vi.fn(),
      listSummaries: vi.fn(),
      clear: vi.fn()
    });

    const { POST } = await import("@/app/api/briefs/[id]/questions/route");
    const response = await POST(
      new Request("http://localhost/api/briefs/brief_1/questions", {
        method: "POST",
        headers: {
          cookie: `${BRIEF_HISTORY_SESSION_COOKIE}=brief_session_other`
        },
        body: JSON.stringify({
          question: "Why?"
        })
      }),
      { params: Promise.resolve({ id: "brief_1" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.status).toBe("forbidden");
    expect(synthesizeAnswerMock).not.toHaveBeenCalled();
  });

  it("blocks questions for a brief owned by another trusted user", async () => {
    const brief = createBrief();
    const paper = createPaper();

    getBriefRepositoryMock.mockResolvedValueOnce({
      saveWithPapers: vi.fn(),
      getById: vi.fn().mockResolvedValue({
        brief,
        papers: [paper],
        createdAt: "2026-01-01T00:00:00.000Z",
        ownerSessionId: null,
        ownerId: "user_alpha",
        workspaceId: "workspace_alpha",
        createdByUserId: "user_alpha",
        visibility: "workspace"
      }),
      list: vi.fn(),
      listSummaries: vi.fn(),
      clear: vi.fn()
    });

    const { POST } = await import("@/app/api/briefs/[id]/questions/route");
    const response = await POST(
      new Request("http://localhost/api/briefs/brief_1/questions", {
        method: "POST",
        headers: {
          "x-ai-brief-user-id": "user_beta",
          "x-ai-brief-workspace-id": "workspace_alpha"
        },
        body: JSON.stringify({
          question: "Why?"
        })
      }),
      { params: Promise.resolve({ id: "brief_1" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.status).toBe("forbidden");
    expect(synthesizeAnswerMock).not.toHaveBeenCalled();
  });

  it("blocks questions for a brief owned by another workspace", async () => {
    const brief = createBrief();
    const paper = createPaper();

    getBriefRepositoryMock.mockResolvedValueOnce({
      saveWithPapers: vi.fn(),
      getById: vi.fn().mockResolvedValue({
        brief,
        papers: [paper],
        createdAt: "2026-01-01T00:00:00.000Z",
        ownerSessionId: null,
        ownerId: "user_alpha",
        workspaceId: "workspace_alpha",
        createdByUserId: "user_alpha",
        visibility: "workspace"
      }),
      list: vi.fn(),
      listSummaries: vi.fn(),
      clear: vi.fn()
    });

    const { POST } = await import("@/app/api/briefs/[id]/questions/route");
    const response = await POST(
      new Request("http://localhost/api/briefs/brief_1/questions", {
        method: "POST",
        headers: {
          "x-ai-brief-user-id": "user_alpha",
          "x-ai-brief-workspace-id": "workspace_beta"
        },
        body: JSON.stringify({
          question: "Why?"
        })
      }),
      { params: Promise.resolve({ id: "brief_1" }) }
    );

    expect(response.status).toBe(403);
    expect(synthesizeAnswerMock).not.toHaveBeenCalled();
  });

  it("returns a controlled validation error when Q&A cannot be grounded", async () => {
    const brief = createBrief();
    const paper = createPaper();

    getBriefRepositoryMock.mockResolvedValueOnce({
      saveWithPapers: vi.fn(),
      getById: vi.fn().mockResolvedValue({
        brief,
        papers: [paper],
        createdAt: "2026-01-01T00:00:00.000Z"
      }),
      list: vi.fn(),
      listSummaries: vi.fn(),
      clear: vi.fn()
    });
    synthesizeAnswerMock.mockRejectedValueOnce(
      new Error(
        "Could not generate a valid grounded answer: answer claim is not supported by its evidence snippets"
      )
    );

    const { POST } = await import("@/app/api/briefs/[id]/questions/route");
    const response = await POST(
      new Request("http://localhost/api/briefs/brief_1/questions", {
        method: "POST",
        body: JSON.stringify({
          question: "Dlaczego?"
        })
      }),
      { params: Promise.resolve({ id: "brief_1" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.error).toContain("selected sources were not enough");
  });
});

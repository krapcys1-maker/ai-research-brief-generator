import { afterEach, describe, expect, it, vi } from "vitest";
import { BRIEF_HISTORY_SESSION_COOKIE } from "@/lib/briefs/session";
import { getBriefRepository as mockedGetBriefRepository } from "@/lib/storage/repository";
import { createBrief, createPaper } from "@/tests/fixtures";

vi.mock("@/lib/storage/repository", () => ({
  getBriefRepository: vi.fn()
}));

const getBriefRepositoryMock = vi.mocked(mockedGetBriefRepository);

function privateRecord() {
  return {
    brief: createBrief({ id: "brief_private" }),
    papers: [createPaper()],
    createdAt: "2026-01-01T00:00:00.000Z",
    ownerSessionId: "brief_session_owner"
  };
}

function repository(record = privateRecord()) {
  return {
    saveWithPapers: vi.fn(),
    getById: vi.fn().mockResolvedValue(record),
    list: vi.fn(),
    listSummaries: vi.fn(),
    clear: vi.fn()
  };
}

describe("private brief access", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns a private brief for the owning session", async () => {
    getBriefRepositoryMock.mockResolvedValueOnce(repository());

    const { GET } = await import("@/app/api/briefs/[id]/route");
    const response = await GET(
      new Request("http://localhost/api/briefs/brief_private", {
        headers: {
          cookie: `${BRIEF_HISTORY_SESSION_COOKIE}=brief_session_owner`
        }
      }),
      { params: Promise.resolve({ id: "brief_private" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.brief.id).toBe("brief_private");
  });

  it("blocks a private brief for another session", async () => {
    getBriefRepositoryMock.mockResolvedValueOnce(repository());

    const { GET } = await import("@/app/api/briefs/[id]/route");
    const response = await GET(
      new Request("http://localhost/api/briefs/brief_private", {
        headers: {
          cookie: `${BRIEF_HISTORY_SESSION_COOKIE}=brief_session_other`
        }
      }),
      { params: Promise.resolve({ id: "brief_private" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.status).toBe("forbidden");
  });

  it("allows explicitly public history to read private-session records", async () => {
    vi.stubEnv("PUBLIC_BRIEF_HISTORY_ENABLED", "true");
    getBriefRepositoryMock.mockResolvedValueOnce(repository());

    const { GET } = await import("@/app/api/briefs/[id]/route");
    const response = await GET(
      new Request("http://localhost/api/briefs/brief_private"),
      { params: Promise.resolve({ id: "brief_private" }) }
    );

    expect(response.status).toBe(200);
  });

  it("blocks markdown export for another session", async () => {
    getBriefRepositoryMock.mockResolvedValueOnce(repository());

    const { GET } = await import("@/app/api/export/[id]/route");
    const response = await GET(
      new Request("http://localhost/api/export/brief_private?format=markdown", {
        headers: {
          cookie: `${BRIEF_HISTORY_SESSION_COOKIE}=brief_session_other`
        }
      }),
      { params: Promise.resolve({ id: "brief_private" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.status).toBe("forbidden");
  });
});

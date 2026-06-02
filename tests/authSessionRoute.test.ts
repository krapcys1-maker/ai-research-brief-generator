import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAppSession as mockedResolveAppSession } from "@/lib/identity/appSession";

vi.mock("@/lib/identity/appSession", () => ({
  resolveAppSession: vi.fn()
}));

const resolveAppSessionMock = vi.mocked(mockedResolveAppSession);

describe("GET /api/auth/session", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns an anonymous session snapshot when no app session is resolved", async () => {
    resolveAppSessionMock.mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/auth/session/route");
    const response = await GET(new Request("http://localhost/api/auth/session"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(payload).toEqual({
      authenticated: false,
      user: null,
      workspace: null
    });
  });

  it("returns the authenticated user and workspace role", async () => {
    resolveAppSessionMock.mockResolvedValueOnce({
      sessionId: "session_alpha",
      userId: "user_alpha",
      email: "alpha@example.com",
      name: "Alpha",
      workspaceId: "workspace_alpha",
      workspaceRole: "admin",
      expiresAt: new Date("2026-06-03T00:00:00.000Z")
    });

    const { GET } = await import("@/app/api/auth/session/route");
    const response = await GET(new Request("http://localhost/api/auth/session"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      authenticated: true,
      user: {
        id: "user_alpha",
        email: "alpha@example.com",
        name: "Alpha"
      },
      workspace: {
        id: "workspace_alpha",
        role: "admin"
      },
      expiresAt: "2026-06-03T00:00:00.000Z"
    });
  });
});

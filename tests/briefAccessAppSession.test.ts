import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canAccessBrief,
  getBriefAccessContextForRequest,
  getBriefRateLimitKeyForRequest
} from "@/lib/briefs/access";
import { resolveAppSession as mockedResolveAppSession } from "@/lib/identity/appSession";

vi.mock("@/lib/identity/appSession", () => ({
  resolveAppSession: vi.fn()
}));

const resolveAppSessionMock = vi.mocked(mockedResolveAppSession);

describe("brief access with app-native sessions", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("uses resolved app sessions as user/workspace access context", async () => {
    resolveAppSessionMock.mockResolvedValueOnce({
      sessionId: "session_alpha",
      userId: "user_alpha",
      email: "alpha@example.com",
      name: "Alpha",
      workspaceId: "workspace_alpha",
      workspaceRole: "member",
      expiresAt: new Date("2026-06-03T00:00:00.000Z")
    });

    const access = await getBriefAccessContextForRequest(
      new Request("http://localhost/api/briefs")
    );

    expect(access).toMatchObject({
      scope: "user",
      ownerId: "user_alpha",
      workspaceId: "workspace_alpha",
      sessionId: null
    });
    expect(
      canAccessBrief(
        {
          ownerId: "user_alpha",
          workspaceId: "workspace_alpha",
          visibility: "workspace"
        },
        access
      )
    ).toBe(true);
    expect(
      canAccessBrief(
        {
          ownerId: "user_beta",
          workspaceId: "workspace_alpha",
          visibility: "workspace"
        },
        access
      )
    ).toBe(false);
  });

  it("uses app session identity for rate limiting", async () => {
    resolveAppSessionMock.mockResolvedValueOnce({
      sessionId: "session_alpha",
      userId: "user_alpha",
      email: "alpha@example.com",
      name: "Alpha",
      workspaceId: "workspace_alpha",
      workspaceRole: "owner",
      expiresAt: new Date("2026-06-03T00:00:00.000Z")
    });

    await expect(
      getBriefRateLimitKeyForRequest(
        "brief",
        new Request("http://localhost/api/briefs"),
        "203.0.113.10"
      )
    ).resolves.toBe("brief:workspace:workspace_alpha:user:user_alpha");
  });
});

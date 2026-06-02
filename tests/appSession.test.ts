import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appendAppSessionCookie,
  appendClearAppSessionCookie,
  APP_SESSION_COOKIE,
  createAppSessionToken,
  getAppSessionToken,
  hashAppSessionToken,
  resolveAppSession,
  type AppSessionRepository
} from "@/lib/identity/appSession";

function repository(
  overrides: Partial<AppSessionRepository> = {}
): AppSessionRepository {
  return {
    findSessionByTokenHash: vi.fn().mockResolvedValue(null),
    findWorkspaceMembership: vi.fn().mockResolvedValue(null),
    touchSession: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

function activeSession() {
  return {
    id: "session_alpha",
    userId: "user_alpha",
    workspaceId: "workspace_alpha",
    expiresAt: new Date("2026-06-03T00:00:00.000Z"),
    revokedAt: null,
    user: {
      id: "user_alpha",
      email: "alpha@example.com",
      name: "Alpha"
    }
  };
}

describe("app-native session runtime", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates opaque session tokens and hashes them before lookup", async () => {
    const token = createAppSessionToken();
    const tokenHash = hashAppSessionToken(token);

    expect(token).toMatch(/^app_session_/);
    expect(tokenHash).toHaveLength(64);
    expect(tokenHash).not.toContain(token);
    expect(hashAppSessionToken(token)).toBe(tokenHash);
  });

  it("reads bearer tokens before app session cookies", () => {
    const request = new Request("http://localhost/api/auth/session", {
      headers: {
        authorization: "Bearer token_from_header",
        cookie: `${APP_SESSION_COOKIE}=token_from_cookie`
      }
    });

    expect(getAppSessionToken(request)).toBe("token_from_header");
  });

  it("sets and clears secure app session cookies in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const headers = new Headers();

    appendAppSessionCookie(headers, "token_secret", 60);
    appendClearAppSessionCookie(headers);

    const cookies = headers.getSetCookie();
    expect(cookies[0]).toContain(`${APP_SESSION_COOKIE}=token_secret`);
    expect(cookies[0]).toContain("HttpOnly");
    expect(cookies[0]).toContain("Secure");
    expect(cookies[0]).toContain("Max-Age=60");
    expect(cookies[1]).toContain("Max-Age=0");
  });

  it("returns null when the request has no session token", async () => {
    const repo = repository();

    await expect(
      resolveAppSession(new Request("http://localhost/api/auth/session"), repo)
    ).resolves.toBeNull();
    expect(repo.findSessionByTokenHash).not.toHaveBeenCalled();
  });

  it("rejects expired and revoked sessions", async () => {
    const token = "app_session_test";
    const expiredRepo = repository({
      findSessionByTokenHash: vi.fn().mockResolvedValue({
        ...activeSession(),
        expiresAt: new Date("2026-06-01T00:00:00.000Z")
      })
    });
    const revokedRepo = repository({
      findSessionByTokenHash: vi.fn().mockResolvedValue({
        ...activeSession(),
        revokedAt: new Date("2026-06-02T00:00:00.000Z")
      })
    });
    const request = new Request("http://localhost/api/auth/session", {
      headers: {
        cookie: `${APP_SESSION_COOKIE}=${token}`
      }
    });

    await expect(
      resolveAppSession(request, expiredRepo, new Date("2026-06-02T00:00:00.000Z"))
    ).resolves.toBeNull();
    await expect(
      resolveAppSession(request, revokedRepo, new Date("2026-06-02T00:00:00.000Z"))
    ).resolves.toBeNull();
  });

  it("requires workspace membership for workspace-scoped sessions", async () => {
    const repo = repository({
      findSessionByTokenHash: vi.fn().mockResolvedValue(activeSession())
    });
    const request = new Request("http://localhost/api/auth/session", {
      headers: {
        cookie: `${APP_SESSION_COOKIE}=app_session_test`
      }
    });

    await expect(
      resolveAppSession(request, repo, new Date("2026-06-02T00:00:00.000Z"))
    ).resolves.toBeNull();
    expect(repo.touchSession).not.toHaveBeenCalled();
  });

  it("resolves active user/workspace sessions and updates lastSeenAt", async () => {
    const now = new Date("2026-06-02T12:00:00.000Z");
    const repo = repository({
      findSessionByTokenHash: vi.fn().mockResolvedValue(activeSession()),
      findWorkspaceMembership: vi.fn().mockResolvedValue({ role: "admin" })
    });
    const request = new Request("http://localhost/api/auth/session", {
      headers: {
        cookie: `${APP_SESSION_COOKIE}=app_session_test`
      }
    });

    const resolved = await resolveAppSession(request, repo, now);

    expect(resolved).toEqual({
      sessionId: "session_alpha",
      userId: "user_alpha",
      email: "alpha@example.com",
      name: "Alpha",
      workspaceId: "workspace_alpha",
      workspaceRole: "admin",
      expiresAt: new Date("2026-06-03T00:00:00.000Z")
    });
    expect(repo.touchSession).toHaveBeenCalledWith("session_alpha", now);
  });
});

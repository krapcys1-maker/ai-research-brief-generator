import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/storage/prismaClient";

export const APP_SESSION_COOKIE = "ai_brief_app_session";

export type AppWorkspaceRole = "owner" | "admin" | "member" | "viewer";

export type ResolvedAppSession = {
  sessionId: string;
  userId: string;
  email: string;
  name: string | null;
  workspaceId: string | null;
  workspaceRole: AppWorkspaceRole | null;
  expiresAt: Date;
};

type SessionRecord = {
  id: string;
  userId: string;
  workspaceId: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
};

type MembershipRecord = {
  role: AppWorkspaceRole;
};

export type AppSessionRepository = {
  findSessionByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
  findWorkspaceMembership(input: {
    userId: string;
    workspaceId: string;
  }): Promise<MembershipRecord | null>;
  touchSession(sessionId: string, seenAt: Date): Promise<void>;
};

export const prismaAppSessionRepository: AppSessionRepository = {
  async findSessionByTokenHash(tokenHash) {
    return prisma.userSession.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        workspaceId: true,
        expiresAt: true,
        revokedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });
  },
  async findWorkspaceMembership(input) {
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: input.workspaceId,
          userId: input.userId
        }
      },
      select: {
        role: true
      }
    });

    return membership
      ? { role: membership.role.toLowerCase() as AppWorkspaceRole }
      : null;
  },
  async touchSession(sessionId, seenAt) {
    await prisma.userSession.update({
      where: { id: sessionId },
      data: { lastSeenAt: seenAt }
    });
  }
};

function numberEnv(name: string, fallback: number) {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getAppSessionTtlSeconds() {
  return Math.round(numberEnv("APP_SESSION_TTL_DAYS", 30) * 24 * 60 * 60);
}

export function createAppSessionToken() {
  return `app_session_${randomBytes(32).toString("base64url")}`;
}

export function hashAppSessionToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function getCookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  const value = match?.split("=").slice(1).join("=");

  return value ? decodeURIComponent(value) : null;
}

export function getAppSessionToken(request: Request) {
  const bearer = request.headers.get("authorization")?.trim();

  if (bearer?.toLowerCase().startsWith("bearer ")) {
    const token = bearer.slice("bearer ".length).trim();
    return token || null;
  }

  return getCookieValue(request, APP_SESSION_COOKIE);
}

export function appendAppSessionCookie(
  headers: Headers,
  token: string,
  maxAgeSeconds = getAppSessionTtlSeconds()
) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  headers.append(
    "Set-Cookie",
    `${APP_SESSION_COOKIE}=${encodeURIComponent(
      token
    )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`
  );
}

export function appendClearAppSessionCookie(headers: Headers) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  headers.append(
    "Set-Cookie",
    `${APP_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
  );
}

export async function resolveAppSession(
  request: Request,
  repository: AppSessionRepository = prismaAppSessionRepository,
  now = new Date()
): Promise<ResolvedAppSession | null> {
  const token = getAppSessionToken(request);

  if (!token) {
    return null;
  }

  const record = await repository.findSessionByTokenHash(
    hashAppSessionToken(token)
  );

  if (!record || record.revokedAt || record.expiresAt <= now) {
    return null;
  }

  let workspaceRole: AppWorkspaceRole | null = null;

  if (record.workspaceId) {
    const membership = await repository.findWorkspaceMembership({
      userId: record.userId,
      workspaceId: record.workspaceId
    });

    if (!membership) {
      return null;
    }

    workspaceRole = membership.role;
  }

  await repository.touchSession(record.id, now);

  return {
    sessionId: record.id,
    userId: record.user.id,
    email: record.user.email,
    name: record.user.name,
    workspaceId: record.workspaceId,
    workspaceRole,
    expiresAt: record.expiresAt
  };
}

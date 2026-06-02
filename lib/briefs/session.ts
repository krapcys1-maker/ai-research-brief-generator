import { randomUUID } from "node:crypto";

export const BRIEF_HISTORY_SESSION_COOKIE = "ai_brief_history_session";

function numberEnv(name: string, fallback: number) {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getBriefHistorySessionTtlSeconds() {
  return Math.round(numberEnv("BRIEF_HISTORY_SESSION_TTL_DAYS", 30) * 24 * 60 * 60);
}

export function getBriefHistorySessionId(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${BRIEF_HISTORY_SESSION_COOKIE}=`));
  const value = match?.split("=").slice(1).join("=");

  return value ? decodeURIComponent(value) : null;
}

export function createBriefHistorySessionId() {
  return `brief_session_${randomUUID()}`;
}

export function getOrCreateBriefHistorySession(request: Request) {
  const existing = getBriefHistorySessionId(request);

  if (existing) {
    return {
      sessionId: existing,
      isNew: false
    };
  }

  return {
    sessionId: createBriefHistorySessionId(),
    isNew: true
  };
}

export function appendBriefHistorySessionCookie(
  headers: Headers,
  sessionId: string
) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  headers.append(
    "Set-Cookie",
    `${BRIEF_HISTORY_SESSION_COOKIE}=${encodeURIComponent(
      sessionId
    )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${getBriefHistorySessionTtlSeconds()}${secure}`
  );
}

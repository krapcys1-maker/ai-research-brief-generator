import { randomUUID } from "node:crypto";
import { getDocumentSessionTtlSeconds } from "@/lib/documents/privacy";

export const DOCUMENT_SESSION_COOKIE = "ai_brief_doc_session";

export function getDocumentSessionId(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${DOCUMENT_SESSION_COOKIE}=`));
  const value = match?.split("=").slice(1).join("=");

  return value ? decodeURIComponent(value) : null;
}

export function createDocumentSessionId() {
  return `doc_session_${randomUUID()}`;
}

export function getOrCreateDocumentSession(request: Request) {
  const existing = getDocumentSessionId(request);

  if (existing) {
    return {
      sessionId: existing,
      isNew: false
    };
  }

  return {
    sessionId: createDocumentSessionId(),
    isNew: true
  };
}

export function appendDocumentSessionCookie(
  headers: Headers,
  sessionId: string
) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  headers.append(
    "Set-Cookie",
    `${DOCUMENT_SESSION_COOKIE}=${encodeURIComponent(
      sessionId
    )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${getDocumentSessionTtlSeconds()}${secure}`
  );
}

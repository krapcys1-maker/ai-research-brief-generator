import type { DocumentSource } from "@/lib/documents/schemas";
import {
  appendDocumentSessionCookie,
  getOrCreateDocumentSession
} from "@/lib/documents/session";

export const DOCUMENT_AUTH_USER_HEADER = "x-ai-brief-user-id";
export const DOCUMENT_AUTH_WORKSPACE_HEADER = "x-ai-brief-workspace-id";

export type DocumentAccessContext = {
  source: DocumentSource;
  scope: "user" | "session";
  ownerId: string | null;
  workspaceId: string | null;
  sessionId: string | null;
  isNewSession: boolean;
};

export class DocumentAuthenticationError extends Error {
  constructor() {
    super(
      "Authenticated document ownership is required for this deployment. Send a trusted X-AI-Brief-User-Id header from your auth layer."
    );
  }
}

function booleanEnv(name: string) {
  const raw = process.env[name]?.trim().toLowerCase();

  if (!raw) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(raw);
}

function normalizeHeader(value: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 160) : null;
}

export function isDocumentAuthRequired() {
  return booleanEnv("DOCUMENT_AUTH_REQUIRED");
}

export function getDocumentAccessContext(request: Request): DocumentAccessContext {
  const ownerId = normalizeHeader(request.headers.get(DOCUMENT_AUTH_USER_HEADER));
  const workspaceId = normalizeHeader(
    request.headers.get(DOCUMENT_AUTH_WORKSPACE_HEADER)
  );

  if (ownerId) {
    return {
      source: {
        ownerId,
        workspaceId,
        sessionId: null
      },
      scope: "user",
      ownerId,
      workspaceId,
      sessionId: null,
      isNewSession: false
    };
  }

  if (isDocumentAuthRequired()) {
    throw new DocumentAuthenticationError();
  }

  const session = getOrCreateDocumentSession(request);

  return {
    source: {
      ownerId: null,
      workspaceId: null,
      sessionId: session.sessionId
    },
    scope: "session",
    ownerId: null,
    workspaceId: null,
    sessionId: session.sessionId,
    isNewSession: session.isNew
  };
}

export function appendDocumentAccessCookieIfNeeded(
  headers: Headers,
  access: DocumentAccessContext
) {
  if (access.scope === "session" && access.sessionId && access.isNewSession) {
    appendDocumentSessionCookie(headers, access.sessionId);
  }
}

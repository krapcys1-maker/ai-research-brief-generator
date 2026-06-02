import type { StoredBrief } from "@/lib/storage/types";
import {
  BRIEF_HISTORY_SESSION_COOKIE,
  getBriefHistorySessionId,
  getOrCreateBriefHistorySession
} from "@/lib/briefs/session";
import {
  DOCUMENT_AUTH_USER_HEADER,
  DOCUMENT_AUTH_WORKSPACE_HEADER
} from "@/lib/documents/access";
import { resolveAppSession } from "@/lib/identity/appSession";

type OwnerSessionScopedRecord = {
  ownerSessionId?: string | null;
  ownerId?: string | null;
  workspaceId?: string | null;
  visibility?: "private" | "workspace" | "public" | null;
};

export type BriefAccessContext = {
  source: {
    ownerSessionId?: string | null;
    ownerId?: string | null;
    workspaceId?: string | null;
  };
  scope: "user" | "session";
  ownerId: string | null;
  workspaceId: string | null;
  sessionId: string | null;
  isNewSession: boolean;
};

function isPublicBriefAccessExplicitlyEnabled() {
  return ["1", "true", "yes", "on"].includes(
    process.env.PUBLIC_BRIEF_HISTORY_ENABLED?.trim().toLowerCase() ?? ""
  );
}

function normalizeHeader(value: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 160) : null;
}

type HeaderGetter = {
  get(name: string): string | null | undefined;
};

export function getBriefTrustedIdentityFromHeaders(headers: HeaderGetter) {
  return {
    ownerId: normalizeHeader(headers.get(DOCUMENT_AUTH_USER_HEADER) ?? null),
    workspaceId: normalizeHeader(
      headers.get(DOCUMENT_AUTH_WORKSPACE_HEADER) ?? null
    )
  };
}

export function getBriefTrustedIdentity(request: Request) {
  return getBriefTrustedIdentityFromHeaders(request.headers);
}

export function getBriefUserAccessContext(
  ownerId: string,
  workspaceId: string | null
): BriefAccessContext {
  return {
    source: {
      ownerId,
      workspaceId
    },
    scope: "user",
    ownerId,
    workspaceId,
    sessionId: null,
    isNewSession: false
  };
}

export function getBriefAccessContext(request: Request): BriefAccessContext {
  const { ownerId, workspaceId } = getBriefTrustedIdentity(request);

  if (ownerId) {
    return getBriefUserAccessContext(ownerId, workspaceId);
  }

  const session = getOrCreateBriefHistorySession(request);

  return {
    source: {
      ownerSessionId: session.sessionId
    },
    scope: "session",
    ownerId: null,
    workspaceId: null,
    sessionId: session.sessionId,
    isNewSession: session.isNew
  };
}

export async function getBriefAccessContextForRequest(
  request: Request
): Promise<BriefAccessContext> {
  const appSession = await resolveAppSession(request);

  if (appSession) {
    return getBriefUserAccessContext(appSession.userId, appSession.workspaceId);
  }

  return getBriefAccessContext(request);
}

export function getBriefRateLimitKey(
  scope: string,
  request: Request,
  clientIp: string
) {
  const { ownerId, workspaceId } = getBriefTrustedIdentity(request);

  if (ownerId) {
    return `${scope}:workspace:${workspaceId ?? "personal"}:user:${ownerId}`;
  }

  return `${scope}:ip:${clientIp}`;
}

export async function getBriefRateLimitKeyForRequest(
  scope: string,
  request: Request,
  clientIp: string
) {
  const appSession = await resolveAppSession(request);

  if (appSession) {
    return `${scope}:workspace:${appSession.workspaceId ?? "personal"}:user:${appSession.userId}`;
  }

  return getBriefRateLimitKey(scope, request, clientIp);
}

function toAccessSource(
  access: string | null | BriefAccessContext
): BriefAccessContext["source"] {
  if (typeof access === "string" || access === null) {
    return {
      ownerSessionId: access
    };
  }

  return access.source;
}

export function canAccessBrief(
  record: OwnerSessionScopedRecord,
  access: string | null | BriefAccessContext
) {
  if (isPublicBriefAccessExplicitlyEnabled()) {
    return true;
  }

  if (record.visibility === "public") {
    return true;
  }

  const source = toAccessSource(access);

  if (record.ownerId) {
    if (record.workspaceId && record.workspaceId !== source.workspaceId) {
      return false;
    }

    return record.ownerId === source.ownerId;
  }

  if (record.workspaceId) {
    return record.workspaceId === source.workspaceId;
  }

  if (record.ownerSessionId) {
    return record.ownerSessionId === source.ownerSessionId;
  }

  return true;
}

export function canAccessBriefFromRequest(record: StoredBrief, request: Request) {
  const { ownerId } = getBriefTrustedIdentity(request);

  if (ownerId) {
    return canAccessBrief(record, getBriefAccessContext(request));
  }

  return canAccessBrief(record, getBriefHistorySessionId(request));
}

export async function canAccessBriefFromRequestAsync(
  record: StoredBrief,
  request: Request
) {
  const appSession = await resolveAppSession(request);

  if (appSession) {
    return canAccessBrief(record, getBriefUserAccessContext(
      appSession.userId,
      appSession.workspaceId
    ));
  }

  return canAccessBriefFromRequest(record, request);
}

export function getBriefHistorySessionFromCookieStore(
  cookieStore: { get(name: string): { value: string } | undefined }
) {
  return cookieStore.get(BRIEF_HISTORY_SESSION_COOKIE)?.value ?? null;
}

export function privateBriefError() {
  return {
    status: "forbidden",
    error:
      "This brief belongs to a different private browser session, user, or workspace."
  };
}

export function privateBriefJobError() {
  return {
    status: "forbidden",
    error:
      "This brief generation job belongs to a different private browser session, user, or workspace."
  };
}

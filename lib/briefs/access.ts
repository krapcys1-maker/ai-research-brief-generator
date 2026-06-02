import type { StoredBrief } from "@/lib/storage/types";
import {
  BRIEF_HISTORY_SESSION_COOKIE,
  getBriefHistorySessionId
} from "@/lib/briefs/session";

type OwnerSessionScopedRecord = {
  ownerSessionId?: string | null;
};

function isPublicBriefAccessExplicitlyEnabled() {
  return ["1", "true", "yes", "on"].includes(
    process.env.PUBLIC_BRIEF_HISTORY_ENABLED?.trim().toLowerCase() ?? ""
  );
}

export function canAccessBrief(
  record: OwnerSessionScopedRecord,
  sessionId: string | null
) {
  if (isPublicBriefAccessExplicitlyEnabled()) {
    return true;
  }

  if (!record.ownerSessionId) {
    return true;
  }

  return record.ownerSessionId === sessionId;
}

export function canAccessBriefFromRequest(record: StoredBrief, request: Request) {
  return canAccessBrief(record, getBriefHistorySessionId(request));
}

export function getBriefHistorySessionFromCookieStore(
  cookieStore: { get(name: string): { value: string } | undefined }
) {
  return cookieStore.get(BRIEF_HISTORY_SESSION_COOKIE)?.value ?? null;
}

export function privateBriefError() {
  return {
    status: "forbidden",
    error: "This brief belongs to a different private browser session."
  };
}

export function privateBriefJobError() {
  return {
    status: "forbidden",
    error: "This brief generation job belongs to a different private browser session."
  };
}

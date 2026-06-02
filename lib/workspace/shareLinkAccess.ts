import type { BriefAccessContext } from "@/lib/briefs/access";
import type {
  ShareLinkFilter,
  ShareLinkOwnership
} from "@/lib/workspace/shareLinkTypes";

export function shareLinkOwnershipFromAccess(
  access: BriefAccessContext,
  visibility?: ShareLinkOwnership["visibility"]
): Required<ShareLinkOwnership> {
  const requestedVisibility = visibility ?? "private";

  if (access.scope === "user") {
    const workspaceVisibility =
      requestedVisibility === "public"
        ? "public"
        : access.workspaceId
          ? "workspace"
          : "private";

    return {
      ownerSessionId: null,
      ownerId: access.ownerId,
      workspaceId: access.workspaceId,
      createdByUserId: access.ownerId,
      visibility: workspaceVisibility
    };
  }

  return {
    ownerSessionId: access.sessionId,
    ownerId: null,
    workspaceId: null,
    createdByUserId: null,
    visibility: requestedVisibility === "public" ? "public" : "private"
  };
}

export function shareLinkFilterFromAccess(
  access: BriefAccessContext
): ShareLinkFilter {
  const ownership = shareLinkOwnershipFromAccess(access);

  if (access.scope === "user") {
    return {
      ownerId: ownership.ownerId,
      workspaceId: ownership.workspaceId
    };
  }

  return {
    ownerSessionId: ownership.ownerSessionId
  };
}

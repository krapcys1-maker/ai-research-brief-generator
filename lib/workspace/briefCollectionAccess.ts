import type { BriefAccessContext } from "@/lib/briefs/access";
import type {
  BriefCollectionFilter,
  BriefCollectionOwnership
} from "@/lib/workspace/briefCollectionTypes";

export function briefCollectionOwnershipFromAccess(
  access: BriefAccessContext
): Required<BriefCollectionOwnership> {
  if (access.scope === "user") {
    return {
      ownerSessionId: null,
      ownerId: access.ownerId,
      workspaceId: access.workspaceId,
      createdByUserId: access.ownerId,
      visibility: access.workspaceId ? "workspace" : "private"
    };
  }

  return {
    ownerSessionId: access.sessionId,
    ownerId: null,
    workspaceId: null,
    createdByUserId: null,
    visibility: "private"
  };
}

export function briefCollectionFilterFromAccess(
  access: BriefAccessContext
): BriefCollectionFilter {
  const ownership = briefCollectionOwnershipFromAccess(access);

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

import type { BriefAccessContext } from "@/lib/briefs/access";
import type {
  ResearchProjectFilter,
  ResearchProjectOwnership
} from "@/lib/workspace/projectTypes";

export function researchProjectOwnershipFromAccess(
  access: BriefAccessContext
): Required<ResearchProjectOwnership> {
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

export function researchProjectFilterFromAccess(
  access: BriefAccessContext
): ResearchProjectFilter {
  const ownership = researchProjectOwnershipFromAccess(access);

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

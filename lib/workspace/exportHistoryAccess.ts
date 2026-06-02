import type { BriefAccessContext } from "@/lib/briefs/access";
import type {
  ExportHistoryFilter,
  ExportHistoryOwnership
} from "@/lib/workspace/exportHistoryTypes";

export function exportHistoryOwnershipFromAccess(
  access: BriefAccessContext
): Required<ExportHistoryOwnership> {
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

export function exportHistoryFilterFromAccess(
  access: BriefAccessContext
): ExportHistoryFilter {
  const ownership = exportHistoryOwnershipFromAccess(access);

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

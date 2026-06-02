import type { BriefAccessContext } from "@/lib/briefs/access";
import type {
  PaperNoteFilter,
  PaperNoteOwnership
} from "@/lib/workspace/paperNoteTypes";

export function paperNoteOwnershipFromAccess(
  access: BriefAccessContext
): Required<PaperNoteOwnership> {
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

export function paperNoteFilterFromAccess(
  access: BriefAccessContext
): PaperNoteFilter {
  const ownership = paperNoteOwnershipFromAccess(access);

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

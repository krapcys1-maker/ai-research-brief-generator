import type { DocumentAccessContext } from "@/lib/documents/access";
import type {
  DocumentCollectionFilter,
  DocumentCollectionOwnership
} from "@/lib/workspace/documentCollectionTypes";

export function documentCollectionOwnershipFromAccess(
  access: DocumentAccessContext
): Required<DocumentCollectionOwnership> {
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

export function documentCollectionFilterFromAccess(
  access: DocumentAccessContext
): DocumentCollectionFilter {
  const ownership = documentCollectionOwnershipFromAccess(access);

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

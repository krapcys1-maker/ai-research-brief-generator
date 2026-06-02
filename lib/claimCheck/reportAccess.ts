import type { DocumentAccessContext } from "@/lib/documents/access";
import type {
  CompareReportFilter,
  CompareReportOwnership
} from "@/lib/claimCheck/reportTypes";

type CompareReportRecord = CompareReportOwnership;

export function compareReportOwnershipFromAccess(
  access: DocumentAccessContext
): Required<CompareReportOwnership> {
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

export function compareReportFilterFromAccess(
  access: DocumentAccessContext
): CompareReportFilter {
  const ownership = compareReportOwnershipFromAccess(access);

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

export function canAccessCompareReport(
  report: CompareReportRecord,
  access: DocumentAccessContext
) {
  const ownership = compareReportOwnershipFromAccess(access);

  if (report.ownerId) {
    if (report.workspaceId && report.workspaceId !== ownership.workspaceId) {
      return false;
    }

    return report.ownerId === ownership.ownerId;
  }

  if (report.workspaceId) {
    return report.workspaceId === ownership.workspaceId;
  }

  if (report.ownerSessionId) {
    return report.ownerSessionId === ownership.ownerSessionId;
  }

  return false;
}

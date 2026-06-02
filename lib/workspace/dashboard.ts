import type { BriefAccessContext } from "@/lib/briefs/access";
import { compareReportFilterFromAccess } from "@/lib/claimCheck/reportAccess";
import { getCompareReportRepository } from "@/lib/claimCheck/reportRepository";
import type { CompareReportListItem } from "@/lib/claimCheck/reportTypes";
import type { DocumentAccessContext } from "@/lib/documents/access";
import type { UserDocument } from "@/lib/documents/schemas";
import { getDocumentRepository } from "@/lib/documents/repository";
import { researchProjectFilterFromAccess } from "@/lib/workspace/projectAccess";
import { getResearchProjectRepository } from "@/lib/workspace/projectRepository";
import type { ResearchProjectListItem } from "@/lib/workspace/projectTypes";
import { getBriefRepository } from "@/lib/storage/repository";
import type { BriefListItem } from "@/lib/storage/types";

export type WorkspaceDashboard = {
  scope: "user" | "session";
  briefScope: BriefAccessContext["scope"];
  documentScope: DocumentAccessContext["scope"];
  ownerId: string | null;
  workspaceId: string | null;
  totals: {
    briefs: number;
    documents: number;
    parsedDocuments: number;
    compareReports: number;
    researchProjects: number;
  };
  recentResearchProjects: ResearchProjectListItem[];
  recentBriefs: BriefListItem[];
  recentDocuments: UserDocument[];
  recentCompareReports: CompareReportListItem[];
};

function recent<T>(items: T[], limit = 5) {
  return items.slice(0, limit);
}

function combinedScope(
  briefAccess: BriefAccessContext,
  documentAccess: DocumentAccessContext
) {
  return briefAccess.scope === "user" || documentAccess.scope === "user"
    ? "user"
    : "session";
}

export async function getWorkspaceDashboard(input: {
  briefAccess: BriefAccessContext;
  documentAccess: DocumentAccessContext;
}): Promise<WorkspaceDashboard> {
  const [
    briefRepository,
    documentRepository,
    compareReportRepository,
    researchProjectRepository
  ] =
    await Promise.all([
      getBriefRepository(),
      getDocumentRepository(),
      getCompareReportRepository(),
      getResearchProjectRepository()
    ]);

  const [briefs, documents, compareReports, researchProjects] = await Promise.all([
    briefRepository.listSummaries(input.briefAccess.source),
    documentRepository.listDocuments(input.documentAccess.source),
    compareReportRepository.listSummaries(
      compareReportFilterFromAccess(input.documentAccess)
    ),
    researchProjectRepository.list(
      researchProjectFilterFromAccess(input.briefAccess)
    )
  ]);

  return {
    scope: combinedScope(input.briefAccess, input.documentAccess),
    briefScope: input.briefAccess.scope,
    documentScope: input.documentAccess.scope,
    ownerId: input.briefAccess.ownerId ?? input.documentAccess.ownerId,
    workspaceId: input.briefAccess.workspaceId ?? input.documentAccess.workspaceId,
    totals: {
      briefs: briefs.length,
      documents: documents.length,
      parsedDocuments: documents.filter((document) => document.status === "parsed")
        .length,
      compareReports: compareReports.length,
      researchProjects: researchProjects.length
    },
    recentResearchProjects: recent(researchProjects),
    recentBriefs: recent(briefs),
    recentDocuments: recent(documents),
    recentCompareReports: recent(compareReports)
  };
}

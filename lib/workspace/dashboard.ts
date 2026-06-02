import type { BriefAccessContext } from "@/lib/briefs/access";
import { briefCollectionFilterFromAccess } from "@/lib/workspace/briefCollectionAccess";
import { getBriefCollectionRepository } from "@/lib/workspace/briefCollectionRepository";
import type { BriefCollectionListItem } from "@/lib/workspace/briefCollectionTypes";
import { compareReportFilterFromAccess } from "@/lib/claimCheck/reportAccess";
import { getCompareReportRepository } from "@/lib/claimCheck/reportRepository";
import type { CompareReportListItem } from "@/lib/claimCheck/reportTypes";
import type { DocumentAccessContext } from "@/lib/documents/access";
import type { UserDocument } from "@/lib/documents/schemas";
import { getDocumentRepository } from "@/lib/documents/repository";
import { documentCollectionFilterFromAccess } from "@/lib/workspace/documentCollectionAccess";
import { getDocumentCollectionRepository } from "@/lib/workspace/documentCollectionRepository";
import type { DocumentCollectionListItem } from "@/lib/workspace/documentCollectionTypes";
import { exportHistoryFilterFromAccess } from "@/lib/workspace/exportHistoryAccess";
import { getExportHistoryRepository } from "@/lib/workspace/exportHistoryRepository";
import type { ExportHistoryListItem } from "@/lib/workspace/exportHistoryTypes";
import { paperNoteFilterFromAccess } from "@/lib/workspace/paperNoteAccess";
import { getPaperNoteRepository } from "@/lib/workspace/paperNoteRepository";
import type { PaperNoteListItem } from "@/lib/workspace/paperNoteTypes";
import { researchProjectFilterFromAccess } from "@/lib/workspace/projectAccess";
import { getResearchProjectRepository } from "@/lib/workspace/projectRepository";
import type { ResearchProjectListItem } from "@/lib/workspace/projectTypes";
import { shareLinkFilterFromAccess } from "@/lib/workspace/shareLinkAccess";
import { getShareLinkRepository } from "@/lib/workspace/shareLinkRepository";
import type { ShareLinkListItem } from "@/lib/workspace/shareLinkTypes";
import { getBriefRepository } from "@/lib/storage/repository";
import type { BriefListItem, StoredBrief } from "@/lib/storage/types";
import type { NormalizedPaper } from "@/lib/sources/types";

export type WorkspacePaperListItem = Pick<
  NormalizedPaper,
  "id" | "title" | "authors" | "year" | "source"
>;

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
    briefCollections: number;
    documentCollections: number;
    paperNotes: number;
    shareLinks: number;
    exportHistory: number;
  };
  recentResearchProjects: ResearchProjectListItem[];
  recentBriefCollections: BriefCollectionListItem[];
  recentDocumentCollections: DocumentCollectionListItem[];
  recentExportHistory: ExportHistoryListItem[];
  recentPaperNotes: PaperNoteListItem[];
  recentShareLinks: ShareLinkListItem[];
  recentPapers: WorkspacePaperListItem[];
  recentBriefs: BriefListItem[];
  recentDocuments: UserDocument[];
  recentCompareReports: CompareReportListItem[];
};

function recent<T>(items: T[], limit = 5) {
  return items.slice(0, limit);
}

function recentUniquePapers(briefs: StoredBrief[], limit = 8): WorkspacePaperListItem[] {
  const papers = new Map<string, WorkspacePaperListItem>();

  for (const brief of briefs) {
    for (const paper of brief.papers) {
      if (!papers.has(paper.id)) {
        papers.set(paper.id, {
          id: paper.id,
          title: paper.title,
          authors: paper.authors,
          year: paper.year,
          source: paper.source
        });
      }
    }
  }

  return [...papers.values()].slice(0, limit);
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
    researchProjectRepository,
    briefCollectionRepository,
    documentCollectionRepository,
    exportHistoryRepository,
    paperNoteRepository,
    shareLinkRepository
  ] =
    await Promise.all([
      getBriefRepository(),
      getDocumentRepository(),
      getCompareReportRepository(),
      getResearchProjectRepository(),
      getBriefCollectionRepository(),
      getDocumentCollectionRepository(),
      getExportHistoryRepository(),
      getPaperNoteRepository(),
      getShareLinkRepository()
    ]);

  const [
    briefs,
    briefRecords,
    documents,
    compareReports,
    researchProjects,
    briefCollections,
    documentCollections,
    exportHistory,
    paperNotes,
    shareLinks
  ] = await Promise.all([
    briefRepository.listSummaries(input.briefAccess.source),
    briefRepository.list(input.briefAccess.source),
    documentRepository.listDocuments(input.documentAccess.source),
    compareReportRepository.listSummaries(
      compareReportFilterFromAccess(input.documentAccess)
    ),
    researchProjectRepository.list(
      researchProjectFilterFromAccess(input.briefAccess)
    ),
    briefCollectionRepository.list(
      briefCollectionFilterFromAccess(input.briefAccess)
    ),
    documentCollectionRepository.list(
      documentCollectionFilterFromAccess(input.documentAccess)
    ),
    exportHistoryRepository.list(
      exportHistoryFilterFromAccess(input.briefAccess)
    ),
    paperNoteRepository.list(
      paperNoteFilterFromAccess(input.briefAccess)
    ),
    shareLinkRepository.list(
      shareLinkFilterFromAccess(input.briefAccess)
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
      researchProjects: researchProjects.length,
      briefCollections: briefCollections.length,
      documentCollections: documentCollections.length,
      paperNotes: paperNotes.length,
      shareLinks: shareLinks.length,
      exportHistory: exportHistory.length
    },
    recentResearchProjects: recent(researchProjects),
    recentBriefCollections: recent(briefCollections),
    recentDocumentCollections: recent(documentCollections),
    recentExportHistory: recent(exportHistory),
    recentPaperNotes: recent(paperNotes),
    recentShareLinks: recent(shareLinks),
    recentPapers: recentUniquePapers(briefRecords),
    recentBriefs: recent(briefs),
    recentDocuments: recent(documents),
    recentCompareReports: recent(compareReports)
  };
}

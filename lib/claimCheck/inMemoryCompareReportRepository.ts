import type {
  CompareReportFilter,
  CompareReportListItem,
  CompareReportRepository,
  SaveCompareReportInput,
  StoredCompareReport
} from "@/lib/claimCheck/reportTypes";

const globalForCompareReports = globalThis as typeof globalThis & {
  __compareReports?: Map<string, StoredCompareReport>;
};

const reports =
  globalForCompareReports.__compareReports ?? new Map<string, StoredCompareReport>();

globalForCompareReports.__compareReports = reports;

function nowIso() {
  return new Date().toISOString();
}

function toStored(input: SaveCompareReportInput): StoredCompareReport {
  const timestamp = nowIso();

  return {
    id: input.report.id,
    title: input.report.title,
    summary: input.report.summary,
    sourceDocumentId: input.report.sourceDocumentId ?? null,
    claimCount: input.report.items.length,
    ownerSessionId: input.ownerSessionId ?? null,
    ownerId: input.ownerId ?? null,
    workspaceId: input.workspaceId ?? null,
    createdByUserId: input.createdByUserId ?? null,
    visibility: input.visibility ?? "private",
    request: input.request,
    report: input.report,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function toListItem(report: StoredCompareReport): CompareReportListItem {
  return {
    id: report.id,
    title: report.title,
    summary: report.summary,
    sourceDocumentId: report.sourceDocumentId,
    claimCount: report.claimCount,
    ownerSessionId: report.ownerSessionId,
    ownerId: report.ownerId,
    workspaceId: report.workspaceId,
    createdByUserId: report.createdByUserId,
    visibility: report.visibility,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt
  };
}

function matchesFilter(report: StoredCompareReport, filter?: CompareReportFilter) {
  if (!filter) {
    return true;
  }

  return (
    ("ownerSessionId" in filter
      ? report.ownerSessionId === (filter.ownerSessionId ?? null)
      : true) &&
    ("ownerId" in filter ? report.ownerId === (filter.ownerId ?? null) : true) &&
    ("workspaceId" in filter
      ? report.workspaceId === (filter.workspaceId ?? null)
      : true) &&
    ("createdByUserId" in filter
      ? report.createdByUserId === (filter.createdByUserId ?? null)
      : true) &&
    ("visibility" in filter
      ? report.visibility === (filter.visibility ?? "private")
      : true)
  );
}

export const inMemoryCompareReportRepository: CompareReportRepository = {
  async save(input) {
    const report = toStored(input);
    reports.set(report.id, report);
    return report;
  },

  async getById(id) {
    return reports.get(id) ?? null;
  },

  async listSummaries(filter) {
    return [...reports.values()]
      .filter((report) => matchesFilter(report, filter))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toListItem);
  },

  async clear() {
    reports.clear();
  }
};

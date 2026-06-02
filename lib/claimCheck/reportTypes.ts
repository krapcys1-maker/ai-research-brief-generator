import type {
  ClaimCheckReport,
  ClaimCheckRequest
} from "@/lib/claimCheck/schemas";
import type { BriefVisibility } from "@/lib/storage/types";

export type CompareReportOwnership = {
  ownerSessionId?: string | null;
  ownerId?: string | null;
  workspaceId?: string | null;
  createdByUserId?: string | null;
  visibility?: BriefVisibility;
};

export type SaveCompareReportInput = CompareReportOwnership & {
  request: ClaimCheckRequest;
  report: ClaimCheckReport;
};

export type StoredCompareReport = Required<CompareReportOwnership> & {
  id: string;
  title: string;
  summary: string;
  sourceDocumentId: string | null;
  claimCount: number;
  request: ClaimCheckRequest;
  report: ClaimCheckReport;
  createdAt: string;
  updatedAt: string;
};

export type CompareReportListItem = Required<CompareReportOwnership> & {
  id: string;
  title: string;
  summary: string;
  sourceDocumentId: string | null;
  claimCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CompareReportFilter = CompareReportOwnership;

export type CompareReportRepository = {
  save(input: SaveCompareReportInput): Promise<StoredCompareReport>;
  getById(id: string): Promise<StoredCompareReport | null>;
  listSummaries(filter?: CompareReportFilter): Promise<CompareReportListItem[]>;
  clear(): Promise<void>;
};

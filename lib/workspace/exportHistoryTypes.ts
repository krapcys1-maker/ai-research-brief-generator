import type { BriefVisibility } from "@/lib/storage/types";

export type ExportHistoryResourceType = "brief";

export type ExportHistoryOwnership = {
  ownerSessionId?: string | null;
  ownerId?: string | null;
  workspaceId?: string | null;
  createdByUserId?: string | null;
  visibility?: BriefVisibility;
};

export type SaveExportHistoryInput = ExportHistoryOwnership & {
  resourceType: ExportHistoryResourceType;
  resourceId: string;
  title: string;
  format: "markdown";
  filename: string;
};

export type StoredExportHistory = Required<ExportHistoryOwnership> & {
  id: string;
  resourceType: ExportHistoryResourceType;
  resourceId: string;
  title: string;
  format: "markdown";
  filename: string;
  exportedAt: string;
  createdAt: string;
};

export type ExportHistoryListItem = StoredExportHistory;

export type ExportHistoryFilter = ExportHistoryOwnership & {
  resourceType?: ExportHistoryResourceType;
  resourceId?: string;
  format?: "markdown";
};

export type ExportHistoryRepository = {
  save(input: SaveExportHistoryInput): Promise<StoredExportHistory>;
  list(filter?: ExportHistoryFilter): Promise<ExportHistoryListItem[]>;
  clear(): Promise<void>;
};

import { randomUUID } from "node:crypto";
import type {
  ExportHistoryFilter,
  ExportHistoryRepository,
  SaveExportHistoryInput,
  StoredExportHistory
} from "@/lib/workspace/exportHistoryTypes";

const globalForExportHistory = globalThis as typeof globalThis & {
  __exportHistory?: Map<string, StoredExportHistory>;
};

const exportRecords =
  globalForExportHistory.__exportHistory ??
  new Map<string, StoredExportHistory>();

globalForExportHistory.__exportHistory = exportRecords;

function matchesFilter(item: StoredExportHistory, filter?: ExportHistoryFilter) {
  if (!filter) {
    return true;
  }

  if (
    "ownerSessionId" in filter &&
    (item.ownerSessionId ?? null) !== (filter.ownerSessionId ?? null)
  ) {
    return false;
  }

  if ("ownerId" in filter && item.ownerId !== (filter.ownerId ?? null)) {
    return false;
  }

  if (
    "workspaceId" in filter &&
    item.workspaceId !== (filter.workspaceId ?? null)
  ) {
    return false;
  }

  if (
    "createdByUserId" in filter &&
    item.createdByUserId !== (filter.createdByUserId ?? null)
  ) {
    return false;
  }

  if ("visibility" in filter && item.visibility !== filter.visibility) {
    return false;
  }

  if ("resourceType" in filter && item.resourceType !== filter.resourceType) {
    return false;
  }

  if ("resourceId" in filter && item.resourceId !== filter.resourceId) {
    return false;
  }

  if ("format" in filter && item.format !== filter.format) {
    return false;
  }

  return true;
}

export const inMemoryExportHistoryRepository: ExportHistoryRepository = {
  async save(input: SaveExportHistoryInput) {
    const now = new Date().toISOString();
    const item: StoredExportHistory = {
      id: `export_history_${randomUUID()}`,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      title: input.title,
      format: input.format,
      filename: input.filename,
      ownerSessionId: input.ownerSessionId ?? null,
      ownerId: input.ownerId ?? null,
      workspaceId: input.workspaceId ?? null,
      createdByUserId: input.createdByUserId ?? null,
      visibility: input.visibility ?? "private",
      exportedAt: now,
      createdAt: now
    };

    exportRecords.set(item.id, item);
    return item;
  },

  async list(filter) {
    return [...exportRecords.values()]
      .filter((item) => matchesFilter(item, filter))
      .sort((a, b) => b.exportedAt.localeCompare(a.exportedAt));
  },

  async clear() {
    exportRecords.clear();
  }
};

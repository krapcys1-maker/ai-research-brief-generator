import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/storage/prismaClient";
import type {
  ExportHistoryFilter,
  ExportHistoryListItem,
  ExportHistoryRepository,
  ExportHistoryResourceType,
  SaveExportHistoryInput,
  StoredExportHistory
} from "@/lib/workspace/exportHistoryTypes";

type ExportHistoryRow = {
  id: string;
  ownerSessionId: string | null;
  ownerId: string | null;
  workspaceId: string | null;
  createdByUserId: string | null;
  visibility: string;
  resourceType: string;
  resourceId: string;
  title: string;
  format: string;
  filename: string;
  exportedAt: Date;
  createdAt: Date;
};

function visibility(value: string) {
  return value === "workspace" || value === "public" ? value : "private";
}

function resourceType(value: string): ExportHistoryResourceType {
  if (value !== "brief") {
    throw new Error(`Unsupported export history resource type: ${value}`);
  }

  return value;
}

function format(value: string): "markdown" {
  if (value !== "markdown") {
    throw new Error(`Unsupported export history format: ${value}`);
  }

  return value;
}

function toStored(row: ExportHistoryRow): StoredExportHistory {
  return {
    id: row.id,
    ownerSessionId: row.ownerSessionId,
    ownerId: row.ownerId,
    workspaceId: row.workspaceId,
    createdByUserId: row.createdByUserId,
    visibility: visibility(row.visibility),
    resourceType: resourceType(row.resourceType),
    resourceId: row.resourceId,
    title: row.title,
    format: format(row.format),
    filename: row.filename,
    exportedAt: row.exportedAt.toISOString(),
    createdAt: row.createdAt.toISOString()
  };
}

function filterSql(filter?: ExportHistoryFilter) {
  const conditions: Prisma.Sql[] = [];

  if (!filter) {
    return Prisma.empty;
  }

  if ("ownerSessionId" in filter) {
    conditions.push(
      Prisma.sql`"ownerSessionId" = ${filter.ownerSessionId ?? null}`
    );
  }
  if ("ownerId" in filter) {
    conditions.push(Prisma.sql`"ownerId" = ${filter.ownerId ?? null}`);
  }
  if ("workspaceId" in filter) {
    conditions.push(Prisma.sql`"workspaceId" = ${filter.workspaceId ?? null}`);
  }
  if ("createdByUserId" in filter) {
    conditions.push(
      Prisma.sql`"createdByUserId" = ${filter.createdByUserId ?? null}`
    );
  }
  if ("visibility" in filter) {
    conditions.push(Prisma.sql`"visibility" = ${filter.visibility ?? "private"}`);
  }
  if ("resourceType" in filter) {
    conditions.push(Prisma.sql`"resourceType" = ${filter.resourceType}`);
  }
  if ("resourceId" in filter) {
    conditions.push(Prisma.sql`"resourceId" = ${filter.resourceId}`);
  }
  if ("format" in filter) {
    conditions.push(Prisma.sql`"format" = ${filter.format}`);
  }

  return conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;
}

export const prismaExportHistoryRepository: ExportHistoryRepository = {
  async save(input: SaveExportHistoryInput) {
    const rows = await prisma.$queryRaw<ExportHistoryRow[]>`
      INSERT INTO "ExportHistory" (
        "id",
        "ownerSessionId",
        "ownerId",
        "workspaceId",
        "createdByUserId",
        "visibility",
        "resourceType",
        "resourceId",
        "title",
        "format",
        "filename"
      )
      VALUES (
        ${`export_history_${randomUUID()}`},
        ${input.ownerSessionId ?? null},
        ${input.ownerId ?? null},
        ${input.workspaceId ?? null},
        ${input.createdByUserId ?? null},
        ${input.visibility ?? "private"}::"BriefVisibility",
        ${input.resourceType},
        ${input.resourceId},
        ${input.title},
        ${input.format},
        ${input.filename}
      )
      RETURNING *
    `;

    const row = rows[0];
    if (!row) {
      throw new Error("Export history entry was not saved.");
    }

    return toStored(row);
  },

  async list(filter): Promise<ExportHistoryListItem[]> {
    const where = filterSql(filter);
    const rows = await prisma.$queryRaw<ExportHistoryRow[]>`
      SELECT *
      FROM "ExportHistory"
      ${where}
      ORDER BY "exportedAt" DESC
    `;

    return rows.map(toStored);
  },

  async clear() {
    await prisma.$executeRaw`DELETE FROM "ExportHistory"`;
  }
};

import { Prisma } from "@prisma/client";
import {
  ClaimCheckReportSchema,
  ClaimCheckRequestSchema
} from "@/lib/claimCheck/schemas";
import type {
  CompareReportFilter,
  CompareReportListItem,
  CompareReportRepository,
  SaveCompareReportInput,
  StoredCompareReport
} from "@/lib/claimCheck/reportTypes";
import { prisma } from "@/lib/storage/prismaClient";

type CompareReportRow = {
  id: string;
  ownerSessionId: string | null;
  ownerId: string | null;
  workspaceId: string | null;
  createdByUserId: string | null;
  visibility: string;
  title: string;
  summary: string;
  sourceDocumentId: string | null;
  claimCount: number;
  requestJson: Prisma.JsonValue;
  reportJson: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
};

type CompareReportSummaryRow = Omit<
  CompareReportRow,
  "requestJson" | "reportJson"
>;

function visibility(value: string) {
  return value === "workspace" || value === "public" ? value : "private";
}

function toStored(row: CompareReportRow): StoredCompareReport {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    sourceDocumentId: row.sourceDocumentId,
    claimCount: row.claimCount,
    ownerSessionId: row.ownerSessionId,
    ownerId: row.ownerId,
    workspaceId: row.workspaceId,
    createdByUserId: row.createdByUserId,
    visibility: visibility(row.visibility),
    request: ClaimCheckRequestSchema.parse(row.requestJson),
    report: ClaimCheckReportSchema.parse(row.reportJson),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function toListItem(row: CompareReportSummaryRow): CompareReportListItem {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    sourceDocumentId: row.sourceDocumentId,
    claimCount: row.claimCount,
    ownerSessionId: row.ownerSessionId,
    ownerId: row.ownerId,
    workspaceId: row.workspaceId,
    createdByUserId: row.createdByUserId,
    visibility: visibility(row.visibility),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function filterSql(filter?: CompareReportFilter) {
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

  return conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
    : Prisma.empty;
}

export const prismaCompareReportRepository: CompareReportRepository = {
  async save(input: SaveCompareReportInput) {
    const rows = await prisma.$queryRaw<CompareReportRow[]>`
      INSERT INTO "CompareReport" (
        "id",
        "ownerSessionId",
        "ownerId",
        "workspaceId",
        "createdByUserId",
        "visibility",
        "title",
        "summary",
        "sourceDocumentId",
        "claimCount",
        "requestJson",
        "reportJson",
        "updatedAt"
      )
      VALUES (
        ${input.report.id},
        ${input.ownerSessionId ?? null},
        ${input.ownerId ?? null},
        ${input.workspaceId ?? null},
        ${input.createdByUserId ?? null},
        ${input.visibility ?? "private"}::"BriefVisibility",
        ${input.report.title},
        ${input.report.summary},
        ${input.report.sourceDocumentId ?? null},
        ${input.report.items.length},
        ${input.request as unknown as Prisma.JsonObject}::jsonb,
        ${input.report as unknown as Prisma.JsonObject}::jsonb,
        NOW()
      )
      ON CONFLICT ("id") DO UPDATE SET
        "ownerSessionId" = EXCLUDED."ownerSessionId",
        "ownerId" = EXCLUDED."ownerId",
        "workspaceId" = EXCLUDED."workspaceId",
        "createdByUserId" = EXCLUDED."createdByUserId",
        "visibility" = EXCLUDED."visibility",
        "title" = EXCLUDED."title",
        "summary" = EXCLUDED."summary",
        "sourceDocumentId" = EXCLUDED."sourceDocumentId",
        "claimCount" = EXCLUDED."claimCount",
        "requestJson" = EXCLUDED."requestJson",
        "reportJson" = EXCLUDED."reportJson",
        "updatedAt" = NOW()
      RETURNING *
    `;

    const row = rows[0];
    if (!row) {
      throw new Error("Compare report was not saved.");
    }

    return toStored(row);
  },

  async getById(id) {
    const rows = await prisma.$queryRaw<CompareReportRow[]>`
      SELECT * FROM "CompareReport" WHERE "id" = ${id} LIMIT 1
    `;

    return rows[0] ? toStored(rows[0]) : null;
  },

  async listSummaries(filter) {
    const where = filterSql(filter);
    const rows = await prisma.$queryRaw<CompareReportSummaryRow[]>`
      SELECT
        "id",
        "ownerSessionId",
        "ownerId",
        "workspaceId",
        "createdByUserId",
        "visibility",
        "title",
        "summary",
        "sourceDocumentId",
        "claimCount",
        "createdAt",
        "updatedAt"
      FROM "CompareReport"
      ${where}
      ORDER BY "createdAt" DESC
    `;

    return rows.map(toListItem);
  },

  async clear() {
    await prisma.$executeRaw`DELETE FROM "CompareReport"`;
  }
};

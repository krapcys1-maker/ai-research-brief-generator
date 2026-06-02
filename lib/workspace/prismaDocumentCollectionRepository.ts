import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/storage/prismaClient";
import type {
  DocumentCollectionFilter,
  DocumentCollectionListItem,
  DocumentCollectionRepository,
  SaveDocumentCollectionInput,
  StoredDocumentCollection
} from "@/lib/workspace/documentCollectionTypes";

type DocumentCollectionRow = {
  id: string;
  ownerSessionId: string | null;
  ownerId: string | null;
  workspaceId: string | null;
  createdByUserId: string | null;
  visibility: string;
  title: string;
  description: string | null;
  documentIdsJson: Prisma.JsonValue;
  documentCount: number;
  createdAt: Date;
  updatedAt: Date;
};

function visibility(value: string) {
  return value === "workspace" || value === "public" ? value : "private";
}

function stringArray(value: Prisma.JsonValue) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function toStored(row: DocumentCollectionRow): StoredDocumentCollection {
  return {
    id: row.id,
    ownerSessionId: row.ownerSessionId,
    ownerId: row.ownerId,
    workspaceId: row.workspaceId,
    createdByUserId: row.createdByUserId,
    visibility: visibility(row.visibility),
    title: row.title,
    description: row.description,
    documentIds: stringArray(row.documentIdsJson),
    documentCount: row.documentCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function filterSql(filter?: DocumentCollectionFilter) {
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

export const prismaDocumentCollectionRepository: DocumentCollectionRepository = {
  async save(input: SaveDocumentCollectionInput) {
    const documentIds = [...new Set(input.documentIds)];
    const rows = await prisma.$queryRaw<DocumentCollectionRow[]>`
      INSERT INTO "DocumentCollection" (
        "id",
        "ownerSessionId",
        "ownerId",
        "workspaceId",
        "createdByUserId",
        "visibility",
        "title",
        "description",
        "documentIdsJson",
        "documentCount",
        "updatedAt"
      )
      VALUES (
        ${`document_collection_${randomUUID()}`},
        ${input.ownerSessionId ?? null},
        ${input.ownerId ?? null},
        ${input.workspaceId ?? null},
        ${input.createdByUserId ?? null},
        ${input.visibility ?? "private"}::"BriefVisibility",
        ${input.title},
        ${input.description ?? null},
        ${documentIds as unknown as Prisma.JsonArray}::jsonb,
        ${documentIds.length},
        NOW()
      )
      RETURNING *
    `;

    const row = rows[0];
    if (!row) {
      throw new Error("Document collection was not saved.");
    }

    return toStored(row);
  },

  async list(filter): Promise<DocumentCollectionListItem[]> {
    const where = filterSql(filter);
    const rows = await prisma.$queryRaw<DocumentCollectionRow[]>`
      SELECT *
      FROM "DocumentCollection"
      ${where}
      ORDER BY "createdAt" DESC
    `;

    return rows.map(toStored);
  },

  async clear() {
    await prisma.$executeRaw`DELETE FROM "DocumentCollection"`;
  }
};

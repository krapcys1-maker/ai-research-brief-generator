import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/storage/prismaClient";
import type {
  BriefCollectionFilter,
  BriefCollectionListItem,
  BriefCollectionRepository,
  SaveBriefCollectionInput,
  StoredBriefCollection
} from "@/lib/workspace/briefCollectionTypes";

type BriefCollectionRow = {
  id: string;
  ownerSessionId: string | null;
  ownerId: string | null;
  workspaceId: string | null;
  createdByUserId: string | null;
  visibility: string;
  title: string;
  description: string | null;
  briefIdsJson: Prisma.JsonValue;
  briefCount: number;
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

function toStored(row: BriefCollectionRow): StoredBriefCollection {
  return {
    id: row.id,
    ownerSessionId: row.ownerSessionId,
    ownerId: row.ownerId,
    workspaceId: row.workspaceId,
    createdByUserId: row.createdByUserId,
    visibility: visibility(row.visibility),
    title: row.title,
    description: row.description,
    briefIds: stringArray(row.briefIdsJson),
    briefCount: row.briefCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function filterSql(filter?: BriefCollectionFilter) {
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

export const prismaBriefCollectionRepository: BriefCollectionRepository = {
  async save(input: SaveBriefCollectionInput) {
    const briefIds = [...new Set(input.briefIds)];
    const rows = await prisma.$queryRaw<BriefCollectionRow[]>`
      INSERT INTO "BriefCollection" (
        "id",
        "ownerSessionId",
        "ownerId",
        "workspaceId",
        "createdByUserId",
        "visibility",
        "title",
        "description",
        "briefIdsJson",
        "briefCount",
        "updatedAt"
      )
      VALUES (
        ${`brief_collection_${randomUUID()}`},
        ${input.ownerSessionId ?? null},
        ${input.ownerId ?? null},
        ${input.workspaceId ?? null},
        ${input.createdByUserId ?? null},
        ${input.visibility ?? "private"}::"BriefVisibility",
        ${input.title},
        ${input.description ?? null},
        ${briefIds as unknown as Prisma.JsonArray}::jsonb,
        ${briefIds.length},
        NOW()
      )
      RETURNING *
    `;

    const row = rows[0];
    if (!row) {
      throw new Error("Brief collection was not saved.");
    }

    return toStored(row);
  },

  async list(filter): Promise<BriefCollectionListItem[]> {
    const where = filterSql(filter);
    const rows = await prisma.$queryRaw<BriefCollectionRow[]>`
      SELECT *
      FROM "BriefCollection"
      ${where}
      ORDER BY "createdAt" DESC
    `;

    return rows.map(toStored);
  },

  async clear() {
    await prisma.$executeRaw`DELETE FROM "BriefCollection"`;
  }
};

import { randomBytes, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/storage/prismaClient";
import type {
  SaveShareLinkInput,
  ShareLinkFilter,
  ShareLinkListItem,
  ShareLinkRepository,
  ShareLinkResourceType,
  StoredShareLink
} from "@/lib/workspace/shareLinkTypes";

type ShareLinkRow = {
  id: string;
  token: string;
  ownerSessionId: string | null;
  ownerId: string | null;
  workspaceId: string | null;
  createdByUserId: string | null;
  visibility: string;
  resourceType: string;
  resourceId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
};

function token() {
  return randomBytes(16).toString("base64url");
}

function visibility(value: string) {
  return value === "workspace" || value === "public" ? value : "private";
}

function resourceType(value: string): ShareLinkResourceType {
  if (value !== "brief") {
    throw new Error(`Unsupported share link resource type: ${value}`);
  }

  return value;
}

function toStored(row: ShareLinkRow): StoredShareLink {
  return {
    id: row.id,
    token: row.token,
    ownerSessionId: row.ownerSessionId,
    ownerId: row.ownerId,
    workspaceId: row.workspaceId,
    createdByUserId: row.createdByUserId,
    visibility: visibility(row.visibility),
    resourceType: resourceType(row.resourceType),
    resourceId: row.resourceId,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null
  };
}

function filterSql(filter?: ShareLinkFilter) {
  const conditions: Prisma.Sql[] = [Prisma.sql`"revokedAt" IS NULL`];

  if (!filter) {
    return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
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

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}

export const prismaShareLinkRepository: ShareLinkRepository = {
  async save(input: SaveShareLinkInput) {
    const rows = await prisma.$queryRaw<ShareLinkRow[]>`
      INSERT INTO "ShareLink" (
        "id",
        "token",
        "ownerSessionId",
        "ownerId",
        "workspaceId",
        "createdByUserId",
        "visibility",
        "resourceType",
        "resourceId",
        "title",
        "updatedAt"
      )
      VALUES (
        ${`share_link_${randomUUID()}`},
        ${token()},
        ${input.ownerSessionId ?? null},
        ${input.ownerId ?? null},
        ${input.workspaceId ?? null},
        ${input.createdByUserId ?? null},
        ${input.visibility ?? "private"}::"BriefVisibility",
        ${input.resourceType},
        ${input.resourceId},
        ${input.title},
        NOW()
      )
      RETURNING *
    `;

    const row = rows[0];
    if (!row) {
      throw new Error("Share link was not saved.");
    }

    return toStored(row);
  },

  async list(filter): Promise<ShareLinkListItem[]> {
    const where = filterSql(filter);
    const rows = await prisma.$queryRaw<ShareLinkRow[]>`
      SELECT *
      FROM "ShareLink"
      ${where}
      ORDER BY "createdAt" DESC
    `;

    return rows.map(toStored);
  },

  async clear() {
    await prisma.$executeRaw`DELETE FROM "ShareLink"`;
  }
};

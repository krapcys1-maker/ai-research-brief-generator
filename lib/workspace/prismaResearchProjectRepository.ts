import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/storage/prismaClient";
import type {
  ResearchProjectFilter,
  ResearchProjectListItem,
  ResearchProjectRepository,
  SaveResearchProjectInput,
  StoredResearchProject
} from "@/lib/workspace/projectTypes";

type ResearchProjectRow = {
  id: string;
  ownerSessionId: string | null;
  ownerId: string | null;
  workspaceId: string | null;
  createdByUserId: string | null;
  visibility: string;
  title: string;
  query: string;
  description: string | null;
  sourcesJson: Prisma.JsonValue;
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

function toStored(row: ResearchProjectRow): StoredResearchProject {
  return {
    id: row.id,
    ownerSessionId: row.ownerSessionId,
    ownerId: row.ownerId,
    workspaceId: row.workspaceId,
    createdByUserId: row.createdByUserId,
    visibility: visibility(row.visibility),
    title: row.title,
    query: row.query,
    description: row.description,
    sources: stringArray(row.sourcesJson),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function filterSql(filter?: ResearchProjectFilter) {
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

export const prismaResearchProjectRepository: ResearchProjectRepository = {
  async save(input: SaveResearchProjectInput) {
    const rows = await prisma.$queryRaw<ResearchProjectRow[]>`
      INSERT INTO "ResearchProject" (
        "id",
        "ownerSessionId",
        "ownerId",
        "workspaceId",
        "createdByUserId",
        "visibility",
        "title",
        "query",
        "description",
        "sourcesJson",
        "updatedAt"
      )
      VALUES (
        ${`research_project_${randomUUID()}`},
        ${input.ownerSessionId ?? null},
        ${input.ownerId ?? null},
        ${input.workspaceId ?? null},
        ${input.createdByUserId ?? null},
        ${input.visibility ?? "private"}::"BriefVisibility",
        ${input.title},
        ${input.query},
        ${input.description ?? null},
        ${(input.sources ?? []) as unknown as Prisma.JsonArray}::jsonb,
        NOW()
      )
      RETURNING *
    `;

    const row = rows[0];
    if (!row) {
      throw new Error("Research project was not saved.");
    }

    return toStored(row);
  },

  async list(filter): Promise<ResearchProjectListItem[]> {
    const where = filterSql(filter);
    const rows = await prisma.$queryRaw<ResearchProjectRow[]>`
      SELECT *
      FROM "ResearchProject"
      ${where}
      ORDER BY "createdAt" DESC
    `;

    return rows.map(toStored);
  },

  async clear() {
    await prisma.$executeRaw`DELETE FROM "ResearchProject"`;
  }
};

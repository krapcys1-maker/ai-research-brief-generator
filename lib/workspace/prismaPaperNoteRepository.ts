import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/storage/prismaClient";
import type {
  PaperNoteFilter,
  PaperNoteListItem,
  PaperNoteRepository,
  SavePaperNoteInput,
  StoredPaperNote
} from "@/lib/workspace/paperNoteTypes";

type PaperNoteRow = {
  id: string;
  ownerSessionId: string | null;
  ownerId: string | null;
  workspaceId: string | null;
  createdByUserId: string | null;
  visibility: string;
  paperId: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
};

function visibility(value: string) {
  return value === "workspace" || value === "public" ? value : "private";
}

function toStored(row: PaperNoteRow): StoredPaperNote {
  return {
    id: row.id,
    ownerSessionId: row.ownerSessionId,
    ownerId: row.ownerId,
    workspaceId: row.workspaceId,
    createdByUserId: row.createdByUserId,
    visibility: visibility(row.visibility),
    paperId: row.paperId,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  };
}

function filterSql(filter?: PaperNoteFilter) {
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

export const prismaPaperNoteRepository: PaperNoteRepository = {
  async save(input: SavePaperNoteInput) {
    const rows = await prisma.$queryRaw<PaperNoteRow[]>`
      INSERT INTO "PaperNote" (
        "id",
        "ownerSessionId",
        "ownerId",
        "workspaceId",
        "createdByUserId",
        "visibility",
        "paperId",
        "note",
        "updatedAt"
      )
      VALUES (
        ${`paper_note_${randomUUID()}`},
        ${input.ownerSessionId ?? null},
        ${input.ownerId ?? null},
        ${input.workspaceId ?? null},
        ${input.createdByUserId ?? null},
        ${input.visibility ?? "private"}::"BriefVisibility",
        ${input.paperId},
        ${input.note},
        NOW()
      )
      RETURNING *
    `;

    const row = rows[0];
    if (!row) {
      throw new Error("Paper note was not saved.");
    }

    return toStored(row);
  },

  async list(filter): Promise<PaperNoteListItem[]> {
    const where = filterSql(filter);
    const rows = await prisma.$queryRaw<PaperNoteRow[]>`
      SELECT *
      FROM "PaperNote"
      ${where}
      ORDER BY "createdAt" DESC
    `;

    return rows.map(toStored);
  },

  async clear() {
    await prisma.$executeRaw`DELETE FROM "PaperNote"`;
  }
};

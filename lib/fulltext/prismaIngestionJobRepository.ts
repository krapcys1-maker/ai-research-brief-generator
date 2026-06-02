import { Prisma } from "@prisma/client";
import type {
  FullTextIngestionJob,
  FullTextIngestionJobRepository,
  FullTextIngestionJobResult,
  FullTextIngestionJobStage,
  FullTextIngestionJobStatus,
  SerializableFullTextIngestionOptions
} from "@/lib/fulltext/ingestionJobTypes";
import { prisma } from "@/lib/storage/prismaClient";
import type { NormalizedPaper } from "@/lib/sources/types";
import type { BriefVisibility } from "@/lib/storage/types";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function isStatus(value: string): value is FullTextIngestionJobStatus {
  return (
    value === "queued" ||
    value === "running" ||
    value === "completed" ||
    value === "failed"
  );
}

function isStage(value: string | null): value is FullTextIngestionJobStage {
  return (
    value === "queued" ||
    value === "ingestion" ||
    value === "completed" ||
    value === "failed"
  );
}

function visibilityToPrisma(value: BriefVisibility | undefined) {
  if (value === "workspace") {
    return "WORKSPACE" as const;
  }

  if (value === "public") {
    return "PUBLIC" as const;
  }

  return "PRIVATE" as const;
}

function visibilityFromPrisma(value: string): BriefVisibility {
  if (value === "WORKSPACE") {
    return "workspace";
  }

  if (value === "PUBLIC") {
    return "public";
  }

  return "private";
}

function parsePapers(value: Prisma.JsonValue): NormalizedPaper[] {
  return Array.isArray(value) ? (value as NormalizedPaper[]) : [];
}

function parseOptions(
  value: Prisma.JsonValue | null
): SerializableFullTextIngestionOptions {
  return value && typeof value === "object"
    ? (value as SerializableFullTextIngestionOptions)
    : {};
}

function parseResult(value: Prisma.JsonValue | null) {
  return value && typeof value === "object"
    ? (value as FullTextIngestionJobResult)
    : undefined;
}

function jobFromPrisma(record: {
  id: string;
  status: string;
  stage: string | null;
  stageStartedAt: Date | null;
  ownerSessionId: string | null;
  ownerId: string | null;
  workspaceId: string | null;
  createdByUserId: string | null;
  visibility: string;
  papersJson: Prisma.JsonValue;
  optionsJson: Prisma.JsonValue | null;
  resultJson: Prisma.JsonValue | null;
  error: string | null;
  attemptCount: number;
  maxAttempts: number;
  lockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): FullTextIngestionJob {
  return {
    id: record.id,
    status: isStatus(record.status) ? record.status : "failed",
    stage: isStage(record.stage) ? record.stage : undefined,
    stageStartedAt: record.stageStartedAt?.toISOString(),
    ownerSessionId: record.ownerSessionId,
    ownerId: record.ownerId,
    workspaceId: record.workspaceId,
    createdByUserId: record.createdByUserId,
    visibility: visibilityFromPrisma(record.visibility),
    papers: parsePapers(record.papersJson),
    options: parseOptions(record.optionsJson),
    result: parseResult(record.resultJson),
    error: record.error ?? undefined,
    attemptCount: record.attemptCount,
    maxAttempts: record.maxAttempts,
    lockedAt: record.lockedAt?.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

export const prismaFullTextIngestionJobRepository: FullTextIngestionJobRepository =
  {
    async create(job) {
      const record = await prisma.fullTextIngestionJob.create({
        data: {
          id: job.id,
          status: job.status,
          stage: job.stage,
          stageStartedAt: job.stageStartedAt
            ? new Date(job.stageStartedAt)
            : undefined,
          ownerSessionId: job.ownerSessionId ?? null,
          ownerId: job.ownerId ?? null,
          workspaceId: job.workspaceId ?? null,
          createdByUserId: job.createdByUserId ?? null,
          visibility: visibilityToPrisma(job.visibility),
          papersJson: asJson(job.papers),
          optionsJson: asJson(job.options),
          resultJson: job.result ? asJson(job.result) : undefined,
          error: job.error,
          attemptCount: job.attemptCount,
          maxAttempts: job.maxAttempts,
          lockedAt: job.lockedAt ? new Date(job.lockedAt) : undefined,
          createdAt: new Date(job.createdAt),
          updatedAt: new Date(job.updatedAt)
        }
      });

      return jobFromPrisma(record);
    },

    async update(id, patch) {
      const existing = await prisma.fullTextIngestionJob.findUnique({
        where: { id }
      });

      if (!existing) {
        return null;
      }

      const record = await prisma.fullTextIngestionJob.update({
        where: { id },
        data: {
          status: patch.status,
          stage: "stage" in patch ? (patch.stage ?? null) : undefined,
          stageStartedAt:
            "stageStartedAt" in patch
              ? patch.stageStartedAt
                ? new Date(patch.stageStartedAt)
                : null
              : undefined,
          ownerSessionId:
            "ownerSessionId" in patch
              ? (patch.ownerSessionId ?? null)
              : undefined,
          ownerId: "ownerId" in patch ? (patch.ownerId ?? null) : undefined,
          workspaceId:
            "workspaceId" in patch ? (patch.workspaceId ?? null) : undefined,
          createdByUserId:
            "createdByUserId" in patch
              ? (patch.createdByUserId ?? null)
              : undefined,
          visibility:
            "visibility" in patch
              ? visibilityToPrisma(patch.visibility)
              : undefined,
          papersJson: patch.papers ? asJson(patch.papers) : undefined,
          optionsJson:
            "options" in patch
              ? patch.options
                ? asJson(patch.options)
                : Prisma.JsonNull
              : undefined,
          resultJson:
            "result" in patch
              ? patch.result
                ? asJson(patch.result)
                : Prisma.JsonNull
              : undefined,
          error: "error" in patch ? (patch.error ?? null) : undefined,
          attemptCount: patch.attemptCount,
          maxAttempts: patch.maxAttempts,
          lockedAt:
            "lockedAt" in patch
              ? patch.lockedAt
                ? new Date(patch.lockedAt)
                : null
              : undefined
        }
      });

      return jobFromPrisma(record);
    },

    async getById(id) {
      const record = await prisma.fullTextIngestionJob.findUnique({
        where: { id }
      });
      return record ? jobFromPrisma(record) : null;
    },

    async claimNextQueued() {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const queued = await prisma.fullTextIngestionJob.findFirst({
          where: { status: "queued" },
          orderBy: { createdAt: "asc" },
          select: { id: true }
        });

        if (!queued) {
          return null;
        }

        const claimed = await prisma.fullTextIngestionJob.updateMany({
          where: {
            id: queued.id,
            status: "queued"
          },
          data: {
            status: "running",
            stage: "ingestion",
            stageStartedAt: new Date(),
            attemptCount: { increment: 1 },
            lockedAt: new Date(),
            error: null,
            resultJson: Prisma.JsonNull
          }
        });

        if (claimed.count === 1) {
          return this.getById(queued.id);
        }
      }

      return null;
    },

    async resetStaleRunning(staleMs) {
      const cutoff = new Date(Date.now() - staleMs);
      const staleJobs = await prisma.fullTextIngestionJob.findMany({
        where: {
          status: "running",
          lockedAt: { lt: cutoff }
        },
        select: {
          id: true,
          attemptCount: true,
          maxAttempts: true
        }
      });

      for (const job of staleJobs) {
        const exhausted = job.attemptCount >= job.maxAttempts;
        await prisma.fullTextIngestionJob.updateMany({
          where: {
            id: job.id,
            status: "running",
            lockedAt: { lt: cutoff }
          },
          data: {
            status: exhausted ? "failed" : "queued",
            stage: exhausted ? "failed" : "queued",
            stageStartedAt: new Date(),
            lockedAt: null,
            error: exhausted
              ? `Full-text ingestion job exceeded ${job.maxAttempts} attempt(s).`
              : "Full-text ingestion job was reset after a stale worker lease.",
            resultJson: Prisma.JsonNull
          }
        });
      }

      return staleJobs.length;
    },

    async clear() {
      await prisma.fullTextIngestionJob.deleteMany();
    }
  };

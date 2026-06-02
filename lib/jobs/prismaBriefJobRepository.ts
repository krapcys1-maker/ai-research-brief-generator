import { Prisma } from "@prisma/client";
import { BriefRequestSchema } from "@/lib/ai/schemas";
import type {
  BriefJob,
  BriefJobRepository,
  BriefJobStage,
  BriefJobStatus
} from "@/lib/jobs/types";
import { prisma } from "@/lib/storage/prismaClient";
import type { ResearchQualityGateResult } from "@/lib/pipeline/qualityGate";
import type { BriefVisibility } from "@/lib/storage/types";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function isBriefJobStatus(value: string): value is BriefJobStatus {
  return (
    value === "queued" ||
    value === "running" ||
    value === "completed" ||
    value === "quality_gate_failed" ||
    value === "configuration_error" ||
    value === "failed"
  );
}

function isBriefJobStage(value: string | null): value is BriefJobStage {
  return (
    value === "queued" ||
    value === "preflight" ||
    value === "full_text_ingestion" ||
    value === "synthesis" ||
    value === "persistence" ||
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

function parseQualityGate(value: Prisma.JsonValue | null) {
  if (!value) {
    return undefined;
  }

  const maybeGate = value as Partial<ResearchQualityGateResult>;
  if (
    maybeGate.coverage === "good" ||
    maybeGate.coverage === "limited" ||
    maybeGate.coverage === "poor"
  ) {
    return maybeGate as ResearchQualityGateResult;
  }

  return undefined;
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
  requestJson: Prisma.JsonValue;
  briefId: string | null;
  error: string | null;
  qualityGateJson: Prisma.JsonValue | null;
  attemptCount: number;
  maxAttempts: number;
  lockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): BriefJob {
  const request = BriefRequestSchema.parse(record.requestJson);

  return {
    id: record.id,
    status: isBriefJobStatus(record.status) ? record.status : "failed",
    stage: isBriefJobStage(record.stage) ? record.stage : undefined,
    stageStartedAt: record.stageStartedAt?.toISOString(),
    ownerSessionId: record.ownerSessionId,
    ownerId: record.ownerId,
    workspaceId: record.workspaceId,
    createdByUserId: record.createdByUserId,
    visibility: visibilityFromPrisma(record.visibility),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    attemptCount: record.attemptCount,
    maxAttempts: record.maxAttempts,
    lockedAt: record.lockedAt?.toISOString(),
    request,
    briefId: record.briefId ?? undefined,
    error: record.error ?? undefined,
    qualityGate: parseQualityGate(record.qualityGateJson)
  };
}

export const prismaBriefJobRepository: BriefJobRepository = {
  async create(job) {
    const record = await prisma.briefGenerationJob.create({
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
        requestJson: asJson(job.request),
        briefId: job.briefId,
        error: job.error,
        qualityGateJson: job.qualityGate ? asJson(job.qualityGate) : undefined,
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
    const existing = await prisma.briefGenerationJob.findUnique({ where: { id } });

    if (!existing) {
      return null;
    }

    const record = await prisma.briefGenerationJob.update({
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
          "ownerSessionId" in patch ? (patch.ownerSessionId ?? null) : undefined,
        ownerId: "ownerId" in patch ? (patch.ownerId ?? null) : undefined,
        workspaceId:
          "workspaceId" in patch ? (patch.workspaceId ?? null) : undefined,
        createdByUserId:
          "createdByUserId" in patch
            ? (patch.createdByUserId ?? null)
            : undefined,
        visibility:
          "visibility" in patch ? visibilityToPrisma(patch.visibility) : undefined,
        requestJson: patch.request ? asJson(patch.request) : undefined,
        briefId: "briefId" in patch ? (patch.briefId ?? null) : undefined,
        error: "error" in patch ? (patch.error ?? null) : undefined,
        attemptCount: patch.attemptCount,
        maxAttempts: patch.maxAttempts,
        lockedAt: "lockedAt" in patch ? (patch.lockedAt ? new Date(patch.lockedAt) : null) : undefined,
        qualityGateJson:
          "qualityGate" in patch
            ? patch.qualityGate
              ? asJson(patch.qualityGate)
              : Prisma.JsonNull
            : undefined
      }
    });

    return jobFromPrisma(record);
  },

  async getById(id) {
    const record = await prisma.briefGenerationJob.findUnique({ where: { id } });
    return record ? jobFromPrisma(record) : null;
  },

  async claimNextQueued() {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const queued = await prisma.briefGenerationJob.findFirst({
        where: { status: "queued" },
        orderBy: { createdAt: "asc" },
        select: { id: true }
      });

      if (!queued) {
        return null;
      }

      const claimed = await prisma.briefGenerationJob.updateMany({
        where: {
          id: queued.id,
          status: "queued"
        },
        data: {
          status: "running",
          stage: "preflight",
          stageStartedAt: new Date(),
          attemptCount: { increment: 1 },
          lockedAt: new Date(),
          error: null,
          qualityGateJson: Prisma.JsonNull
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
    const staleJobs = await prisma.briefGenerationJob.findMany({
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
      await prisma.briefGenerationJob.updateMany({
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
            ? `Brief generation job exceeded ${job.maxAttempts} attempt(s).`
            : "Brief generation job was reset after a stale worker lease.",
          qualityGateJson: Prisma.JsonNull
        }
      });
    }

    return staleJobs.length;
  },

  async clear() {
    await prisma.briefGenerationJob.deleteMany();
  }
};

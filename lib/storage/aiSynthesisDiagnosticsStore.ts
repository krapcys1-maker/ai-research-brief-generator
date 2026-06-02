import { randomUUID } from "node:crypto";
import { getPersistenceStatus } from "@/lib/storage/repository";

export type AiSynthesisDiagnosticStatus =
  | "success"
  | "retry"
  | "fallback"
  | "provider_error"
  | "validation_error"
  | "configuration_error";

export type AiSynthesisDiagnostic = {
  query: string;
  provider: string;
  status: AiSynthesisDiagnosticStatus;
  attemptCount: number;
  paperCount: number;
  message?: string;
  createdAt: string;
};

const MAX_RECENT_DIAGNOSTICS = 80;

const globalForAiSynthesisDiagnostics = globalThis as typeof globalThis & {
  __aiSynthesisDiagnostics?: AiSynthesisDiagnostic[];
};

const diagnostics =
  globalForAiSynthesisDiagnostics.__aiSynthesisDiagnostics ?? [];

globalForAiSynthesisDiagnostics.__aiSynthesisDiagnostics = diagnostics;

function normalizeStatus(status: string): AiSynthesisDiagnosticStatus {
  return status === "success" ||
    status === "retry" ||
    status === "fallback" ||
    status === "provider_error" ||
    status === "validation_error" ||
    status === "configuration_error"
    ? status
    : "provider_error";
}

function sanitizeMessage(message: string | undefined) {
  if (!message) {
    return undefined;
  }

  return message
    .replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]")
    .slice(0, 500);
}

function toDiagnostic(record: {
  query: string;
  provider: string;
  status: string;
  attemptCount: number;
  paperCount: number;
  message: string | null;
  createdAt: Date | string;
}): AiSynthesisDiagnostic {
  return {
    query: record.query,
    provider: record.provider,
    status: normalizeStatus(record.status),
    attemptCount: record.attemptCount,
    paperCount: record.paperCount,
    message: record.message ?? undefined,
    createdAt:
      record.createdAt instanceof Date
        ? record.createdAt.toISOString()
        : record.createdAt
  };
}

function summarizeDiagnostics(items: AiSynthesisDiagnostic[]) {
  const counts = {
    success: 0,
    retry: 0,
    fallback: 0,
    providerError: 0,
    validationError: 0,
    configurationError: 0
  };
  const byProvider = items.reduce<
    Record<
      string,
      {
        provider: string;
        success: number;
        retry: number;
        fallback: number;
        providerError: number;
        validationError: number;
        configurationError: number;
        lastStatus: AiSynthesisDiagnosticStatus;
        lastMessage: string | null;
      }
    >
  >((acc, item) => {
    const current =
      acc[item.provider] ??
      {
        provider: item.provider,
        success: 0,
        retry: 0,
        fallback: 0,
        providerError: 0,
        validationError: 0,
        configurationError: 0,
        lastStatus: item.status,
        lastMessage: null
      };

    if (item.status === "provider_error") {
      counts.providerError += 1;
      current.providerError += 1;
    } else if (item.status === "validation_error") {
      counts.validationError += 1;
      current.validationError += 1;
    } else if (item.status === "configuration_error") {
      counts.configurationError += 1;
      current.configurationError += 1;
    } else {
      counts[item.status] += 1;
      current[item.status] += 1;
    }

    current.lastStatus = item.status;
    current.lastMessage = item.message ?? null;
    acc[item.provider] = current;

    return acc;
  }, {});

  const completed = counts.success + counts.fallback;
  const fallbackRate = completed > 0 ? counts.fallback / completed : 0;
  const last = items.at(-1) ?? null;

  return {
    totalDiagnostics: items.length,
    ...counts,
    fallbackRate,
    lastStatus: last?.status ?? null,
    lastMessage: last?.message ?? null,
    byProvider: Object.values(byProvider).sort((a, b) =>
      a.provider.localeCompare(b.provider)
    )
  };
}

export async function recordAiSynthesisDiagnostic(
  input: Omit<AiSynthesisDiagnostic, "createdAt">
) {
  const item: AiSynthesisDiagnostic = {
    ...input,
    message: sanitizeMessage(input.message),
    createdAt: new Date().toISOString()
  };

  diagnostics.push(item);

  if (diagnostics.length > MAX_RECENT_DIAGNOSTICS) {
    diagnostics.splice(0, diagnostics.length - MAX_RECENT_DIAGNOSTICS);
  }

  if (!getPersistenceStatus().hasValidPostgresUrl) {
    return;
  }

  try {
    const { prisma } = await import("@/lib/storage/prismaClient");
    await prisma.$executeRaw`
      INSERT INTO "AiSynthesisDiagnostic"
        ("id", "query", "provider", "status", "attemptCount", "paperCount", "message", "createdAt")
      VALUES
        (${randomUUID()}, ${item.query}, ${item.provider}, ${item.status}, ${item.attemptCount}, ${item.paperCount}, ${item.message ?? null}, ${new Date(item.createdAt)})
    `;

    await prisma.$executeRaw`
      DELETE FROM "AiSynthesisDiagnostic"
      WHERE "id" IN (
        SELECT "id" FROM "AiSynthesisDiagnostic"
        ORDER BY "createdAt" DESC
        OFFSET ${MAX_RECENT_DIAGNOSTICS}
      )
    `;
  } catch {
    // Diagnostics must never break generation if a deployment is mid-migration.
  }
}

export async function getRecentAiSynthesisDiagnostics(limit = 12) {
  if (getPersistenceStatus().hasValidPostgresUrl) {
    try {
      const { prisma } = await import("@/lib/storage/prismaClient");
      const records = await prisma.$queryRaw<
        {
          query: string;
          provider: string;
          status: string;
          attemptCount: number;
          paperCount: number;
          message: string | null;
          createdAt: Date;
        }[]
      >`
        SELECT "query", "provider", "status", "attemptCount", "paperCount", "message", "createdAt"
        FROM "AiSynthesisDiagnostic"
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
      `;

      return records.map(toDiagnostic);
    } catch {
      return diagnostics.slice(-limit).reverse();
    }
  }

  return diagnostics.slice(-limit).reverse();
}

export async function getAiSynthesisHealthSummary() {
  if (getPersistenceStatus().hasValidPostgresUrl) {
    try {
      const { prisma } = await import("@/lib/storage/prismaClient");
      const records = await prisma.$queryRaw<
        {
          query: string;
          provider: string;
          status: string;
          attemptCount: number;
          paperCount: number;
          message: string | null;
          createdAt: Date;
        }[]
      >`
        SELECT "query", "provider", "status", "attemptCount", "paperCount", "message", "createdAt"
        FROM "AiSynthesisDiagnostic"
        ORDER BY "createdAt" DESC
        LIMIT ${MAX_RECENT_DIAGNOSTICS}
      `;

      return summarizeDiagnostics(records.reverse().map(toDiagnostic));
    } catch {
      return summarizeDiagnostics(diagnostics);
    }
  }

  return summarizeDiagnostics(diagnostics);
}

export async function clearAiSynthesisDiagnostics() {
  diagnostics.splice(0, diagnostics.length);

  if (!getPersistenceStatus().hasValidPostgresUrl) {
    return;
  }

  try {
    const { prisma } = await import("@/lib/storage/prismaClient");
    await prisma.$executeRaw`DELETE FROM "AiSynthesisDiagnostic"`;
  } catch {
    // Test and local cleanup should tolerate deployments before migration.
  }
}

export function clearAiSynthesisDiagnosticsMemoryForTests() {
  diagnostics.splice(0, diagnostics.length);
}

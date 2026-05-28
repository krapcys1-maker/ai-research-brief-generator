import type { SourceSearchDiagnostic } from "@/lib/sources/types";
import { getPersistenceStatus } from "@/lib/storage/repository";

const MAX_RECENT_DIAGNOSTICS = 80;

const globalForSourceDiagnostics = globalThis as typeof globalThis & {
  __sourceDiagnostics?: SourceSearchDiagnostic[];
};

const diagnostics =
  globalForSourceDiagnostics.__sourceDiagnostics ?? [];

globalForSourceDiagnostics.__sourceDiagnostics = diagnostics;

function normalizeStatus(
  status: string
): SourceSearchDiagnostic["status"] {
  return status === "success" || status === "empty" || status === "failed"
    ? status
    : "failed";
}

function toDiagnostic(record: {
  source: string;
  query: string;
  status: string;
  resultCount: number;
  cached: boolean;
  message: string | null;
}): SourceSearchDiagnostic {
  return {
    source:
      record.source === "mock" ||
      record.source === "arxiv" ||
      record.source === "semantic_scholar" ||
      record.source === "openalex"
        ? record.source
        : "mock",
    query: record.query,
    status: normalizeStatus(record.status),
    resultCount: record.resultCount,
    cached: record.cached,
    message: record.message ?? undefined
  };
}

function summarizeDiagnostics(items: SourceSearchDiagnostic[]) {
  const bySource = items.reduce<
    Record<
      string,
      {
        source: string;
        success: number;
        empty: number;
        failed: number;
        cached: number;
        lastStatus: SourceSearchDiagnostic["status"];
        lastMessage: string | null;
      }
    >
  >((acc, item) => {
    const current =
      acc[item.source] ??
      {
        source: item.source,
        success: 0,
        empty: 0,
        failed: 0,
        cached: 0,
        lastStatus: item.status,
        lastMessage: null
      };

    current[item.status] += 1;
    current.cached += item.cached ? 1 : 0;
    current.lastStatus = item.status;
    current.lastMessage = item.message ?? null;
    acc[item.source] = current;

    return acc;
  }, {});

  return {
    totalDiagnostics: items.length,
    bySource: Object.values(bySource).sort((a, b) =>
      a.source.localeCompare(b.source)
    )
  };
}

export async function recordSourceDiagnostics(items: SourceSearchDiagnostic[]) {
  diagnostics.push(...items);

  if (diagnostics.length > MAX_RECENT_DIAGNOSTICS) {
    diagnostics.splice(0, diagnostics.length - MAX_RECENT_DIAGNOSTICS);
  }

  if (!getPersistenceStatus().hasValidPostgresUrl || !items.length) {
    return;
  }

  const { prisma } = await import("@/lib/storage/prismaClient");
  await prisma.sourceDiagnostic.createMany({
    data: items.map((item) => ({
      source: item.source,
      query: item.query,
      status: item.status,
      resultCount: item.resultCount,
      cached: item.cached,
      message: item.message
    }))
  });

  const overflow = await prisma.sourceDiagnostic.count();
  if (overflow > MAX_RECENT_DIAGNOSTICS) {
    const staleRecords = await prisma.sourceDiagnostic.findMany({
      orderBy: {
        createdAt: "asc"
      },
      take: overflow - MAX_RECENT_DIAGNOSTICS,
      select: {
        id: true
      }
    });

    await prisma.sourceDiagnostic.deleteMany({
      where: {
        id: {
          in: staleRecords.map((record) => record.id)
        }
      }
    });
  }
}

export async function getRecentSourceDiagnostics(limit = 20) {
  if (getPersistenceStatus().hasValidPostgresUrl) {
    const { prisma } = await import("@/lib/storage/prismaClient");
    const records = await prisma.sourceDiagnostic.findMany({
      orderBy: {
        createdAt: "desc"
      },
      take: limit
    });

    return records.map(toDiagnostic);
  }

  return diagnostics.slice(-limit).reverse();
}

export async function getSourceHealthSummary() {
  if (getPersistenceStatus().hasValidPostgresUrl) {
    const { prisma } = await import("@/lib/storage/prismaClient");
    const records = await prisma.sourceDiagnostic.findMany({
      orderBy: {
        createdAt: "desc"
      },
      take: MAX_RECENT_DIAGNOSTICS
    });

    return summarizeDiagnostics(records.reverse().map(toDiagnostic));
  }

  return summarizeDiagnostics(diagnostics);
}

export async function clearSourceDiagnostics() {
  diagnostics.splice(0, diagnostics.length);

  if (!getPersistenceStatus().hasValidPostgresUrl) {
    return;
  }

  const { prisma } = await import("@/lib/storage/prismaClient");
  await prisma.sourceDiagnostic.deleteMany();
}

export function clearSourceDiagnosticsMemoryForTests() {
  diagnostics.splice(0, diagnostics.length);
}

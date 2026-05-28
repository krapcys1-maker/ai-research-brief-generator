import type { SourceSearchDiagnostic } from "@/lib/sources/types";

const MAX_RECENT_DIAGNOSTICS = 80;

const globalForSourceDiagnostics = globalThis as typeof globalThis & {
  __sourceDiagnostics?: SourceSearchDiagnostic[];
};

const diagnostics =
  globalForSourceDiagnostics.__sourceDiagnostics ?? [];

globalForSourceDiagnostics.__sourceDiagnostics = diagnostics;

export function recordSourceDiagnostics(items: SourceSearchDiagnostic[]) {
  diagnostics.push(...items);

  if (diagnostics.length > MAX_RECENT_DIAGNOSTICS) {
    diagnostics.splice(0, diagnostics.length - MAX_RECENT_DIAGNOSTICS);
  }
}

export function getRecentSourceDiagnostics(limit = 20) {
  return diagnostics.slice(-limit).reverse();
}

export function getSourceHealthSummary() {
  const bySource = diagnostics.reduce<
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
    totalDiagnostics: diagnostics.length,
    bySource: Object.values(bySource).sort((a, b) =>
      a.source.localeCompare(b.source)
    )
  };
}

export function clearSourceDiagnostics() {
  diagnostics.splice(0, diagnostics.length);
}

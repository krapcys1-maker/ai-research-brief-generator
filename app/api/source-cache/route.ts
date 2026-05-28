import { NextResponse } from "next/server";
import {
  clearExpiredSourceCache,
  getSourceCacheStats
} from "@/lib/storage/sourceApiCache";
import {
  getRecentSourceDiagnostics,
  getSourceHealthSummary
} from "@/lib/storage/sourceDiagnosticsStore";
import { getPersistenceStatus } from "@/lib/storage/repository";

export async function GET() {
  clearExpiredSourceCache();

  return NextResponse.json({
    persistence: getPersistenceStatus(),
    cache: getSourceCacheStats(),
    sourceHealth: getSourceHealthSummary(),
    recentDiagnostics: getRecentSourceDiagnostics(12)
  });
}

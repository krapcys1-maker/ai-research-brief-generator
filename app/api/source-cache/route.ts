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
  await clearExpiredSourceCache();

  return NextResponse.json({
    persistence: getPersistenceStatus(),
    cache: await getSourceCacheStats(),
    sourceHealth: await getSourceHealthSummary(),
    recentDiagnostics: await getRecentSourceDiagnostics(12)
  });
}

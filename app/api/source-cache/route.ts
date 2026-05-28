import { NextResponse } from "next/server";
import {
  clearExpiredSourceCache,
  getSourceCacheStats
} from "@/lib/storage/sourceApiCache";
import {
  getRecentSourceDiagnostics,
  getSourceHealthSummary
} from "@/lib/storage/sourceDiagnosticsStore";

export async function GET() {
  clearExpiredSourceCache();

  return NextResponse.json({
    cache: getSourceCacheStats(),
    sourceHealth: getSourceHealthSummary(),
    recentDiagnostics: getRecentSourceDiagnostics(12)
  });
}

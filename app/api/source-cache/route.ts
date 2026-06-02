import { NextResponse } from "next/server";
import {
  clearExpiredSourceCache,
  getSourceCacheStats
} from "@/lib/storage/sourceApiCache";
import {
  getRecentSourceDiagnostics,
  getSourceHealthSummary
} from "@/lib/storage/sourceDiagnosticsStore";
import {
  getAiSynthesisHealthSummary,
  getRecentAiSynthesisDiagnostics
} from "@/lib/storage/aiSynthesisDiagnosticsStore";
import { getEmbeddingConfigSummary } from "@/lib/embeddings/diagnostics";
import { getPersistenceStatus } from "@/lib/storage/repository";

export async function GET() {
  const persistence = getPersistenceStatus();

  if (persistence.fatalError) {
    return NextResponse.json(
      {
        status: "configuration_error",
        error: persistence.fatalError,
        persistence
      },
      { status: 503 }
    );
  }

  await clearExpiredSourceCache();

  return NextResponse.json({
    persistence,
    cache: await getSourceCacheStats(),
    embeddingHealth: getEmbeddingConfigSummary(),
    aiSynthesisHealth: await getAiSynthesisHealthSummary(),
    recentAiSynthesisDiagnostics: await getRecentAiSynthesisDiagnostics(8),
    sourceHealth: await getSourceHealthSummary(),
    recentDiagnostics: await getRecentSourceDiagnostics(12)
  });
}

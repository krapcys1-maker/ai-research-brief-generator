import { NextResponse } from "next/server";
import {
  clearExpiredSourceCache,
  getSourceCacheStats
} from "@/lib/storage/sourceApiCache";

export async function GET() {
  clearExpiredSourceCache();

  return NextResponse.json({
    cache: getSourceCacheStats()
  });
}

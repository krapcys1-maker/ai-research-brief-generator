import { inMemoryBriefRepository } from "@/lib/storage/inMemoryBriefStore";
import type { BriefRepository } from "@/lib/storage/types";

let cachedRepository: BriefRepository | null = null;

export async function getBriefRepository(): Promise<BriefRepository> {
  if (cachedRepository) {
    return cachedRepository;
  }

  if (!process.env.DATABASE_URL) {
    cachedRepository = inMemoryBriefRepository;
    return cachedRepository;
  }

  const { prismaBriefRepository } = await import(
    "@/lib/storage/prismaBriefRepository"
  );
  cachedRepository = prismaBriefRepository;
  return cachedRepository;
}

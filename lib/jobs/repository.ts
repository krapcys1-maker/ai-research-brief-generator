import { inMemoryBriefJobRepository } from "@/lib/jobs/inMemoryBriefJobRepository";
import type { BriefJobRepository } from "@/lib/jobs/types";
import { getPersistenceStatus } from "@/lib/storage/repository";

let cachedRepository: BriefJobRepository | null = null;

export function resetBriefJobRepositoryForTests() {
  cachedRepository = null;
}

export async function getBriefJobRepository(): Promise<BriefJobRepository> {
  if (cachedRepository) {
    return cachedRepository;
  }

  const persistence = getPersistenceStatus();

  if (persistence.fatalError) {
    throw new Error(persistence.fatalError);
  }

  if (!persistence.hasValidPostgresUrl) {
    cachedRepository = inMemoryBriefJobRepository;
    return cachedRepository;
  }

  const { prismaBriefJobRepository } = await import(
    "@/lib/jobs/prismaBriefJobRepository"
  );
  cachedRepository = prismaBriefJobRepository;
  return cachedRepository;
}

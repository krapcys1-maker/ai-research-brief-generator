import { getPersistenceStatus } from "@/lib/storage/repository";
import { inMemoryBriefCollectionRepository } from "@/lib/workspace/inMemoryBriefCollectionRepository";
import type { BriefCollectionRepository } from "@/lib/workspace/briefCollectionTypes";

let cachedRepository: BriefCollectionRepository | null = null;

export function resetBriefCollectionRepositoryForTests() {
  cachedRepository = null;
}

export async function getBriefCollectionRepository(): Promise<BriefCollectionRepository> {
  if (cachedRepository) {
    return cachedRepository;
  }

  const persistence = getPersistenceStatus();

  if (persistence.fatalError) {
    throw new Error(persistence.fatalError);
  }

  if (!persistence.hasValidPostgresUrl) {
    cachedRepository = inMemoryBriefCollectionRepository;
    return cachedRepository;
  }

  const { prismaBriefCollectionRepository } = await import(
    "@/lib/workspace/prismaBriefCollectionRepository"
  );
  cachedRepository = prismaBriefCollectionRepository;
  return cachedRepository;
}

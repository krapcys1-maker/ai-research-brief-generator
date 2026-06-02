import { inMemoryFullTextIngestionJobRepository } from "@/lib/fulltext/inMemoryIngestionJobRepository";
import type { FullTextIngestionJobRepository } from "@/lib/fulltext/ingestionJobTypes";
import { getPersistenceStatus } from "@/lib/storage/repository";

let cachedRepository: FullTextIngestionJobRepository | null = null;

export function resetFullTextIngestionJobRepositoryForTests() {
  cachedRepository = null;
}

export async function getFullTextIngestionJobRepository(): Promise<FullTextIngestionJobRepository> {
  if (cachedRepository) {
    return cachedRepository;
  }

  const persistence = getPersistenceStatus();

  if (persistence.fatalError) {
    throw new Error(persistence.fatalError);
  }

  if (!persistence.hasValidPostgresUrl) {
    cachedRepository = inMemoryFullTextIngestionJobRepository;
    return cachedRepository;
  }

  const { prismaFullTextIngestionJobRepository } = await import(
    "@/lib/fulltext/prismaIngestionJobRepository"
  );
  cachedRepository = prismaFullTextIngestionJobRepository;
  return cachedRepository;
}

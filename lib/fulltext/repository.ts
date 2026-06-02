import { getPersistenceStatus } from "@/lib/storage/repository";
import { inMemoryFullTextRepository } from "@/lib/fulltext/inMemoryFullTextRepository";
import type { FullTextRepository } from "@/lib/fulltext/types";

let cachedRepository: FullTextRepository | null = null;

export function resetFullTextRepositoryForTests() {
  cachedRepository = null;
}

export async function getFullTextRepository(): Promise<FullTextRepository> {
  if (cachedRepository) {
    return cachedRepository;
  }

  const persistence = getPersistenceStatus();

  if (persistence.fatalError) {
    throw new Error(persistence.fatalError);
  }

  if (!persistence.hasValidPostgresUrl) {
    cachedRepository = inMemoryFullTextRepository;
    return cachedRepository;
  }

  const { prismaFullTextRepository } = await import(
    "@/lib/fulltext/prismaFullTextRepository"
  );
  cachedRepository = prismaFullTextRepository;
  return cachedRepository;
}

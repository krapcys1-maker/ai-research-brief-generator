import { getPersistenceStatus } from "@/lib/storage/repository";
import { inMemoryResearchProjectRepository } from "@/lib/workspace/inMemoryResearchProjectRepository";
import type { ResearchProjectRepository } from "@/lib/workspace/projectTypes";

let cachedRepository: ResearchProjectRepository | null = null;

export function resetResearchProjectRepositoryForTests() {
  cachedRepository = null;
}

export async function getResearchProjectRepository(): Promise<ResearchProjectRepository> {
  if (cachedRepository) {
    return cachedRepository;
  }

  const persistence = getPersistenceStatus();

  if (persistence.fatalError) {
    throw new Error(persistence.fatalError);
  }

  if (!persistence.hasValidPostgresUrl) {
    cachedRepository = inMemoryResearchProjectRepository;
    return cachedRepository;
  }

  const { prismaResearchProjectRepository } = await import(
    "@/lib/workspace/prismaResearchProjectRepository"
  );
  cachedRepository = prismaResearchProjectRepository;
  return cachedRepository;
}

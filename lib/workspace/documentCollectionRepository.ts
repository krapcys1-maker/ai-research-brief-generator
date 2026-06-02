import { getPersistenceStatus } from "@/lib/storage/repository";
import { inMemoryDocumentCollectionRepository } from "@/lib/workspace/inMemoryDocumentCollectionRepository";
import type { DocumentCollectionRepository } from "@/lib/workspace/documentCollectionTypes";

let cachedRepository: DocumentCollectionRepository | null = null;

export function resetDocumentCollectionRepositoryForTests() {
  cachedRepository = null;
}

export async function getDocumentCollectionRepository(): Promise<DocumentCollectionRepository> {
  if (cachedRepository) {
    return cachedRepository;
  }

  const persistence = getPersistenceStatus();

  if (persistence.fatalError) {
    throw new Error(persistence.fatalError);
  }

  if (!persistence.hasValidPostgresUrl) {
    cachedRepository = inMemoryDocumentCollectionRepository;
    return cachedRepository;
  }

  const { prismaDocumentCollectionRepository } = await import(
    "@/lib/workspace/prismaDocumentCollectionRepository"
  );
  cachedRepository = prismaDocumentCollectionRepository;
  return cachedRepository;
}

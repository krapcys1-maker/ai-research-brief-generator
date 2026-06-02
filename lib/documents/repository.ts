import { inMemoryDocumentRepository } from "@/lib/documents/inMemoryDocumentRepository";
import type { DocumentRepository } from "@/lib/documents/types";
import { getPersistenceStatus } from "@/lib/storage/repository";

let cachedRepository: DocumentRepository | null = null;

export function resetDocumentRepositoryForTests() {
  cachedRepository = null;
}

export async function getDocumentRepository(): Promise<DocumentRepository> {
  if (cachedRepository) {
    return cachedRepository;
  }

  const persistence = getPersistenceStatus();

  if (persistence.fatalError) {
    throw new Error(persistence.fatalError);
  }

  if (!persistence.hasValidPostgresUrl) {
    cachedRepository = inMemoryDocumentRepository;
    return cachedRepository;
  }

  const { prismaDocumentRepository } = await import(
    "@/lib/documents/prismaDocumentRepository"
  );
  cachedRepository = prismaDocumentRepository;
  return cachedRepository;
}

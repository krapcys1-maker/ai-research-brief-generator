import { getPersistenceStatus } from "@/lib/storage/repository";
import { inMemoryExportHistoryRepository } from "@/lib/workspace/inMemoryExportHistoryRepository";
import type { ExportHistoryRepository } from "@/lib/workspace/exportHistoryTypes";

let cachedRepository: ExportHistoryRepository | null = null;

export function resetExportHistoryRepositoryForTests() {
  cachedRepository = null;
}

export async function getExportHistoryRepository(): Promise<ExportHistoryRepository> {
  if (cachedRepository) {
    return cachedRepository;
  }

  const persistence = getPersistenceStatus();

  if (persistence.fatalError) {
    throw new Error(persistence.fatalError);
  }

  if (!persistence.hasValidPostgresUrl) {
    cachedRepository = inMemoryExportHistoryRepository;
    return cachedRepository;
  }

  const { prismaExportHistoryRepository } = await import(
    "@/lib/workspace/prismaExportHistoryRepository"
  );
  cachedRepository = prismaExportHistoryRepository;
  return cachedRepository;
}

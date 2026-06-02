import { inMemoryCompareReportRepository } from "@/lib/claimCheck/inMemoryCompareReportRepository";
import type { CompareReportRepository } from "@/lib/claimCheck/reportTypes";
import { getPersistenceStatus } from "@/lib/storage/repository";

let cachedRepository: CompareReportRepository | null = null;

export function resetCompareReportRepositoryForTests() {
  cachedRepository = null;
}

export async function getCompareReportRepository(): Promise<CompareReportRepository> {
  if (cachedRepository) {
    return cachedRepository;
  }

  const persistence = getPersistenceStatus();

  if (persistence.fatalError) {
    throw new Error(persistence.fatalError);
  }

  if (!persistence.hasValidPostgresUrl) {
    cachedRepository = inMemoryCompareReportRepository;
    return cachedRepository;
  }

  const { prismaCompareReportRepository } = await import(
    "@/lib/claimCheck/prismaCompareReportRepository"
  );
  cachedRepository = prismaCompareReportRepository;
  return cachedRepository;
}

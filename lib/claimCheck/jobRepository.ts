import { inMemoryCompareJobRepository } from "@/lib/claimCheck/inMemoryCompareJobRepository";
import type { CompareJobRepository } from "@/lib/claimCheck/jobTypes";

let cachedRepository: CompareJobRepository | null = null;

export function resetCompareJobRepositoryForTests() {
  cachedRepository = null;
}

export async function getCompareJobRepository(): Promise<CompareJobRepository> {
  if (cachedRepository) {
    return cachedRepository;
  }

  cachedRepository = inMemoryCompareJobRepository;
  return cachedRepository;
}

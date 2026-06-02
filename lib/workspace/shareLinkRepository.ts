import { getPersistenceStatus } from "@/lib/storage/repository";
import { inMemoryShareLinkRepository } from "@/lib/workspace/inMemoryShareLinkRepository";
import type { ShareLinkRepository } from "@/lib/workspace/shareLinkTypes";

let cachedRepository: ShareLinkRepository | null = null;

export function resetShareLinkRepositoryForTests() {
  cachedRepository = null;
}

export async function getShareLinkRepository(): Promise<ShareLinkRepository> {
  if (cachedRepository) {
    return cachedRepository;
  }

  const persistence = getPersistenceStatus();

  if (persistence.fatalError) {
    throw new Error(persistence.fatalError);
  }

  if (!persistence.hasValidPostgresUrl) {
    cachedRepository = inMemoryShareLinkRepository;
    return cachedRepository;
  }

  const { prismaShareLinkRepository } = await import(
    "@/lib/workspace/prismaShareLinkRepository"
  );
  cachedRepository = prismaShareLinkRepository;
  return cachedRepository;
}

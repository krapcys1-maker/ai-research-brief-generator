import { inMemoryBriefRepository } from "@/lib/storage/inMemoryBriefStore";
import type { BriefRepository } from "@/lib/storage/types";

let cachedRepository: BriefRepository | null = null;

export function getPersistenceStatus() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const hasDatabaseUrl = Boolean(databaseUrl);
  const hasValidPostgresUrl =
    databaseUrl?.startsWith("postgresql://") ||
    databaseUrl?.startsWith("postgres://") ||
    false;

  return {
    mode: hasValidPostgresUrl ? "postgresql" : "memory",
    hasDatabaseUrl,
    hasValidPostgresUrl,
    warning:
      hasDatabaseUrl && !hasValidPostgresUrl
        ? "DATABASE_URL is present but is not a valid PostgreSQL URL. Falling back to in-memory storage."
        : null
  };
}

export function resetBriefRepositoryForTests() {
  cachedRepository = null;
}

export async function getBriefRepository(): Promise<BriefRepository> {
  if (cachedRepository) {
    return cachedRepository;
  }

  if (!getPersistenceStatus().hasValidPostgresUrl) {
    cachedRepository = inMemoryBriefRepository;
    return cachedRepository;
  }

  const { prismaBriefRepository } = await import(
    "@/lib/storage/prismaBriefRepository"
  );
  cachedRepository = prismaBriefRepository;
  return cachedRepository;
}

import { inMemoryBriefRepository } from "@/lib/storage/inMemoryBriefStore";
import type { BriefRepository } from "@/lib/storage/types";

let cachedRepository: BriefRepository | null = null;

function parseBoolean(value: string | undefined) {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export function getPersistenceStatus() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const hasDatabaseUrl = Boolean(databaseUrl);
  const hasValidPostgresUrl =
    databaseUrl?.startsWith("postgresql://") ||
    databaseUrl?.startsWith("postgres://") ||
    false;
  const isProduction = process.env.NODE_ENV === "production";
  const allowsMemoryStorage =
    !isProduction || parseBoolean(process.env.ALLOW_MEMORY_STORAGE_IN_PRODUCTION);
  const mode = hasValidPostgresUrl ? "postgresql" : "memory";
  const fatalError =
    mode === "memory" && !allowsMemoryStorage
      ? "Production requires a valid PostgreSQL DATABASE_URL. Set DATABASE_URL to a PostgreSQL connection string or explicitly set ALLOW_MEMORY_STORAGE_IN_PRODUCTION=true for temporary non-durable mode."
      : null;
  const fallbackWarning =
    hasDatabaseUrl && !hasValidPostgresUrl
      ? "DATABASE_URL is present but is not a valid PostgreSQL URL. Falling back to in-memory storage."
      : null;
  const productionMemoryWarning =
    mode === "memory" && isProduction && allowsMemoryStorage
      ? "Production is running with in-memory storage because ALLOW_MEMORY_STORAGE_IN_PRODUCTION=true. Generated briefs will not persist across restarts."
      : null;

  return {
    mode,
    hasDatabaseUrl,
    hasValidPostgresUrl,
    isProduction,
    allowsMemoryStorage,
    fatalError,
    warning: fatalError ?? productionMemoryWarning ?? fallbackWarning
  };
}

export function resetBriefRepositoryForTests() {
  cachedRepository = null;
}

export async function getBriefRepository(): Promise<BriefRepository> {
  if (cachedRepository) {
    return cachedRepository;
  }

  const persistence = getPersistenceStatus();

  if (persistence.fatalError) {
    throw new Error(persistence.fatalError);
  }

  if (!persistence.hasValidPostgresUrl) {
    cachedRepository = inMemoryBriefRepository;
    return cachedRepository;
  }

  const { prismaBriefRepository } = await import(
    "@/lib/storage/prismaBriefRepository"
  );
  cachedRepository = prismaBriefRepository;
  return cachedRepository;
}

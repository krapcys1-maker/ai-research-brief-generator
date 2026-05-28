import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getBriefRepository,
  getPersistenceStatus,
  resetBriefRepositoryForTests
} from "@/lib/storage/repository";
import { inMemoryBriefRepository } from "@/lib/storage/inMemoryBriefStore";

const originalDatabaseUrl = process.env.DATABASE_URL;
const originalAllowMemoryStorageInProduction =
  process.env.ALLOW_MEMORY_STORAGE_IN_PRODUCTION;
const originalNodeEnv = process.env.NODE_ENV;

function restoreEnvValue(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

describe("storage repository selection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    restoreEnvValue("DATABASE_URL", originalDatabaseUrl);
    restoreEnvValue(
      "ALLOW_MEMORY_STORAGE_IN_PRODUCTION",
      originalAllowMemoryStorageInProduction
    );
    restoreEnvValue("NODE_ENV", originalNodeEnv);
    resetBriefRepositoryForTests();
  });

  it("falls back to memory when DATABASE_URL is missing", async () => {
    delete process.env.DATABASE_URL;
    resetBriefRepositoryForTests();

    expect(getPersistenceStatus()).toMatchObject({
      mode: "memory",
      hasDatabaseUrl: false,
      hasValidPostgresUrl: false,
      fatalError: null,
      warning: null
    });
    expect(await getBriefRepository()).toBe(inMemoryBriefRepository);
  });

  it("falls back to memory when DATABASE_URL is not PostgreSQL", async () => {
    process.env.DATABASE_URL = "not-a-postgres-url";
    resetBriefRepositoryForTests();

    expect(getPersistenceStatus()).toMatchObject({
      mode: "memory",
      hasDatabaseUrl: true,
      hasValidPostgresUrl: false,
      fatalError: null
    });
    expect(getPersistenceStatus().warning).toContain("Falling back");
    expect(await getBriefRepository()).toBe(inMemoryBriefRepository);
  });

  it("reports PostgreSQL mode for valid PostgreSQL URLs", () => {
    process.env.DATABASE_URL =
      "postgresql://user:password@localhost:5432/ai_brief_generator";
    resetBriefRepositoryForTests();

    expect(getPersistenceStatus()).toMatchObject({
      mode: "postgresql",
      hasDatabaseUrl: true,
      hasValidPostgresUrl: true,
      fatalError: null,
      warning: null
    });
  });

  it("fails fast in production when DATABASE_URL is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.DATABASE_URL;
    delete process.env.ALLOW_MEMORY_STORAGE_IN_PRODUCTION;
    resetBriefRepositoryForTests();

    expect(getPersistenceStatus()).toMatchObject({
      mode: "memory",
      hasDatabaseUrl: false,
      hasValidPostgresUrl: false,
      isProduction: true,
      allowsMemoryStorage: false
    });
    expect(getPersistenceStatus().fatalError).toContain(
      "Production requires a valid PostgreSQL DATABASE_URL"
    );
    await expect(getBriefRepository()).rejects.toThrow(
      "Production requires a valid PostgreSQL DATABASE_URL"
    );
  });

  it("fails fast in production when DATABASE_URL is not PostgreSQL", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.DATABASE_URL = "sqlite://local.db";
    delete process.env.ALLOW_MEMORY_STORAGE_IN_PRODUCTION;
    resetBriefRepositoryForTests();

    expect(getPersistenceStatus()).toMatchObject({
      mode: "memory",
      hasDatabaseUrl: true,
      hasValidPostgresUrl: false,
      isProduction: true,
      allowsMemoryStorage: false
    });
    await expect(getBriefRepository()).rejects.toThrow(
      "Production requires a valid PostgreSQL DATABASE_URL"
    );
  });

  it("allows explicit production memory storage escape hatch", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_MEMORY_STORAGE_IN_PRODUCTION", "true");
    delete process.env.DATABASE_URL;
    resetBriefRepositoryForTests();

    expect(getPersistenceStatus()).toMatchObject({
      mode: "memory",
      isProduction: true,
      allowsMemoryStorage: true,
      fatalError: null
    });
    expect(getPersistenceStatus().warning).toContain(
      "Production is running with in-memory storage"
    );
    expect(await getBriefRepository()).toBe(inMemoryBriefRepository);
  });
});

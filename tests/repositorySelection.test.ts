import { afterEach, describe, expect, it } from "vitest";
import {
  getBriefRepository,
  getPersistenceStatus,
  resetBriefRepositoryForTests
} from "@/lib/storage/repository";
import { inMemoryBriefRepository } from "@/lib/storage/inMemoryBriefStore";

const originalDatabaseUrl = process.env.DATABASE_URL;

describe("storage repository selection", () => {
  afterEach(() => {
    process.env.DATABASE_URL = originalDatabaseUrl;
    resetBriefRepositoryForTests();
  });

  it("falls back to memory when DATABASE_URL is missing", async () => {
    delete process.env.DATABASE_URL;
    resetBriefRepositoryForTests();

    expect(getPersistenceStatus()).toMatchObject({
      mode: "memory",
      hasDatabaseUrl: false,
      hasValidPostgresUrl: false,
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
      hasValidPostgresUrl: false
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
      warning: null
    });
  });
});

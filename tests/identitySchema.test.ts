import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  join(
    process.cwd(),
    "prisma/migrations/20260602193000_add_app_identity/migration.sql"
  ),
  "utf8"
);

describe("app-native identity schema", () => {
  it("defines users, workspaces, workspace members, and role values", () => {
    expect(schema).toContain("enum WorkspaceRole");
    expect(schema).toContain("OWNER  @map(\"owner\")");
    expect(schema).toContain("ADMIN  @map(\"admin\")");
    expect(schema).toContain("MEMBER @map(\"member\")");
    expect(schema).toContain("VIEWER @map(\"viewer\")");
    expect(schema).toContain("model User");
    expect(schema).toContain("email     String   @unique");
    expect(schema).toContain("model Workspace");
    expect(schema).toContain("ownerId   String");
    expect(schema).toContain("model WorkspaceMember");
    expect(schema).toContain("@@unique([workspaceId, userId])");
  });

  it("adds a migration for the identity tables and constraints", () => {
    expect(migration).toContain("CREATE TYPE \"WorkspaceRole\"");
    expect(migration).toContain("CREATE TABLE \"User\"");
    expect(migration).toContain("CREATE TABLE \"Workspace\"");
    expect(migration).toContain("CREATE TABLE \"WorkspaceMember\"");
    expect(migration).toContain("CREATE UNIQUE INDEX \"User_email_key\"");
    expect(migration).toContain("Workspace_ownerId_fkey");
    expect(migration).toContain("WorkspaceMember_workspaceId_userId_key");
  });
});

describe("brief workspace ownership schema", () => {
  const ownershipMigration = readFileSync(
    join(
      process.cwd(),
      "prisma/migrations/20260602195000_add_brief_workspace_ownership/migration.sql"
    ),
    "utf8"
  );

  it("adds visibility and ownership fields to briefs and jobs", () => {
    expect(schema).toContain("enum BriefVisibility");
    expect(schema).toContain("PRIVATE   @map(\"private\")");
    expect(schema).toContain("WORKSPACE @map(\"workspace\")");
    expect(schema).toContain("PUBLIC    @map(\"public\")");
    expect(schema).toContain("ownerId        String?");
    expect(schema).toContain("workspaceId    String?");
    expect(schema).toContain("createdByUserId String?");
    expect(schema).toContain("visibility     BriefVisibility @default(PRIVATE)");
  });

  it("adds a migration for brief and job ownership columns", () => {
    expect(ownershipMigration).toContain("CREATE TYPE \"BriefVisibility\"");
    expect(ownershipMigration).toContain(
      "ALTER TABLE \"Brief\" ADD COLUMN \"ownerId\" TEXT"
    );
    expect(ownershipMigration).toContain(
      "ALTER TABLE \"BriefGenerationJob\" ADD COLUMN \"workspaceId\" TEXT"
    );
    expect(ownershipMigration).toContain("Brief_workspaceId_fkey");
    expect(ownershipMigration).toContain("BriefGenerationJob_createdByUserId_fkey");
  });
});

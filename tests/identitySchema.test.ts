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

describe("compare report workspace ownership schema", () => {
  it("defines saved compare reports with user and workspace ownership", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const migration = readFileSync(
      "prisma/migrations/20260602203000_add_compare_report_ownership/migration.sql",
      "utf8"
    );

    expect(schema).toContain("model CompareReport");
    expect(schema).toContain("ownerSessionId  String?");
    expect(schema).toContain("ownerId         String?");
    expect(schema).toContain("workspaceId     String?");
    expect(schema).toContain("createdByUserId String?");
    expect(schema).toContain("reportJson      Json");
    expect(schema).toContain("@relation(\"CompareReportOwner\"");
    expect(schema).toContain("@relation(\"CompareReportCreator\"");
    expect(migration).toContain("CREATE TABLE \"CompareReport\"");
    expect(migration).toContain("\"visibility\" \"BriefVisibility\"");
    expect(migration).toContain("CompareReport_workspaceId_idx");
    expect(migration).toContain("CompareReport_ownerId_fkey");
    expect(migration).toContain("CompareReport_workspaceId_fkey");
  });
});

describe("research project workspace ownership schema", () => {
  it("defines saved research projects with user and workspace ownership", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const migration = readFileSync(
      "prisma/migrations/20260602213500_add_research_projects/migration.sql",
      "utf8"
    );

    expect(schema).toContain("model ResearchProject");
    expect(schema).toContain("ownedResearchProjects");
    expect(schema).toContain("researchProjects ResearchProject[]");
    expect(schema).toContain("sourcesJson     Json");
    expect(schema).toContain("@relation(\"ResearchProjectOwner\"");
    expect(schema).toContain("@relation(\"ResearchProjectCreator\"");
    expect(migration).toContain("CREATE TABLE \"ResearchProject\"");
    expect(migration).toContain("\"visibility\" \"BriefVisibility\"");
    expect(migration).toContain("ResearchProject_workspaceId_idx");
    expect(migration).toContain("ResearchProject_ownerId_fkey");
    expect(migration).toContain("ResearchProject_workspaceId_fkey");
  });
});

describe("brief collection workspace ownership schema", () => {
  it("defines saved brief collections with user and workspace ownership", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const migration = readFileSync(
      "prisma/migrations/20260602215000_add_brief_collections/migration.sql",
      "utf8"
    );

    expect(schema).toContain("model BriefCollection");
    expect(schema).toContain("ownedBriefCollections");
    expect(schema).toContain("briefCollections BriefCollection[]");
    expect(schema).toContain("briefIdsJson    Json");
    expect(schema).toContain("@relation(\"BriefCollectionOwner\"");
    expect(schema).toContain("@relation(\"BriefCollectionCreator\"");
    expect(migration).toContain("CREATE TABLE \"BriefCollection\"");
    expect(migration).toContain("\"visibility\" \"BriefVisibility\"");
    expect(migration).toContain("BriefCollection_workspaceId_idx");
    expect(migration).toContain("BriefCollection_ownerId_fkey");
    expect(migration).toContain("BriefCollection_workspaceId_fkey");
  });
});

describe("app-native user session schema", () => {
  it("defines durable user sessions with hashed tokens and revocation", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const migration = readFileSync(
      "prisma/migrations/20260602204500_add_app_user_sessions/migration.sql",
      "utf8"
    );

    expect(schema).toContain("model UserSession");
    expect(schema).toContain("tokenHash   String   @unique");
    expect(schema).toContain("expiresAt   DateTime");
    expect(schema).toContain("revokedAt   DateTime?");
    expect(schema).toContain("sessions         UserSession[]");
    expect(migration).toContain("CREATE TABLE \"UserSession\"");
    expect(migration).toContain("CREATE UNIQUE INDEX \"UserSession_tokenHash_key\"");
    expect(migration).toContain("UserSession_userId_fkey");
    expect(migration).toContain("UserSession_workspaceId_fkey");
  });
});

describe("full-text ingestion job schema", () => {
  it("defines durable full-text ingestion jobs with ownership and leases", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const migration = readFileSync(
      "prisma/migrations/20260602210500_add_fulltext_ingestion_jobs/migration.sql",
      "utf8"
    );

    expect(schema).toContain("model FullTextIngestionJob");
    expect(schema).toContain("papersJson      Json");
    expect(schema).toContain("optionsJson     Json?");
    expect(schema).toContain("resultJson      Json?");
    expect(schema).toContain("@relation(\"FullTextIngestionJobOwner\"");
    expect(schema).toContain("@@index([lockedAt])");
    expect(migration).toContain("CREATE TABLE \"FullTextIngestionJob\"");
    expect(migration).toContain("\"visibility\" \"BriefVisibility\"");
    expect(migration).toContain("FullTextIngestionJob_workspaceId_idx");
    expect(migration).toContain("FullTextIngestionJob_ownerId_fkey");
    expect(migration).toContain("FullTextIngestionJob_workspaceId_fkey");
  });
});

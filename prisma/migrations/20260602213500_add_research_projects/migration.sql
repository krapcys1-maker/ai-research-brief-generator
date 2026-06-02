CREATE TABLE "ResearchProject" (
    "id" TEXT NOT NULL,
    "ownerSessionId" TEXT,
    "ownerId" TEXT,
    "workspaceId" TEXT,
    "createdByUserId" TEXT,
    "visibility" "BriefVisibility" NOT NULL DEFAULT 'private',
    "title" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "description" TEXT,
    "sourcesJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchProject_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResearchProject_ownerSessionId_idx" ON "ResearchProject"("ownerSessionId");
CREATE INDEX "ResearchProject_ownerId_idx" ON "ResearchProject"("ownerId");
CREATE INDEX "ResearchProject_workspaceId_idx" ON "ResearchProject"("workspaceId");
CREATE INDEX "ResearchProject_createdByUserId_idx" ON "ResearchProject"("createdByUserId");
CREATE INDEX "ResearchProject_visibility_idx" ON "ResearchProject"("visibility");
CREATE INDEX "ResearchProject_createdAt_idx" ON "ResearchProject"("createdAt");

ALTER TABLE "ResearchProject" ADD CONSTRAINT "ResearchProject_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResearchProject" ADD CONSTRAINT "ResearchProject_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResearchProject" ADD CONSTRAINT "ResearchProject_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

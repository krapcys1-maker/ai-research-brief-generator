CREATE TABLE "BriefCollection" (
    "id" TEXT NOT NULL,
    "ownerSessionId" TEXT,
    "ownerId" TEXT,
    "workspaceId" TEXT,
    "createdByUserId" TEXT,
    "visibility" "BriefVisibility" NOT NULL DEFAULT 'private',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "briefIdsJson" JSONB NOT NULL,
    "briefCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BriefCollection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BriefCollection_ownerSessionId_idx" ON "BriefCollection"("ownerSessionId");
CREATE INDEX "BriefCollection_ownerId_idx" ON "BriefCollection"("ownerId");
CREATE INDEX "BriefCollection_workspaceId_idx" ON "BriefCollection"("workspaceId");
CREATE INDEX "BriefCollection_createdByUserId_idx" ON "BriefCollection"("createdByUserId");
CREATE INDEX "BriefCollection_visibility_idx" ON "BriefCollection"("visibility");
CREATE INDEX "BriefCollection_createdAt_idx" ON "BriefCollection"("createdAt");

ALTER TABLE "BriefCollection" ADD CONSTRAINT "BriefCollection_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BriefCollection" ADD CONSTRAINT "BriefCollection_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BriefCollection" ADD CONSTRAINT "BriefCollection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

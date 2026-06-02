CREATE TABLE "DocumentCollection" (
    "id" TEXT NOT NULL,
    "ownerSessionId" TEXT,
    "ownerId" TEXT,
    "workspaceId" TEXT,
    "createdByUserId" TEXT,
    "visibility" "BriefVisibility" NOT NULL DEFAULT 'private',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "documentIdsJson" JSONB NOT NULL,
    "documentCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentCollection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentCollection_ownerSessionId_idx" ON "DocumentCollection"("ownerSessionId");
CREATE INDEX "DocumentCollection_ownerId_idx" ON "DocumentCollection"("ownerId");
CREATE INDEX "DocumentCollection_workspaceId_idx" ON "DocumentCollection"("workspaceId");
CREATE INDEX "DocumentCollection_createdByUserId_idx" ON "DocumentCollection"("createdByUserId");
CREATE INDEX "DocumentCollection_visibility_idx" ON "DocumentCollection"("visibility");
CREATE INDEX "DocumentCollection_createdAt_idx" ON "DocumentCollection"("createdAt");

ALTER TABLE "DocumentCollection" ADD CONSTRAINT "DocumentCollection_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentCollection" ADD CONSTRAINT "DocumentCollection_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentCollection" ADD CONSTRAINT "DocumentCollection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "FullTextIngestionJob" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "stage" TEXT,
    "stageStartedAt" TIMESTAMP(3),
    "ownerSessionId" TEXT,
    "ownerId" TEXT,
    "workspaceId" TEXT,
    "createdByUserId" TEXT,
    "visibility" "BriefVisibility" NOT NULL DEFAULT 'private',
    "papersJson" JSONB NOT NULL,
    "optionsJson" JSONB,
    "resultJson" JSONB,
    "error" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 2,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FullTextIngestionJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FullTextIngestionJob_status_idx" ON "FullTextIngestionJob"("status");
CREATE INDEX "FullTextIngestionJob_ownerSessionId_idx" ON "FullTextIngestionJob"("ownerSessionId");
CREATE INDEX "FullTextIngestionJob_ownerId_idx" ON "FullTextIngestionJob"("ownerId");
CREATE INDEX "FullTextIngestionJob_workspaceId_idx" ON "FullTextIngestionJob"("workspaceId");
CREATE INDEX "FullTextIngestionJob_createdByUserId_idx" ON "FullTextIngestionJob"("createdByUserId");
CREATE INDEX "FullTextIngestionJob_visibility_idx" ON "FullTextIngestionJob"("visibility");
CREATE INDEX "FullTextIngestionJob_lockedAt_idx" ON "FullTextIngestionJob"("lockedAt");
CREATE INDEX "FullTextIngestionJob_createdAt_idx" ON "FullTextIngestionJob"("createdAt");

ALTER TABLE "FullTextIngestionJob" ADD CONSTRAINT "FullTextIngestionJob_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FullTextIngestionJob" ADD CONSTRAINT "FullTextIngestionJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FullTextIngestionJob" ADD CONSTRAINT "FullTextIngestionJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

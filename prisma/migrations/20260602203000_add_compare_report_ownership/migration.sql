CREATE TABLE "CompareReport" (
    "id" TEXT NOT NULL,
    "ownerSessionId" TEXT,
    "ownerId" TEXT,
    "workspaceId" TEXT,
    "createdByUserId" TEXT,
    "visibility" "BriefVisibility" NOT NULL DEFAULT 'private',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceDocumentId" TEXT,
    "claimCount" INTEGER NOT NULL,
    "requestJson" JSONB NOT NULL,
    "reportJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompareReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CompareReport_ownerSessionId_idx" ON "CompareReport"("ownerSessionId");
CREATE INDEX "CompareReport_ownerId_idx" ON "CompareReport"("ownerId");
CREATE INDEX "CompareReport_workspaceId_idx" ON "CompareReport"("workspaceId");
CREATE INDEX "CompareReport_createdByUserId_idx" ON "CompareReport"("createdByUserId");
CREATE INDEX "CompareReport_visibility_idx" ON "CompareReport"("visibility");
CREATE INDEX "CompareReport_createdAt_idx" ON "CompareReport"("createdAt");

ALTER TABLE "CompareReport" ADD CONSTRAINT "CompareReport_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompareReport" ADD CONSTRAINT "CompareReport_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CompareReport" ADD CONSTRAINT "CompareReport_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

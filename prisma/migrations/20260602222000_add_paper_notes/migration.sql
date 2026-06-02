CREATE TABLE "PaperNote" (
    "id" TEXT NOT NULL,
    "ownerSessionId" TEXT,
    "ownerId" TEXT,
    "workspaceId" TEXT,
    "createdByUserId" TEXT,
    "visibility" "BriefVisibility" NOT NULL DEFAULT 'private',
    "paperId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaperNote_ownerSessionId_idx" ON "PaperNote"("ownerSessionId");
CREATE INDEX "PaperNote_ownerId_idx" ON "PaperNote"("ownerId");
CREATE INDEX "PaperNote_workspaceId_idx" ON "PaperNote"("workspaceId");
CREATE INDEX "PaperNote_createdByUserId_idx" ON "PaperNote"("createdByUserId");
CREATE INDEX "PaperNote_paperId_idx" ON "PaperNote"("paperId");
CREATE INDEX "PaperNote_visibility_idx" ON "PaperNote"("visibility");
CREATE INDEX "PaperNote_createdAt_idx" ON "PaperNote"("createdAt");

ALTER TABLE "PaperNote" ADD CONSTRAINT "PaperNote_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaperNote" ADD CONSTRAINT "PaperNote_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaperNote" ADD CONSTRAINT "PaperNote_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaperNote" ADD CONSTRAINT "PaperNote_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

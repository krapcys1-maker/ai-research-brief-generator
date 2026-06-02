CREATE TABLE "ExportHistory" (
    "id" TEXT NOT NULL,
    "ownerSessionId" TEXT,
    "ownerId" TEXT,
    "workspaceId" TEXT,
    "createdByUserId" TEXT,
    "visibility" "BriefVisibility" NOT NULL DEFAULT 'private',
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "exportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExportHistory_ownerSessionId_idx" ON "ExportHistory"("ownerSessionId");
CREATE INDEX "ExportHistory_ownerId_idx" ON "ExportHistory"("ownerId");
CREATE INDEX "ExportHistory_workspaceId_idx" ON "ExportHistory"("workspaceId");
CREATE INDEX "ExportHistory_createdByUserId_idx" ON "ExportHistory"("createdByUserId");
CREATE INDEX "ExportHistory_visibility_idx" ON "ExportHistory"("visibility");
CREATE INDEX "ExportHistory_resourceType_idx" ON "ExportHistory"("resourceType");
CREATE INDEX "ExportHistory_resourceId_idx" ON "ExportHistory"("resourceId");
CREATE INDEX "ExportHistory_format_idx" ON "ExportHistory"("format");
CREATE INDEX "ExportHistory_exportedAt_idx" ON "ExportHistory"("exportedAt");

ALTER TABLE "ExportHistory" ADD CONSTRAINT "ExportHistory_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExportHistory" ADD CONSTRAINT "ExportHistory_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExportHistory" ADD CONSTRAINT "ExportHistory_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

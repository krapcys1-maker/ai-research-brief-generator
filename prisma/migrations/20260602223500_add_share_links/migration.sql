CREATE TABLE "ShareLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ownerSessionId" TEXT,
    "ownerId" TEXT,
    "workspaceId" TEXT,
    "createdByUserId" TEXT,
    "visibility" "BriefVisibility" NOT NULL DEFAULT 'private',
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShareLink_token_key" ON "ShareLink"("token");
CREATE INDEX "ShareLink_ownerSessionId_idx" ON "ShareLink"("ownerSessionId");
CREATE INDEX "ShareLink_ownerId_idx" ON "ShareLink"("ownerId");
CREATE INDEX "ShareLink_workspaceId_idx" ON "ShareLink"("workspaceId");
CREATE INDEX "ShareLink_createdByUserId_idx" ON "ShareLink"("createdByUserId");
CREATE INDEX "ShareLink_visibility_idx" ON "ShareLink"("visibility");
CREATE INDEX "ShareLink_resourceType_idx" ON "ShareLink"("resourceType");
CREATE INDEX "ShareLink_resourceId_idx" ON "ShareLink"("resourceId");
CREATE INDEX "ShareLink_createdAt_idx" ON "ShareLink"("createdAt");
CREATE INDEX "ShareLink_revokedAt_idx" ON "ShareLink"("revokedAt");

ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

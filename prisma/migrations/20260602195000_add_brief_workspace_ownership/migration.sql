CREATE TYPE "BriefVisibility" AS ENUM ('private', 'workspace', 'public');

ALTER TABLE "Brief" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "Brief" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Brief" ADD COLUMN "createdByUserId" TEXT;
ALTER TABLE "Brief" ADD COLUMN "visibility" "BriefVisibility" NOT NULL DEFAULT 'private';

ALTER TABLE "BriefGenerationJob" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "BriefGenerationJob" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "BriefGenerationJob" ADD COLUMN "createdByUserId" TEXT;
ALTER TABLE "BriefGenerationJob" ADD COLUMN "visibility" "BriefVisibility" NOT NULL DEFAULT 'private';

CREATE INDEX "Brief_ownerId_idx" ON "Brief"("ownerId");
CREATE INDEX "Brief_workspaceId_idx" ON "Brief"("workspaceId");
CREATE INDEX "Brief_createdByUserId_idx" ON "Brief"("createdByUserId");
CREATE INDEX "Brief_visibility_idx" ON "Brief"("visibility");

CREATE INDEX "BriefGenerationJob_ownerId_idx" ON "BriefGenerationJob"("ownerId");
CREATE INDEX "BriefGenerationJob_workspaceId_idx" ON "BriefGenerationJob"("workspaceId");
CREATE INDEX "BriefGenerationJob_createdByUserId_idx" ON "BriefGenerationJob"("createdByUserId");
CREATE INDEX "BriefGenerationJob_visibility_idx" ON "BriefGenerationJob"("visibility");

ALTER TABLE "Brief" ADD CONSTRAINT "Brief_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Brief" ADD CONSTRAINT "Brief_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Brief" ADD CONSTRAINT "Brief_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BriefGenerationJob" ADD CONSTRAINT "BriefGenerationJob_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BriefGenerationJob" ADD CONSTRAINT "BriefGenerationJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BriefGenerationJob" ADD CONSTRAINT "BriefGenerationJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

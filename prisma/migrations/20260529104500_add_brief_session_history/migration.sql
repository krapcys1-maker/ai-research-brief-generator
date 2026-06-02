ALTER TABLE "Brief"
ADD COLUMN "ownerSessionId" TEXT;

ALTER TABLE "BriefGenerationJob"
ADD COLUMN "ownerSessionId" TEXT;

CREATE INDEX "Brief_ownerSessionId_idx" ON "Brief"("ownerSessionId");
CREATE INDEX "BriefGenerationJob_ownerSessionId_idx" ON "BriefGenerationJob"("ownerSessionId");

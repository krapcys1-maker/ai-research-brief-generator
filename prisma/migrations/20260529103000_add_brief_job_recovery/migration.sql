ALTER TABLE "BriefGenerationJob"
ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "maxAttempts" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN "lockedAt" TIMESTAMP(3);

CREATE INDEX "BriefGenerationJob_lockedAt_idx" ON "BriefGenerationJob"("lockedAt");

CREATE TABLE "BriefGenerationJob" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestJson" JSONB NOT NULL,
    "briefId" TEXT,
    "error" TEXT,
    "qualityGateJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BriefGenerationJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BriefGenerationJob_status_idx" ON "BriefGenerationJob"("status");
CREATE INDEX "BriefGenerationJob_createdAt_idx" ON "BriefGenerationJob"("createdAt");

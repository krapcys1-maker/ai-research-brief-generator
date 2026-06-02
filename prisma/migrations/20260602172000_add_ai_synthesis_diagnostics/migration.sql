CREATE TABLE "AiSynthesisDiagnostic" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL,
    "paperCount" INTEGER NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSynthesisDiagnostic_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiSynthesisDiagnostic_createdAt_idx" ON "AiSynthesisDiagnostic"("createdAt");
CREATE INDEX "AiSynthesisDiagnostic_provider_idx" ON "AiSynthesisDiagnostic"("provider");
CREATE INDEX "AiSynthesisDiagnostic_status_idx" ON "AiSynthesisDiagnostic"("status");

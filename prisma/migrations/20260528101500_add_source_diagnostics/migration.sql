CREATE TABLE "SourceDiagnostic" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL,
    "cached" BOOLEAN NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceDiagnostic_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SourceDiagnostic_createdAt_idx" ON "SourceDiagnostic"("createdAt");
CREATE INDEX "SourceDiagnostic_source_idx" ON "SourceDiagnostic"("source");

CREATE TABLE "UserDocument" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "sessionId" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "textHash" TEXT,
    "privacyScope" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "UserDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserDocumentChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "ownerId" TEXT,
    "sessionId" TEXT,
    "sectionTitle" TEXT,
    "chunkIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "tokenEstimate" INTEGER NOT NULL,
    "pageStart" INTEGER,
    "pageEnd" INTEGER,
    "embeddingJson" JSONB,
    "embeddingModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDocumentChunk_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserDocument_ownerId_idx" ON "UserDocument"("ownerId");
CREATE INDEX "UserDocument_sessionId_idx" ON "UserDocument"("sessionId");
CREATE INDEX "UserDocument_status_idx" ON "UserDocument"("status");
CREATE INDEX "UserDocument_createdAt_idx" ON "UserDocument"("createdAt");
CREATE INDEX "UserDocumentChunk_documentId_idx" ON "UserDocumentChunk"("documentId");
CREATE INDEX "UserDocumentChunk_ownerId_idx" ON "UserDocumentChunk"("ownerId");
CREATE INDEX "UserDocumentChunk_sessionId_idx" ON "UserDocumentChunk"("sessionId");

ALTER TABLE "UserDocumentChunk" ADD CONSTRAINT "UserDocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UserDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

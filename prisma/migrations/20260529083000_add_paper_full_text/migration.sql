-- CreateTable
CREATE TABLE "PaperFullText" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "parserName" TEXT,
    "textHash" TEXT,
    "extractedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "qualityScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperFullText_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperTextChunk" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "fullTextId" TEXT NOT NULL,
    "sectionTitle" TEXT,
    "chunkIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "tokenEstimate" INTEGER NOT NULL,
    "pageStart" INTEGER,
    "pageEnd" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaperTextChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaperFullText_paperId_key" ON "PaperFullText"("paperId");

-- CreateIndex
CREATE INDEX "PaperFullText_status_idx" ON "PaperFullText"("status");

-- CreateIndex
CREATE INDEX "PaperFullText_sourceType_idx" ON "PaperFullText"("sourceType");

-- CreateIndex
CREATE INDEX "PaperTextChunk_paperId_idx" ON "PaperTextChunk"("paperId");

-- CreateIndex
CREATE INDEX "PaperTextChunk_fullTextId_idx" ON "PaperTextChunk"("fullTextId");

-- CreateIndex
CREATE UNIQUE INDEX "PaperTextChunk_fullTextId_chunkIndex_key" ON "PaperTextChunk"("fullTextId", "chunkIndex");

-- AddForeignKey
ALTER TABLE "PaperFullText" ADD CONSTRAINT "PaperFullText_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperTextChunk" ADD CONSTRAINT "PaperTextChunk_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperTextChunk" ADD CONSTRAINT "PaperTextChunk_fullTextId_fkey" FOREIGN KEY ("fullTextId") REFERENCES "PaperFullText"("id") ON DELETE CASCADE ON UPDATE CASCADE;

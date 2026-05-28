-- CreateTable
CREATE TABLE "Brief" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "outputLanguage" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "tldr" TEXT NOT NULL,
    "briefJson" JSONB NOT NULL,
    "totalFound" INTEGER NOT NULL,
    "totalUsed" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paper" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT,
    "authorsJson" JSONB NOT NULL,
    "year" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "doi" TEXT,
    "arxivId" TEXT,
    "semanticScholarId" TEXT,
    "openAlexId" TEXT,
    "sourceUrlsJson" JSONB NOT NULL,
    "pdfUrl" TEXT,
    "venue" TEXT,
    "citationCount" INTEGER,
    "influentialCitationCount" INTEGER,
    "source" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefPaper" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "relevanceScore" DOUBLE PRECISION,
    "citationScore" DOUBLE PRECISION,
    "recencyScore" DOUBLE PRECISION,
    "completenessScore" DOUBLE PRECISION,
    "sourceQualityScore" DOUBLE PRECISION,
    "identifierScore" DOUBLE PRECISION,
    "qualityScore" DOUBLE PRECISION,
    "finalScore" DOUBLE PRECISION,
    "usedInBrief" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BriefPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Paper_doi_idx" ON "Paper"("doi");

-- CreateIndex
CREATE INDEX "Paper_arxivId_idx" ON "Paper"("arxivId");

-- CreateIndex
CREATE INDEX "Paper_semanticScholarId_idx" ON "Paper"("semanticScholarId");

-- CreateIndex
CREATE INDEX "Paper_openAlexId_idx" ON "Paper"("openAlexId");

-- CreateIndex
CREATE INDEX "Paper_normalizedTitle_idx" ON "Paper"("normalizedTitle");

-- CreateIndex
CREATE UNIQUE INDEX "BriefPaper_briefId_paperId_key" ON "BriefPaper"("briefId", "paperId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiCache_cacheKey_key" ON "ApiCache"("cacheKey");

-- AddForeignKey
ALTER TABLE "BriefPaper" ADD CONSTRAINT "BriefPaper_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "Brief"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefPaper" ADD CONSTRAINT "BriefPaper_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

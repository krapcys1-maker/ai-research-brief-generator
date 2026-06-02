import { prisma } from "@/lib/storage/prismaClient";
import type {
  FullTextRepository,
  PaperFullText,
  PaperTextChunk,
  SavePaperFullTextInput
} from "@/lib/fulltext/types";

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function fullTextFromPrisma(record: {
  id: string;
  paperId: string;
  status: string;
  sourceType: string;
  sourceUrl: string | null;
  parserName: string | null;
  textHash: string | null;
  extractedAt: Date | null;
  errorMessage: string | null;
  qualityScore: number | null;
  createdAt: Date;
  updatedAt: Date;
}): PaperFullText {
  return {
    id: record.id,
    paperId: record.paperId,
    status:
      record.status === "unavailable" ||
      record.status === "available" ||
      record.status === "fetched" ||
      record.status === "parsed" ||
      record.status === "failed"
        ? record.status
        : "not_checked",
    sourceType:
      record.sourceType === "arxiv" ||
      record.sourceType === "source_pdf_url" ||
      record.sourceType === "open_access" ||
      record.sourceType === "user_upload"
        ? record.sourceType
        : "none",
    sourceUrl: record.sourceUrl,
    parserName: record.parserName,
    textHash: record.textHash,
    extractedAt: record.extractedAt?.toISOString() ?? null,
    errorMessage: record.errorMessage,
    qualityScore: record.qualityScore,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt)
  };
}

function chunkFromPrisma(record: {
  id: string;
  paperId: string;
  fullTextId: string;
  sectionTitle: string | null;
  chunkIndex: number;
  text: string;
  tokenEstimate: number;
  pageStart: number | null;
  pageEnd: number | null;
  createdAt: Date;
}): PaperTextChunk {
  return {
    id: record.id,
    paperId: record.paperId,
    fullTextId: record.fullTextId,
    sectionTitle: record.sectionTitle,
    chunkIndex: record.chunkIndex,
    text: record.text,
    tokenEstimate: record.tokenEstimate,
    pageStart: record.pageStart,
    pageEnd: record.pageEnd,
    evidenceLevel: "full_text_supported",
    createdAt: record.createdAt.toISOString()
  };
}

export const prismaFullTextRepository: FullTextRepository = {
  async save(input: SavePaperFullTextInput) {
    await prisma.$transaction(async (tx) => {
      await tx.paperFullText.upsert({
        where: { paperId: input.fullText.paperId },
        create: {
          id: input.fullText.id,
          paperId: input.fullText.paperId,
          status: input.fullText.status,
          sourceType: input.fullText.sourceType,
          sourceUrl: input.fullText.sourceUrl,
          parserName: input.fullText.parserName,
          textHash: input.fullText.textHash,
          extractedAt: input.fullText.extractedAt
            ? new Date(input.fullText.extractedAt)
            : null,
          errorMessage: input.fullText.errorMessage,
          qualityScore: input.fullText.qualityScore
        },
        update: {
          status: input.fullText.status,
          sourceType: input.fullText.sourceType,
          sourceUrl: input.fullText.sourceUrl,
          parserName: input.fullText.parserName,
          textHash: input.fullText.textHash,
          extractedAt: input.fullText.extractedAt
            ? new Date(input.fullText.extractedAt)
            : null,
          errorMessage: input.fullText.errorMessage,
          qualityScore: input.fullText.qualityScore
        }
      });

      await tx.paperTextChunk.deleteMany({
        where: { paperId: input.fullText.paperId }
      });

      if (input.chunks.length) {
        await tx.paperTextChunk.createMany({
          data: input.chunks.map((chunk) => ({
            id: chunk.id,
            paperId: chunk.paperId,
            fullTextId: chunk.fullTextId,
            sectionTitle: chunk.sectionTitle,
            chunkIndex: chunk.chunkIndex,
            text: chunk.text,
            tokenEstimate: chunk.tokenEstimate,
            pageStart: chunk.pageStart,
            pageEnd: chunk.pageEnd
          }))
        });
      }
    });

    const saved = await this.getByPaperId(input.fullText.paperId);
    if (!saved) {
      throw new Error("Paper full text was not saved.");
    }

    return saved;
  },

  async getByPaperId(paperId: string) {
    const record = await prisma.paperFullText.findUnique({
      where: { paperId }
    });

    return record ? fullTextFromPrisma(record) : null;
  },

  async getChunksByPaperIds(paperIds: string[]) {
    if (!paperIds.length) {
      return [];
    }

    const records = await prisma.paperTextChunk.findMany({
      where: { paperId: { in: paperIds } },
      orderBy: [{ paperId: "asc" }, { chunkIndex: "asc" }]
    });

    return records.map(chunkFromPrisma);
  },

  async clear() {
    await prisma.$transaction([
      prisma.paperTextChunk.deleteMany(),
      prisma.paperFullText.deleteMany()
    ]);
  }
};

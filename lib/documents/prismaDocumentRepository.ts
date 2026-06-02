import type { Prisma } from "@prisma/client";
import type {
  DocumentSource,
  UserDocument,
  UserDocumentChunk
} from "@/lib/documents/schemas";
import type { DocumentRepository, SaveDocumentInput } from "@/lib/documents/types";
import { prisma } from "@/lib/storage/prismaClient";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toIso(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function ownershipWhere(source: DocumentSource) {
  if (source.ownerId) {
    return {
      ownerId: source.ownerId,
      workspaceId: source.workspaceId ?? null
    };
  }

  return { sessionId: source.sessionId ?? "__missing_session__" };
}

function documentFromPrisma(record: {
  id: string;
  ownerId: string | null;
  workspaceId: string | null;
  sessionId: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  textHash: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  privacyScope: string;
  errorMessage: string | null;
}): UserDocument {
  return {
    id: record.id,
    ownerId: record.ownerId,
    workspaceId: record.workspaceId,
    sessionId: record.sessionId,
    filename: record.filename,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    status:
      record.status === "uploaded" ||
      record.status === "extracting" ||
      record.status === "parsed" ||
      record.status === "failed" ||
      record.status === "deleted"
        ? record.status
        : "failed",
    textHash: record.textHash,
    createdAt: record.createdAt.toISOString(),
    deletedAt: toIso(record.deletedAt),
    privacyScope: record.privacyScope === "user" ? "user" : "session",
    errorMessage: record.errorMessage
  };
}

function chunkFromPrisma(record: {
  id: string;
  documentId: string;
  ownerId: string | null;
  workspaceId: string | null;
  sessionId: string | null;
  sectionTitle: string | null;
  chunkIndex: number;
  text: string;
  tokenEstimate: number;
  pageStart: number | null;
  pageEnd: number | null;
  embeddingJson: Prisma.JsonValue | null;
  embeddingModel: string | null;
}): UserDocumentChunk {
  return {
    id: record.id,
    documentId: record.documentId,
    ownerId: record.ownerId,
    workspaceId: record.workspaceId,
    sessionId: record.sessionId,
    sectionTitle: record.sectionTitle,
    chunkIndex: record.chunkIndex,
    text: record.text,
    tokenEstimate: record.tokenEstimate,
    pageStart: record.pageStart,
    pageEnd: record.pageEnd,
    embedding: Array.isArray(record.embeddingJson)
      ? record.embeddingJson.filter((item): item is number => typeof item === "number")
      : null,
    embeddingModel: record.embeddingModel,
    evidenceLevel: "uploaded_document_supported"
  };
}

export const prismaDocumentRepository: DocumentRepository = {
  async saveParsedDocument(input: SaveDocumentInput) {
    await prisma.$transaction(async (tx) => {
      await tx.userDocument.upsert({
        where: { id: input.document.id },
        create: {
          id: input.document.id,
          ownerId: input.document.ownerId,
          workspaceId: input.document.workspaceId,
          sessionId: input.document.sessionId,
          filename: input.document.filename,
          mimeType: input.document.mimeType,
          sizeBytes: input.document.sizeBytes,
          status: input.document.status,
          textHash: input.document.textHash,
          privacyScope: input.document.privacyScope,
          errorMessage: input.document.errorMessage
        },
        update: {
          filename: input.document.filename,
          mimeType: input.document.mimeType,
          sizeBytes: input.document.sizeBytes,
          status: input.document.status,
          textHash: input.document.textHash,
          deletedAt: null,
          errorMessage: input.document.errorMessage
        }
      });

      await tx.userDocumentChunk.deleteMany({
        where: { documentId: input.document.id }
      });

      for (const chunk of input.chunks) {
        await tx.userDocumentChunk.create({
          data: {
            id: chunk.id,
            documentId: chunk.documentId,
            ownerId: chunk.ownerId,
            workspaceId: chunk.workspaceId,
            sessionId: chunk.sessionId,
            sectionTitle: chunk.sectionTitle,
            chunkIndex: chunk.chunkIndex,
            text: chunk.text,
            tokenEstimate: chunk.tokenEstimate,
            pageStart: chunk.pageStart,
            pageEnd: chunk.pageEnd,
            embeddingJson: chunk.embedding ? asJson(chunk.embedding) : undefined,
            embeddingModel: chunk.embeddingModel
          }
        });
      }
    });

    return input.document;
  },

  async listDocuments(source: DocumentSource) {
    const records = await prisma.userDocument.findMany({
      where: {
        ...ownershipWhere(source),
        status: { not: "deleted" }
      },
      orderBy: { createdAt: "desc" }
    });

    return records.map(documentFromPrisma);
  },

  async getDocument(id: string, source: DocumentSource) {
    const record = await prisma.userDocument.findFirst({
      where: {
        id,
        ...ownershipWhere(source),
        status: { not: "deleted" }
      }
    });

    return record ? documentFromPrisma(record) : null;
  },

  async deleteDocument(id: string, source: DocumentSource) {
    const record = await prisma.userDocument.findFirst({
      where: {
        id,
        ...ownershipWhere(source),
        status: { not: "deleted" }
      }
    });

    if (!record) {
      return false;
    }

    await prisma.$transaction([
      prisma.userDocumentChunk.deleteMany({ where: { documentId: id } }),
      prisma.userDocument.update({
        where: { id },
        data: {
          status: "deleted",
          deletedAt: new Date()
        }
      })
    ]);

    return true;
  },

  async listChunks(input: { source: DocumentSource; documentIds?: string[] }) {
    const records = await prisma.userDocumentChunk.findMany({
      where: {
        ...ownershipWhere(input.source),
        document: {
          status: "parsed",
          ...(input.documentIds?.length
            ? { id: { in: input.documentIds } }
            : {})
        }
      },
      orderBy: [{ documentId: "asc" }, { chunkIndex: "asc" }]
    });

    return records.map(chunkFromPrisma);
  },

  async clear() {
    await prisma.$transaction([
      prisma.userDocumentChunk.deleteMany(),
      prisma.userDocument.deleteMany()
    ]);
  }
};

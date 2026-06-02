import type { DocumentRepository, SaveDocumentInput } from "@/lib/documents/types";
import type {
  DocumentSource,
  UserDocument,
  UserDocumentChunk
} from "@/lib/documents/schemas";

const globalForDocuments = globalThis as typeof globalThis & {
  __userDocuments?: Map<string, UserDocument>;
  __userDocumentChunks?: Map<string, UserDocumentChunk[]>;
};

const documents =
  globalForDocuments.__userDocuments ?? new Map<string, UserDocument>();
const chunks =
  globalForDocuments.__userDocumentChunks ??
  new Map<string, UserDocumentChunk[]>();

globalForDocuments.__userDocuments = documents;
globalForDocuments.__userDocumentChunks = chunks;

function ownsDocument(document: UserDocument, source: DocumentSource) {
  if (document.status === "deleted") {
    return false;
  }

  if (source.ownerId) {
    return (
      document.ownerId === source.ownerId &&
      document.workspaceId === (source.workspaceId ?? null)
    );
  }

  return Boolean(source.sessionId && document.sessionId === source.sessionId);
}

export const inMemoryDocumentRepository: DocumentRepository = {
  async saveParsedDocument(input: SaveDocumentInput) {
    documents.set(input.document.id, input.document);
    chunks.set(input.document.id, input.chunks);
    return input.document;
  },

  async listDocuments(source: DocumentSource) {
    return [...documents.values()]
      .filter((document) => ownsDocument(document, source))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getDocument(id: string, source: DocumentSource) {
    const document = documents.get(id);
    return document && ownsDocument(document, source) ? document : null;
  },

  async deleteDocument(id: string, source: DocumentSource) {
    const document = documents.get(id);

    if (!document || !ownsDocument(document, source)) {
      return false;
    }

    documents.set(id, {
      ...document,
      status: "deleted",
      deletedAt: new Date().toISOString()
    });
    chunks.delete(id);
    return true;
  },

  async listChunks(input: { source: DocumentSource; documentIds?: string[] }) {
    const allowedIds = new Set(
      (await this.listDocuments(input.source))
        .filter(
          (document) =>
            document.status === "parsed" &&
            (!input.documentIds?.length || input.documentIds.includes(document.id))
        )
        .map((document) => document.id)
    );

    return [...allowedIds].flatMap((documentId) => chunks.get(documentId) ?? []);
  },

  async clear() {
    documents.clear();
    chunks.clear();
  }
};

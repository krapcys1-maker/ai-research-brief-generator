import type {
  DocumentSource,
  UserDocument,
  UserDocumentChunk
} from "@/lib/documents/schemas";

export type SaveDocumentInput = {
  document: UserDocument;
  chunks: UserDocumentChunk[];
};

export type DocumentRepository = {
  saveParsedDocument(input: SaveDocumentInput): Promise<UserDocument>;
  listDocuments(source: DocumentSource): Promise<UserDocument[]>;
  getDocument(id: string, source: DocumentSource): Promise<UserDocument | null>;
  deleteDocument(id: string, source: DocumentSource): Promise<boolean>;
  listChunks(input: {
    source: DocumentSource;
    documentIds?: string[];
  }): Promise<UserDocumentChunk[]>;
  clear(): Promise<void>;
};

export type ExtractedDocumentText = {
  text: string;
  parserName: string;
  qualityScore: number;
};

import type { BriefVisibility } from "@/lib/storage/types";

export type DocumentCollectionOwnership = {
  ownerSessionId?: string | null;
  ownerId?: string | null;
  workspaceId?: string | null;
  createdByUserId?: string | null;
  visibility?: BriefVisibility;
};

export type SaveDocumentCollectionInput = DocumentCollectionOwnership & {
  title: string;
  description?: string | null;
  documentIds: string[];
};

export type StoredDocumentCollection = Required<DocumentCollectionOwnership> & {
  id: string;
  title: string;
  description: string | null;
  documentIds: string[];
  documentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DocumentCollectionListItem = StoredDocumentCollection;

export type DocumentCollectionFilter = DocumentCollectionOwnership;

export type DocumentCollectionRepository = {
  save(input: SaveDocumentCollectionInput): Promise<StoredDocumentCollection>;
  list(filter?: DocumentCollectionFilter): Promise<DocumentCollectionListItem[]>;
  clear(): Promise<void>;
};

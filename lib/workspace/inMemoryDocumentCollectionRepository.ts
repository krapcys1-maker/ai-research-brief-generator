import { randomUUID } from "node:crypto";
import type {
  DocumentCollectionFilter,
  DocumentCollectionRepository,
  SaveDocumentCollectionInput,
  StoredDocumentCollection
} from "@/lib/workspace/documentCollectionTypes";

const globalForDocumentCollections = globalThis as typeof globalThis & {
  __documentCollections?: Map<string, StoredDocumentCollection>;
};

const collections =
  globalForDocumentCollections.__documentCollections ??
  new Map<string, StoredDocumentCollection>();

globalForDocumentCollections.__documentCollections = collections;

function matchesFilter(
  collection: StoredDocumentCollection,
  filter?: DocumentCollectionFilter
) {
  if (!filter) {
    return true;
  }

  if ("ownerSessionId" in filter) {
    return (
      (collection.ownerSessionId ?? null) === (filter.ownerSessionId ?? null)
    );
  }

  if ("ownerId" in filter && collection.ownerId !== (filter.ownerId ?? null)) {
    return false;
  }

  if (
    "workspaceId" in filter &&
    collection.workspaceId !== (filter.workspaceId ?? null)
  ) {
    return false;
  }

  if (
    "createdByUserId" in filter &&
    collection.createdByUserId !== (filter.createdByUserId ?? null)
  ) {
    return false;
  }

  if ("visibility" in filter && collection.visibility !== filter.visibility) {
    return false;
  }

  return true;
}

export const inMemoryDocumentCollectionRepository: DocumentCollectionRepository = {
  async save(input: SaveDocumentCollectionInput) {
    const now = new Date().toISOString();
    const documentIds = [...new Set(input.documentIds)];
    const collection: StoredDocumentCollection = {
      id: `document_collection_${randomUUID()}`,
      title: input.title,
      description: input.description ?? null,
      documentIds,
      documentCount: documentIds.length,
      ownerSessionId: input.ownerSessionId ?? null,
      ownerId: input.ownerId ?? null,
      workspaceId: input.workspaceId ?? null,
      createdByUserId: input.createdByUserId ?? null,
      visibility: input.visibility ?? "private",
      createdAt: now,
      updatedAt: now
    };

    collections.set(collection.id, collection);
    return collection;
  },

  async list(filter) {
    return [...collections.values()]
      .filter((collection) => matchesFilter(collection, filter))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async clear() {
    collections.clear();
  }
};

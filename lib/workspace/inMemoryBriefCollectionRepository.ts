import { randomUUID } from "node:crypto";
import type {
  BriefCollectionFilter,
  BriefCollectionRepository,
  SaveBriefCollectionInput,
  StoredBriefCollection
} from "@/lib/workspace/briefCollectionTypes";

const globalForBriefCollections = globalThis as typeof globalThis & {
  __briefCollections?: Map<string, StoredBriefCollection>;
};

const collections =
  globalForBriefCollections.__briefCollections ??
  new Map<string, StoredBriefCollection>();

globalForBriefCollections.__briefCollections = collections;

function matchesFilter(
  collection: StoredBriefCollection,
  filter?: BriefCollectionFilter
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

export const inMemoryBriefCollectionRepository: BriefCollectionRepository = {
  async save(input: SaveBriefCollectionInput) {
    const now = new Date().toISOString();
    const briefIds = [...new Set(input.briefIds)];
    const collection: StoredBriefCollection = {
      id: `brief_collection_${randomUUID()}`,
      title: input.title,
      description: input.description ?? null,
      briefIds,
      briefCount: briefIds.length,
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

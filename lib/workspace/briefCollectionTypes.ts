import type { BriefVisibility } from "@/lib/storage/types";

export type BriefCollectionOwnership = {
  ownerSessionId?: string | null;
  ownerId?: string | null;
  workspaceId?: string | null;
  createdByUserId?: string | null;
  visibility?: BriefVisibility;
};

export type SaveBriefCollectionInput = BriefCollectionOwnership & {
  title: string;
  description?: string | null;
  briefIds: string[];
};

export type StoredBriefCollection = Required<BriefCollectionOwnership> & {
  id: string;
  title: string;
  description: string | null;
  briefIds: string[];
  briefCount: number;
  createdAt: string;
  updatedAt: string;
};

export type BriefCollectionListItem = StoredBriefCollection;

export type BriefCollectionFilter = BriefCollectionOwnership;

export type BriefCollectionRepository = {
  save(input: SaveBriefCollectionInput): Promise<StoredBriefCollection>;
  list(filter?: BriefCollectionFilter): Promise<BriefCollectionListItem[]>;
  clear(): Promise<void>;
};

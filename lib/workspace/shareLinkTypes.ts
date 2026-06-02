import type { BriefVisibility } from "@/lib/storage/types";

export type ShareLinkResourceType = "brief";

export type ShareLinkOwnership = {
  ownerSessionId?: string | null;
  ownerId?: string | null;
  workspaceId?: string | null;
  createdByUserId?: string | null;
  visibility?: BriefVisibility;
};

export type SaveShareLinkInput = ShareLinkOwnership & {
  resourceType: ShareLinkResourceType;
  resourceId: string;
  title: string;
};

export type StoredShareLink = Required<ShareLinkOwnership> & {
  id: string;
  token: string;
  resourceType: ShareLinkResourceType;
  resourceId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
};

export type ShareLinkListItem = StoredShareLink;

export type ShareLinkFilter = ShareLinkOwnership & {
  resourceType?: ShareLinkResourceType;
  resourceId?: string;
};

export type ShareLinkRepository = {
  save(input: SaveShareLinkInput): Promise<StoredShareLink>;
  list(filter?: ShareLinkFilter): Promise<ShareLinkListItem[]>;
  clear(): Promise<void>;
};

import { randomBytes, randomUUID } from "node:crypto";
import type {
  SaveShareLinkInput,
  ShareLinkFilter,
  ShareLinkRepository,
  StoredShareLink
} from "@/lib/workspace/shareLinkTypes";

const globalForShareLinks = globalThis as typeof globalThis & {
  __shareLinks?: Map<string, StoredShareLink>;
};

const links =
  globalForShareLinks.__shareLinks ?? new Map<string, StoredShareLink>();

globalForShareLinks.__shareLinks = links;

function token() {
  return randomBytes(16).toString("base64url");
}

function matchesFilter(link: StoredShareLink, filter?: ShareLinkFilter) {
  if (!filter) {
    return true;
  }

  if (
    "ownerSessionId" in filter &&
    (link.ownerSessionId ?? null) !== (filter.ownerSessionId ?? null)
  ) {
    return false;
  }

  if ("ownerId" in filter && link.ownerId !== (filter.ownerId ?? null)) {
    return false;
  }

  if (
    "workspaceId" in filter &&
    link.workspaceId !== (filter.workspaceId ?? null)
  ) {
    return false;
  }

  if (
    "createdByUserId" in filter &&
    link.createdByUserId !== (filter.createdByUserId ?? null)
  ) {
    return false;
  }

  if ("visibility" in filter && link.visibility !== filter.visibility) {
    return false;
  }

  if ("resourceType" in filter && link.resourceType !== filter.resourceType) {
    return false;
  }

  if ("resourceId" in filter && link.resourceId !== filter.resourceId) {
    return false;
  }

  return link.revokedAt === null;
}

export const inMemoryShareLinkRepository: ShareLinkRepository = {
  async save(input: SaveShareLinkInput) {
    const now = new Date().toISOString();
    const link: StoredShareLink = {
      id: `share_link_${randomUUID()}`,
      token: token(),
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      title: input.title,
      ownerSessionId: input.ownerSessionId ?? null,
      ownerId: input.ownerId ?? null,
      workspaceId: input.workspaceId ?? null,
      createdByUserId: input.createdByUserId ?? null,
      visibility: input.visibility ?? "private",
      createdAt: now,
      updatedAt: now,
      revokedAt: null
    };

    links.set(link.id, link);
    return link;
  },

  async list(filter) {
    return [...links.values()]
      .filter((link) => matchesFilter(link, filter))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async clear() {
    links.clear();
  }
};

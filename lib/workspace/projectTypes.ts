import type { BriefVisibility } from "@/lib/storage/types";

export type ResearchProjectOwnership = {
  ownerSessionId?: string | null;
  ownerId?: string | null;
  workspaceId?: string | null;
  createdByUserId?: string | null;
  visibility?: BriefVisibility;
};

export type SaveResearchProjectInput = ResearchProjectOwnership & {
  title: string;
  query: string;
  description?: string | null;
  sources?: string[];
};

export type StoredResearchProject = Required<ResearchProjectOwnership> & {
  id: string;
  title: string;
  query: string;
  description: string | null;
  sources: string[];
  createdAt: string;
  updatedAt: string;
};

export type ResearchProjectListItem = StoredResearchProject;

export type ResearchProjectFilter = ResearchProjectOwnership;

export type ResearchProjectRepository = {
  save(input: SaveResearchProjectInput): Promise<StoredResearchProject>;
  list(filter?: ResearchProjectFilter): Promise<ResearchProjectListItem[]>;
  clear(): Promise<void>;
};

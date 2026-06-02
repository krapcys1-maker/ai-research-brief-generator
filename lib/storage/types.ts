import type { ResearchBrief } from "@/lib/ai/schemas";
import type { NormalizedPaper } from "@/lib/sources/types";

export type BriefVisibility = "private" | "workspace" | "public";

export type BriefOwnership = {
  ownerSessionId?: string | null;
  ownerId?: string | null;
  workspaceId?: string | null;
  createdByUserId?: string | null;
  visibility?: BriefVisibility;
};

export type StoredBrief = {
  brief: ResearchBrief;
  papers: NormalizedPaper[];
  createdAt: string;
} & Required<BriefOwnership>;

export type BriefListItem = {
  id: string;
  title: string;
  query: string;
  generatedAt: string;
  outputLanguage: string;
  createdAt: string;
  ownerId: string | null;
  workspaceId: string | null;
  createdByUserId: string | null;
  visibility: BriefVisibility;
};

export type SaveBriefInput = BriefOwnership & {
  brief: ResearchBrief;
  papers: NormalizedPaper[];
};

export type BriefListFilter = BriefOwnership;

export type BriefRepository = {
  saveWithPapers(input: SaveBriefInput): Promise<StoredBrief>;
  getById(id: string): Promise<StoredBrief | null>;
  list(filter?: BriefListFilter): Promise<StoredBrief[]>;
  listSummaries(filter?: BriefListFilter): Promise<BriefListItem[]>;
  clear(): Promise<void>;
};

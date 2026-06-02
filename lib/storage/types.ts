import type { ResearchBrief } from "@/lib/ai/schemas";
import type { NormalizedPaper } from "@/lib/sources/types";

export type StoredBrief = {
  brief: ResearchBrief;
  papers: NormalizedPaper[];
  createdAt: string;
  ownerSessionId?: string | null;
};

export type BriefListItem = {
  id: string;
  title: string;
  query: string;
  generatedAt: string;
  outputLanguage: string;
  createdAt: string;
};

export type SaveBriefInput = {
  brief: ResearchBrief;
  papers: NormalizedPaper[];
  ownerSessionId?: string | null;
};

export type BriefListFilter = {
  ownerSessionId?: string | null;
};

export type BriefRepository = {
  saveWithPapers(input: SaveBriefInput): Promise<StoredBrief>;
  getById(id: string): Promise<StoredBrief | null>;
  list(filter?: BriefListFilter): Promise<StoredBrief[]>;
  listSummaries(filter?: BriefListFilter): Promise<BriefListItem[]>;
  clear(): Promise<void>;
};

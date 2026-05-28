import type { ResearchBrief } from "@/lib/ai/schemas";
import type { NormalizedPaper } from "@/lib/sources/types";

export type StoredBrief = {
  brief: ResearchBrief;
  papers: NormalizedPaper[];
  createdAt: string;
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
};

export type BriefRepository = {
  saveWithPapers(input: SaveBriefInput): Promise<StoredBrief>;
  getById(id: string): Promise<StoredBrief | null>;
  list(): Promise<StoredBrief[]>;
  listSummaries(): Promise<BriefListItem[]>;
  clear(): Promise<void>;
};

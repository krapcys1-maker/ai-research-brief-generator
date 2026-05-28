import type { ResearchBrief } from "@/lib/ai/schemas";
import type { NormalizedPaper } from "@/lib/sources/types";

export type StoredBrief = {
  brief: ResearchBrief;
  papers: NormalizedPaper[];
  createdAt: string;
};

const globalForBriefStore = globalThis as typeof globalThis & {
  __researchBriefStore?: Map<string, StoredBrief>;
};

const store =
  globalForBriefStore.__researchBriefStore ??
  new Map<string, StoredBrief>();

globalForBriefStore.__researchBriefStore = store;

export function saveBriefWithPapers(input: {
  brief: ResearchBrief;
  papers: NormalizedPaper[];
}) {
  const record: StoredBrief = {
    ...input,
    createdAt: new Date().toISOString()
  };

  store.set(input.brief.id, record);
  return record;
}

export function getBriefRecord(id: string) {
  return store.get(id) ?? null;
}

export function listBriefRecords() {
  return [...store.values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export function clearBriefStore() {
  store.clear();
}

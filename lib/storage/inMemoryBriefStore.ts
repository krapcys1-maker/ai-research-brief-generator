import type {
  BriefRepository,
  SaveBriefInput,
  StoredBrief
} from "@/lib/storage/types";

const globalForBriefStore = globalThis as typeof globalThis & {
  __researchBriefStore?: Map<string, StoredBrief>;
};

const store =
  globalForBriefStore.__researchBriefStore ??
  new Map<string, StoredBrief>();

globalForBriefStore.__researchBriefStore = store;

function toSummary(record: StoredBrief) {
  return {
    id: record.brief.id,
    title: record.brief.title,
    query: record.brief.query,
    generatedAt: record.brief.generatedAt,
    outputLanguage: record.brief.outputLanguage,
    createdAt: record.createdAt
  };
}

export const inMemoryBriefRepository: BriefRepository = {
  async saveWithPapers(input: SaveBriefInput) {
    const record: StoredBrief = {
      ...input,
      createdAt: new Date().toISOString()
    };

    store.set(input.brief.id, record);
    return record;
  },

  async getById(id: string) {
    return store.get(id) ?? null;
  },

  async list() {
    return [...store.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  },

  async listSummaries() {
    const records = await this.list();
    return records.map(toSummary);
  },

  async clear() {
    store.clear();
  }
};

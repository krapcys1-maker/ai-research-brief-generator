import type {
  BriefListFilter,
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
    createdAt: record.createdAt,
    ownerId: record.ownerId,
    workspaceId: record.workspaceId,
    createdByUserId: record.createdByUserId,
    visibility: record.visibility
  };
}

export const inMemoryBriefRepository: BriefRepository = {
  async saveWithPapers(input: SaveBriefInput) {
    const record: StoredBrief = {
      ...input,
      ownerSessionId: input.ownerSessionId ?? null,
      ownerId: input.ownerId ?? null,
      workspaceId: input.workspaceId ?? null,
      createdByUserId: input.createdByUserId ?? null,
      visibility: input.visibility ?? "private",
      createdAt: new Date().toISOString()
    };

    store.set(input.brief.id, record);
    return record;
  },

  async getById(id: string) {
    return store.get(id) ?? null;
  },

  async list(filter?: BriefListFilter) {
    return [...store.values()]
      .filter((record) =>
        "ownerSessionId" in (filter ?? {})
          ? (record.ownerSessionId ?? null) === filter?.ownerSessionId
          : true
      )
      .filter((record) =>
        "ownerId" in (filter ?? {})
          ? (record.ownerId ?? null) === filter?.ownerId
          : true
      )
      .filter((record) =>
        "workspaceId" in (filter ?? {})
          ? (record.workspaceId ?? null) === filter?.workspaceId
          : true
      )
      .filter((record) =>
        "createdByUserId" in (filter ?? {})
          ? (record.createdByUserId ?? null) === filter?.createdByUserId
          : true
      )
      .filter((record) =>
        "visibility" in (filter ?? {})
          ? record.visibility === filter?.visibility
          : true
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listSummaries(filter?: BriefListFilter) {
    const records = await this.list(filter);
    return records.map(toSummary);
  },

  async clear() {
    store.clear();
  }
};

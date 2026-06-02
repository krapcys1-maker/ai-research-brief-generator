import type {
  FullTextRepository,
  PaperFullText,
  PaperTextChunk,
  SavePaperFullTextInput
} from "@/lib/fulltext/types";

const globalForFullTextStore = globalThis as typeof globalThis & {
  __paperFullTextStore?: Map<string, PaperFullText>;
  __paperTextChunkStore?: Map<string, PaperTextChunk[]>;
};

const fullTextStore =
  globalForFullTextStore.__paperFullTextStore ?? new Map<string, PaperFullText>();
const chunkStore =
  globalForFullTextStore.__paperTextChunkStore ?? new Map<string, PaperTextChunk[]>();

globalForFullTextStore.__paperFullTextStore = fullTextStore;
globalForFullTextStore.__paperTextChunkStore = chunkStore;

export const inMemoryFullTextRepository: FullTextRepository = {
  async save(input: SavePaperFullTextInput) {
    fullTextStore.set(input.fullText.paperId, input.fullText);
    chunkStore.set(input.fullText.paperId, input.chunks);
    return input.fullText;
  },

  async getByPaperId(paperId: string) {
    return fullTextStore.get(paperId) ?? null;
  },

  async getChunksByPaperIds(paperIds: string[]) {
    return paperIds.flatMap((paperId) => chunkStore.get(paperId) ?? []);
  },

  async clear() {
    fullTextStore.clear();
    chunkStore.clear();
  }
};

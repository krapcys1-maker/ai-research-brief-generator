import { getPersistenceStatus } from "@/lib/storage/repository";
import { inMemoryPaperNoteRepository } from "@/lib/workspace/inMemoryPaperNoteRepository";
import type { PaperNoteRepository } from "@/lib/workspace/paperNoteTypes";

let cachedRepository: PaperNoteRepository | null = null;

export function resetPaperNoteRepositoryForTests() {
  cachedRepository = null;
}

export async function getPaperNoteRepository(): Promise<PaperNoteRepository> {
  if (cachedRepository) {
    return cachedRepository;
  }

  const persistence = getPersistenceStatus();

  if (persistence.fatalError) {
    throw new Error(persistence.fatalError);
  }

  if (!persistence.hasValidPostgresUrl) {
    cachedRepository = inMemoryPaperNoteRepository;
    return cachedRepository;
  }

  const { prismaPaperNoteRepository } = await import(
    "@/lib/workspace/prismaPaperNoteRepository"
  );
  cachedRepository = prismaPaperNoteRepository;
  return cachedRepository;
}

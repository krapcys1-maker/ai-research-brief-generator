import { randomUUID } from "node:crypto";
import type {
  PaperNoteFilter,
  PaperNoteRepository,
  SavePaperNoteInput,
  StoredPaperNote
} from "@/lib/workspace/paperNoteTypes";

const globalForPaperNotes = globalThis as typeof globalThis & {
  __paperNotes?: Map<string, StoredPaperNote>;
};

const notes = globalForPaperNotes.__paperNotes ?? new Map<string, StoredPaperNote>();

globalForPaperNotes.__paperNotes = notes;

function matchesFilter(note: StoredPaperNote, filter?: PaperNoteFilter) {
  if (!filter) {
    return true;
  }

  if ("ownerSessionId" in filter) {
    return (note.ownerSessionId ?? null) === (filter.ownerSessionId ?? null);
  }

  if ("ownerId" in filter && note.ownerId !== (filter.ownerId ?? null)) {
    return false;
  }

  if ("workspaceId" in filter && note.workspaceId !== (filter.workspaceId ?? null)) {
    return false;
  }

  if (
    "createdByUserId" in filter &&
    note.createdByUserId !== (filter.createdByUserId ?? null)
  ) {
    return false;
  }

  if ("visibility" in filter && note.visibility !== filter.visibility) {
    return false;
  }

  return true;
}

export const inMemoryPaperNoteRepository: PaperNoteRepository = {
  async save(input: SavePaperNoteInput) {
    const now = new Date().toISOString();
    const note: StoredPaperNote = {
      id: `paper_note_${randomUUID()}`,
      paperId: input.paperId,
      note: input.note,
      ownerSessionId: input.ownerSessionId ?? null,
      ownerId: input.ownerId ?? null,
      workspaceId: input.workspaceId ?? null,
      createdByUserId: input.createdByUserId ?? null,
      visibility: input.visibility ?? "private",
      createdAt: now,
      updatedAt: now
    };

    notes.set(note.id, note);
    return note;
  },

  async list(filter) {
    return [...notes.values()]
      .filter((note) => matchesFilter(note, filter))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async clear() {
    notes.clear();
  }
};

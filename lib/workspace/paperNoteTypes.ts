import type { BriefVisibility } from "@/lib/storage/types";

export type PaperNoteOwnership = {
  ownerSessionId?: string | null;
  ownerId?: string | null;
  workspaceId?: string | null;
  createdByUserId?: string | null;
  visibility?: BriefVisibility;
};

export type SavePaperNoteInput = PaperNoteOwnership & {
  paperId: string;
  note: string;
};

export type StoredPaperNote = Required<PaperNoteOwnership> & {
  id: string;
  paperId: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type PaperNoteListItem = StoredPaperNote;

export type PaperNoteFilter = PaperNoteOwnership;

export type PaperNoteRepository = {
  save(input: SavePaperNoteInput): Promise<StoredPaperNote>;
  list(filter?: PaperNoteFilter): Promise<PaperNoteListItem[]>;
  clear(): Promise<void>;
};

import type { NormalizedPaper } from "@/lib/sources/types";

export type PaperFullTextStatus =
  | "not_checked"
  | "unavailable"
  | "available"
  | "fetched"
  | "parsed"
  | "failed";

export type FullTextSourceType =
  | "arxiv"
  | "source_pdf_url"
  | "open_access"
  | "user_upload"
  | "none";

export type EvidenceLevel =
  | "metadata_only"
  | "abstract_supported"
  | "full_text_supported";

export type FullTextCandidate = {
  status: "available" | "unavailable";
  sourceType: FullTextSourceType;
  sourceUrl: string | null;
  reason?: string;
};

export type PaperFullText = {
  id: string;
  paperId: string;
  status: PaperFullTextStatus;
  sourceType: FullTextSourceType;
  sourceUrl: string | null;
  parserName: string | null;
  textHash: string | null;
  extractedAt: string | null;
  errorMessage: string | null;
  qualityScore: number | null;
  createdAt: string;
  updatedAt: string;
};

export type PaperTextChunk = {
  id: string;
  paperId: string;
  fullTextId: string;
  sectionTitle: string | null;
  chunkIndex: number;
  text: string;
  tokenEstimate: number;
  pageStart: number | null;
  pageEnd: number | null;
  evidenceLevel: "full_text_supported";
  createdAt?: string;
};

export type SavePaperFullTextInput = {
  fullText: PaperFullText;
  chunks: PaperTextChunk[];
};

export type FullTextRepository = {
  save(input: SavePaperFullTextInput): Promise<PaperFullText>;
  getByPaperId(paperId: string): Promise<PaperFullText | null>;
  getChunksByPaperIds(paperIds: string[]): Promise<PaperTextChunk[]>;
  clear(): Promise<void>;
};

export type FullTextIngestionResult = {
  paper: NormalizedPaper;
  fullText: PaperFullText;
  chunks: PaperTextChunk[];
};

import type { IngestFullTextOptions } from "@/lib/fulltext/ingest";
import type { NormalizedPaper } from "@/lib/sources/types";
import type { BriefOwnership, BriefVisibility } from "@/lib/storage/types";

export type FullTextIngestionJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type FullTextIngestionJobStage =
  | "queued"
  | "ingestion"
  | "completed"
  | "failed";

export type SerializableFullTextIngestionOptions = Pick<
  IngestFullTextOptions,
  "limit" | "timeoutMs" | "maxBytes" | "includeMockPapers" | "pageRange"
>;

export type FullTextIngestionJobResult = {
  paperCount: number;
  processedCount: number;
  parsedCount: number;
  failedCount: number;
  unavailableCount: number;
  chunkCount: number;
  completedAt: string;
};

export type FullTextIngestionJob = BriefOwnership & {
  id: string;
  status: FullTextIngestionJobStatus;
  stage?: FullTextIngestionJobStage;
  stageStartedAt?: string;
  papers: NormalizedPaper[];
  options: SerializableFullTextIngestionOptions;
  result?: FullTextIngestionJobResult;
  error?: string;
  attemptCount: number;
  maxAttempts: number;
  lockedAt?: string;
  createdAt: string;
  updatedAt: string;
  visibility: BriefVisibility;
};

export type FullTextIngestionJobRepository = {
  create(job: FullTextIngestionJob): Promise<FullTextIngestionJob>;
  update(
    id: string,
    patch: Partial<FullTextIngestionJob>
  ): Promise<FullTextIngestionJob | null>;
  getById(id: string): Promise<FullTextIngestionJob | null>;
  claimNextQueued(): Promise<FullTextIngestionJob | null>;
  resetStaleRunning(staleMs: number): Promise<number>;
  clear(): Promise<void>;
};

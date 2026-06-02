import type { ClaimCheckReport, ClaimCheckRequest } from "@/lib/claimCheck/schemas";
import type { DocumentSource } from "@/lib/documents/schemas";
import type { BriefVisibility } from "@/lib/storage/types";

export type CompareJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "configuration_error"
  | "failed";

export type CompareJobStage =
  | "queued"
  | "retrieval"
  | "comparison"
  | "persistence"
  | "completed"
  | "failed";

export type CompareJobOwnership = {
  ownerSessionId?: string | null;
  ownerId?: string | null;
  workspaceId?: string | null;
  createdByUserId?: string | null;
  visibility?: BriefVisibility;
};

export type CompareJob = CompareJobOwnership & {
  id: string;
  status: CompareJobStatus;
  stage: CompareJobStage;
  stageStartedAt: string;
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  maxAttempts: number;
  lockedAt?: string;
  request: ClaimCheckRequest;
  documentSource: DocumentSource;
  reportId?: string;
  report?: ClaimCheckReport;
  error?: string;
};

export type CompareJobRepository = {
  create(job: CompareJob): Promise<CompareJob>;
  update(id: string, patch: Partial<CompareJob>): Promise<CompareJob | null>;
  getById(id: string): Promise<CompareJob | null>;
  clear(): Promise<void>;
};

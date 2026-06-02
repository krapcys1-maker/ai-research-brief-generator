import type { BriefRequest } from "@/lib/ai/schemas";
import type { ResearchQualityGateResult } from "@/lib/pipeline/qualityGate";

export type BriefJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "quality_gate_failed"
  | "configuration_error"
  | "failed";

export type BriefJobStage =
  | "queued"
  | "preflight"
  | "full_text_ingestion"
  | "synthesis"
  | "persistence"
  | "completed"
  | "failed";

export type BriefJob = {
  id: string;
  status: BriefJobStatus;
  stage?: BriefJobStage;
  stageStartedAt?: string;
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  maxAttempts: number;
  lockedAt?: string;
  ownerSessionId?: string | null;
  request: BriefRequest;
  briefId?: string;
  error?: string;
  qualityGate?: ResearchQualityGateResult;
};

export type BriefJobRepository = {
  create(job: BriefJob): Promise<BriefJob>;
  update(id: string, patch: Partial<BriefJob>): Promise<BriefJob | null>;
  getById(id: string): Promise<BriefJob | null>;
  claimNextQueued(): Promise<BriefJob | null>;
  resetStaleRunning(staleMs: number): Promise<number>;
  clear(): Promise<void>;
};

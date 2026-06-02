import type { ResearchBrief } from "@/lib/ai/schemas";
import {
  synthesizeBrief,
  type SynthesizeBriefInput
} from "@/lib/ai/synthesizeBrief";
import { ingestFullTextForPapers } from "@/lib/fulltext/ingest";
import { ResearchQualityGateError } from "@/lib/pipeline/qualityGate";
import { preflightBrief } from "@/lib/pipeline/preflightBrief";
import { searchAllSources } from "@/lib/sources";
import { getBriefRepository } from "@/lib/storage/repository";
import type { BriefOwnership } from "@/lib/storage/types";
import type { NormalizedPaper } from "@/lib/sources/types";

export type CreateBriefDependencies = {
  synthesize?: (input: SynthesizeBriefInput) => Promise<ResearchBrief>;
  search?: typeof searchAllSources;
  ingestFullText?: (papers: NormalizedPaper[]) => Promise<NormalizedPaper[]>;
};

export type CreateBriefOptions = BriefOwnership & {
  onStage?: (stage: CreateBriefStage) => void | Promise<void>;
};

export type CreateBriefStage =
  | "preflight"
  | "full_text_ingestion"
  | "synthesis"
  | "persistence"
  | "completed";

function createBriefId() {
  return `brief_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function numberEnv(name: string, fallback: number) {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function limitSearchSummary(
  searchSummary: SynthesizeBriefInput["searchSummary"],
  requestedCount: number,
  usedCount: number
) {
  if (usedCount >= requestedCount) {
    return searchSummary;
  }

  return {
    ...searchSummary,
    totalUsedInBrief: usedCount,
    warnings: [
      ...searchSummary.warnings,
      `brief synthesis limited to the top ${usedCount} selected papers for reliable structured generation.`
    ]
  };
}

export async function createBrief(
  rawInput: unknown,
  dependencies: CreateBriefDependencies = {},
  options: CreateBriefOptions = {}
) {
  const synthesize = dependencies.synthesize ?? synthesizeBrief;
  await options.onStage?.("preflight");
  const preflight = await preflightBrief(rawInput, {
    search: dependencies.search ?? searchAllSources
  });

  if (!preflight.qualityGate.canSynthesize) {
    throw new ResearchQualityGateError(preflight.qualityGate);
  }

  const selectedPapers = await (async () => {
    const ingest =
      dependencies.ingestFullText ??
      (async (papers: NormalizedPaper[]) => {
        if (process.env.NODE_ENV === "test") {
          return papers;
        }

        const result = await ingestFullTextForPapers(papers, {
          limit: numberEnv("BRIEF_FULL_TEXT_MAX_PAPERS", 3),
          timeoutMs: numberEnv("BRIEF_FULL_TEXT_FETCH_TIMEOUT_MS", 8000)
        });
        return result.papers;
      });

    try {
      await options.onStage?.("full_text_ingestion");
      return await ingest(preflight.selectedPapers);
    } catch {
      return preflight.selectedPapers;
    }
  })();

  const synthesisPaperLimit = Math.min(
    selectedPapers.length,
    numberEnv("BRIEF_SYNTHESIS_MAX_PAPERS", 5)
  );
  const synthesisPapers = selectedPapers.slice(0, synthesisPaperLimit);
  const synthesisSearchSummary = limitSearchSummary(
    preflight.searchSummary,
    selectedPapers.length,
    synthesisPapers.length
  );
  const id = createBriefId();
  await options.onStage?.("synthesis");
  const brief = await synthesize({
    id,
    query: preflight.request.query,
    outputLanguage: preflight.outputLanguage,
    queryVariants: preflight.queryVariants,
    papers: synthesisPapers,
    searchSummary: synthesisSearchSummary
  });

  await options.onStage?.("persistence");
  const briefRepository = await getBriefRepository();

  const record = await briefRepository.saveWithPapers({
    brief,
    papers: synthesisPapers,
    ownerSessionId: options.ownerSessionId ?? null,
    ownerId: options.ownerId ?? null,
    workspaceId: options.workspaceId ?? null,
    createdByUserId: options.createdByUserId ?? null,
    visibility: options.visibility ?? "private"
  });

  await options.onStage?.("completed");
  return record;
}

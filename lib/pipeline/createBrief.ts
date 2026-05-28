import type { ResearchBrief } from "@/lib/ai/schemas";
import {
  synthesizeBrief,
  type SynthesizeBriefInput
} from "@/lib/ai/synthesizeBrief";
import { ResearchQualityGateError } from "@/lib/pipeline/qualityGate";
import { preflightBrief } from "@/lib/pipeline/preflightBrief";
import { searchAllSources } from "@/lib/sources";
import { getBriefRepository } from "@/lib/storage/repository";

export type CreateBriefDependencies = {
  synthesize?: (input: SynthesizeBriefInput) => Promise<ResearchBrief>;
  search?: typeof searchAllSources;
};

function createBriefId() {
  return `brief_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export async function createBrief(
  rawInput: unknown,
  dependencies: CreateBriefDependencies = {}
) {
  const synthesize = dependencies.synthesize ?? synthesizeBrief;
  const preflight = await preflightBrief(rawInput, {
    search: dependencies.search ?? searchAllSources
  });

  if (!preflight.qualityGate.canSynthesize) {
    throw new ResearchQualityGateError(preflight.qualityGate);
  }

  const id = createBriefId();
  const brief = await synthesize({
    id,
    query: preflight.request.query,
    outputLanguage: preflight.outputLanguage,
    queryVariants: preflight.queryVariants,
    papers: preflight.selectedPapers,
    searchSummary: preflight.searchSummary
  });

  const briefRepository = await getBriefRepository();

  return briefRepository.saveWithPapers({
    brief,
    papers: preflight.selectedPapers
  });
}

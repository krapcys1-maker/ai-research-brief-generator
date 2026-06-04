import type {
  DiscoveredIdea,
  IdeaDiscoveryReport,
  IdeaScore,
  ProjectIdeaHandoffQuality
} from "@/lib/project-ideas/types";
import type { ProjectIdeaInput } from "@/lib/project-research";

export const FullPassSelectionMode = {
  Ready: "ready",
  Top: "top",
  NeedsReview: "needs-review"
} as const;

export type FullPassSelectionMode =
  (typeof FullPassSelectionMode)[keyof typeof FullPassSelectionMode];

export type FullPassSelectedIdea = {
  idea: DiscoveredIdea;
  projectIdeaInput: ProjectIdeaInput;
  score?: IdeaScore;
  handoff?: ProjectIdeaHandoffQuality;
};

function candidateRank(input: {
  score?: IdeaScore;
  handoff?: ProjectIdeaHandoffQuality;
}) {
  return (input.handoff?.score ?? 0) * 1000 + (input.score?.total ?? 0);
}

export function selectIdeaForFullPass(
  report: IdeaDiscoveryReport,
  mode: FullPassSelectionMode
): FullPassSelectedIdea | undefined {
  const scoreById = new Map(report.ideaScores.map((score) => [score.ideaId, score]));
  const handoffById = new Map(
    report.projectIdeaHandoffQuality.map((quality) => [quality.ideaId, quality])
  );

  const candidates = report.shortlist
    .map((idea, index) => ({
      idea,
      projectIdeaInput: report.projectIdeaInputs[index],
      score: scoreById.get(idea.ideaId),
      handoff: handoffById.get(idea.ideaId)
    }))
    .filter(
      (candidate): candidate is FullPassSelectedIdea =>
        candidate.projectIdeaInput !== undefined
    );

  const sorted = [...candidates].sort(
    (left, right) => candidateRank(right) - candidateRank(left)
  );

  if (mode === FullPassSelectionMode.Top) {
    return sorted[0];
  }

  if (mode === FullPassSelectionMode.NeedsReview) {
    return (
      sorted.find((candidate) => candidate.handoff?.readiness === "needs_review") ??
      sorted[0]
    );
  }

  return (
    sorted.find((candidate) => candidate.handoff?.readiness === "ready") ?? sorted[0]
  );
}

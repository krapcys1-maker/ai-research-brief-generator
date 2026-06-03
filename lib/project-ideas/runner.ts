import { ProjectIdeaInputSchema } from "@/lib/project-research/schemas";
import {
  IdeaDiscoveryInputSchema,
  IdeaDiscoveryReportSchema
} from "@/lib/project-ideas/schemas";
import { analyzeIdeaSourceRepos } from "@/lib/project-ideas/repoAnalyzer";
import { generateIdeasFromRepos } from "@/lib/project-ideas/ideaGenerator";
import { scoreIdeas } from "@/lib/project-ideas/ranker";
import type {
  DiscoveredIdea,
  IdeaDiscoveryReport,
  IdeaScore
} from "@/lib/project-ideas/types";

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function scoreFor(idea: DiscoveredIdea, scores: IdeaScore[]) {
  const score = scores.find((candidate) => candidate.ideaId === idea.ideaId);
  if (!score) {
    throw new Error(`Missing score for ${idea.ideaId}`);
  }

  return score;
}

function toProjectIdeaInput(idea: DiscoveredIdea, outputLanguage: string) {
  return ProjectIdeaInputSchema.parse({
    title: idea.title,
    description: `${idea.oneSentence} Problem: ${idea.problem}`,
    constraints: [...idea.nonGoals, ...idea.mvpScope.map((scope) => `MVP: ${scope}`)],
    preferredDomains: idea.domains,
    outputLanguage
  });
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function discoverProjectIdeas(value: unknown): IdeaDiscoveryReport {
  const input = IdeaDiscoveryInputSchema.parse(value);
  const repoInsights = analyzeIdeaSourceRepos(input.sourceRepos);
  const discoveredIdeas = generateIdeasFromRepos({
    repos: input.sourceRepos,
    insights: repoInsights,
    constraints: input.constraints
  });
  const ideaScores = scoreIdeas({
    ideas: discoveredIdeas,
    repos: input.sourceRepos,
    insights: repoInsights
  });
  const rejectedIdeas = discoveredIdeas.filter(
    (idea) => scoreFor(idea, ideaScores).verdict === "reject"
  );
  const shortlist = discoveredIdeas
    .filter((idea) => scoreFor(idea, ideaScores).verdict === "promising")
    .sort((left, right) => scoreFor(right, ideaScores).total - scoreFor(left, ideaScores).total)
    .slice(0, input.maxIdeas);
  const projectIdeaInputs = shortlist.map((idea) =>
    toProjectIdeaInput(idea, input.outputLanguage)
  );
  const shortlistedScores = shortlist.map((idea) => scoreFor(idea, ideaScores));
  const metrics = {
    ideaCount: discoveredIdeas.length,
    promisingCount: shortlist.length,
    cloneRejectedCount: ideaScores.filter(
      (score) =>
        score.verdict === "reject" &&
        (score.novelty < 0.55 ||
          score.reasons.some((reason) => reason.toLowerCase().includes("core workflow")))
    ).length,
    averageNovelty: Number(average(shortlistedScores.map((score) => score.novelty)).toFixed(3)),
    averageMvpFeasibility: Number(
      average(shortlistedScores.map((score) => score.mvpFeasibility)).toFixed(3)
    ),
    averageGithubSignalStrength: Number(
      average(shortlistedScores.map((score) => score.githubSignalStrength)).toFixed(3)
    ),
    researchReadyCount: shortlist.filter((idea) => idea.researchQuestions.length >= 2).length,
    pipelineInputValidCount: projectIdeaInputs.length
  };
  const report: IdeaDiscoveryReport = {
    id: `idea_discovery_${slug(input.domain)}`,
    generatedAt: new Date().toISOString(),
    input,
    sourceRepos: input.sourceRepos,
    repoInsights,
    discoveredIdeas,
    ideaScores,
    rejectedIdeas,
    shortlist,
    projectIdeaInputs,
    metrics
  };

  return IdeaDiscoveryReportSchema.parse(report);
}


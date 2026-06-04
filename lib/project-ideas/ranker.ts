import { IdeaScoreSchema } from "@/lib/project-ideas/schemas";
import { evaluateNovelty } from "@/lib/project-ideas/noveltyGuard";
import type {
  DiscoveredIdea,
  IdeaScore,
  IdeaSourceRepo,
  RepoInsight
} from "@/lib/project-ideas/types";

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function repoSignal(repo: IdeaSourceRepo) {
  const stars = Math.min(repo.stars / 5000, 1);
  const forks = Math.min(repo.forks / 500, 1);
  const issues = repo.openIssues ? Math.min(repo.openIssues / 100, 1) : 0.2;
  return clamp01(stars * 0.55 + forks * 0.25 + issues * 0.2);
}

function scoreProblem(idea: DiscoveredIdea) {
  return clamp01(idea.problem.length > 80 ? 0.95 : 0.75);
}

function scoreUsers(idea: DiscoveredIdea) {
  const genericUsers = new Set(["users", "people", "companies", "teams"]);
  const specificCount = idea.targetUsers.filter(
    (user) => !genericUsers.has(user.toLowerCase())
  ).length;
  return clamp01(0.45 + specificCount * 0.25);
}

function scoreMvp(idea: DiscoveredIdea) {
  const scoped = idea.mvpScope.length >= 3 ? 0.85 : 0.65;
  const hasNonGoals = idea.nonGoals.length > 0 ? 0.1 : 0;
  return clamp01(scoped + hasNonGoals);
}

function scoreResearchLeverage(idea: DiscoveredIdea) {
  return clamp01(0.35 + idea.researchQuestions.length * 0.2 + idea.domains.length * 0.05);
}

function scorePersonalUtility(idea: DiscoveredIdea) {
  const text = [
    idea.title,
    idea.oneSentence,
    idea.problem,
    ...idea.targetUsers,
    ...idea.mvpScope,
    ...idea.differentiation,
    ...idea.aiLeverage,
    ...idea.researchQuestions,
    ...idea.domains
  ].join(" ").toLowerCase();
  const personalBuilderTerms = [
    "developer",
    "developers",
    "builder",
    "builders",
    "coding",
    "code",
    "repo",
    "repository",
    "cursor",
    "agent",
    "workflow",
    "qa",
    "audit",
    "diagnostic",
    "reliability",
    "readiness",
    "monitor",
    "validator",
    "research",
    "learning",
    "local",
    "self-hosted",
    "automation",
    "tool"
  ];
  const matches = personalBuilderTerms.filter((term) => text.includes(term)).length;
  const hasConcreteWorkflow = idea.mvpScope.length >= 3 ? 0.2 : 0.05;
  const hasLearningOrLeverage =
    idea.researchQuestions.length >= 2 || idea.aiLeverage.length >= 2 ? 0.2 : 0.05;

  return clamp01(0.3 + Math.min(matches, 5) * 0.08 + hasConcreteWorkflow + hasLearningOrLeverage);
}

function scoreBusinessPotential(repo: IdeaSourceRepo, idea: DiscoveredIdea) {
  const buyerSignals = idea.targetUsers.some((user) =>
    ["teams", "clinicians", "teachers", "analysts", "traders", "leads"].some(
      (term) => user.toLowerCase().includes(term)
    )
  )
    ? 0.25
    : 0.1;
  return clamp01(0.35 + repoSignal(repo) * 0.35 + buyerSignals);
}

function riskPenalty(idea: DiscoveredIdea, cloneRejected: boolean) {
  let penalty = cloneRejected ? 0.25 : 0;

  if (idea.risks.length > 3) {
    penalty += 0.05;
  }

  return Math.min(0.3, Number(penalty.toFixed(2)));
}

function verdictFor(input: {
  total: number;
  cloneRejected: boolean;
  sourceCloneRisk: RepoInsight["cloneRisk"];
}) {
  if (input.cloneRejected || input.total < 60) {
    return "reject" as const;
  }

  if (input.total >= 90 && !input.cloneRejected) {
    return "promising" as const;
  }

  if (input.total >= 80 && input.sourceCloneRisk !== "high") {
    return "promising" as const;
  }

  return "needs_research" as const;
}

export function scoreIdea(input: {
  idea: DiscoveredIdea;
  repo: IdeaSourceRepo;
  insight: RepoInsight;
}): IdeaScore {
  const noveltyResult = evaluateNovelty({
    idea: input.idea,
    insight: input.insight
  });
  const problemClarity = scoreProblem(input.idea);
  const userSpecificity = scoreUsers(input.idea);
  const githubSignalStrength = repoSignal(input.repo);
  const novelty = noveltyResult.novelty;
  const mvpFeasibility = scoreMvp(input.idea);
  const researchLeverage = scoreResearchLeverage(input.idea);
  const personalUtility = scorePersonalUtility(input.idea);
  const businessPotential = scoreBusinessPotential(input.repo, input.idea);
  const riskPenaltyScore = riskPenalty(input.idea, noveltyResult.cloneRejected);
  const rawTotal =
    problemClarity * 16 +
    userSpecificity * 12 +
    githubSignalStrength * 12 +
    novelty * 18 +
    mvpFeasibility * 14 +
    researchLeverage * 10 +
    personalUtility * 13 +
    businessPotential * 5 -
    riskPenaltyScore * 100;
  const total = Math.max(0, Math.min(100, Number(rawTotal.toFixed(1))));
  const verdict = verdictFor({
    total,
    cloneRejected: noveltyResult.cloneRejected,
    sourceCloneRisk: input.insight.cloneRisk
  });
  const reasons = [
    ...noveltyResult.reasons,
    verdict === "promising"
      ? "Idea has enough novelty, MVP scope, and GitHub signal for research."
      : "Idea needs rejection or more research before entering the pipeline."
  ];

  return IdeaScoreSchema.parse({
    ideaId: input.idea.ideaId,
    total,
    problemClarity,
    userSpecificity,
    githubSignalStrength,
    novelty,
    mvpFeasibility,
    researchLeverage,
    personalUtility,
    businessPotential,
    riskPenalty: riskPenaltyScore,
    verdict,
    reasons
  });
}

export function scoreIdeas(input: {
  ideas: DiscoveredIdea[];
  repos: IdeaSourceRepo[];
  insights: RepoInsight[];
}) {
  const reposById = new Map(input.repos.map((repo) => [repo.repoId, repo]));
  const insightsById = new Map(
    input.insights.map((insight) => [insight.repoId, insight])
  );

  return input.ideas.map((idea) => {
    const repoId = idea.sourceRepos[0];
    const repo = reposById.get(repoId);
    const insight = insightsById.get(repoId);

    if (!repo || !insight) {
      throw new Error(`Missing source repo or insight for idea ${idea.ideaId}`);
    }

    return scoreIdea({ idea, repo, insight });
  });
}

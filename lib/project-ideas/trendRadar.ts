import { TrendRadarReportSchema } from "@/lib/project-ideas/schemas";
import type {
  GhArchiveTrendRepo,
  IdeaSourceRepo,
  RepoInsight,
  TrendRadarCategory,
  TrendRadarRepoSignal,
  TrendRadarReport
} from "@/lib/project-ideas/types";

type BuildTrendRadarInput = {
  sourceRepos: IdeaSourceRepo[];
  repoInsights: RepoInsight[];
  ghArchiveTrendRepos?: GhArchiveTrendRepo[];
  generatedAt?: string;
};

const categoryRules = [
  {
    category: "AI agents and workflow automation",
    terms: ["agent", "tool", "workflow", "automation", "orchestration"],
    angles: [
      "agent run evaluator with repeatable scoring and failure triage",
      "workflow planner that converts messy tasks into auditable execution plans",
      "operator dashboard for human approval before agent actions"
    ]
  },
  {
    category: "LLM infrastructure and model operations",
    terms: ["llm", "inference", "model", "rag", "retrieval", "eval", "benchmark"],
    angles: [
      "model release checklist with cost, regression, and rollback gates",
      "RAG quality monitor that finds weak citations before deployment",
      "local model operations cockpit for small teams"
    ]
  },
  {
    category: "AI developer tools",
    terms: ["developer", "repo", "code", "pull request", "github", "review"],
    angles: [
      "technical debt sprint planner from repo and issue evidence",
      "PR risk radar that groups risky changes by product impact",
      "engineering planning assistant for refactors, not line-level review"
    ]
  },
  {
    category: "AI data and analytics agents",
    terms: ["data", "analytics", "csv", "warehouse", "dashboard", "quality"],
    angles: [
      "data quality investigation agent before dashboard creation",
      "analytics incident explainer for broken metrics",
      "CSV-to-audit-report workflow for operations teams"
    ]
  },
  {
    category: "AI finance and strategy validation",
    terms: ["trading", "market", "portfolio", "backtest", "strategy"],
    angles: [
      "paper-trading validation planner with overfitting checks",
      "strategy risk simulator before live brokerage automation",
      "market idea evidence gate for retail quant builders"
    ]
  },
  {
    category: "AI education workflows",
    terms: ["student", "lesson", "teacher", "education", "quiz"],
    angles: [
      "misconception radar for teacher lesson planning",
      "assessment feedback planner that keeps teachers in control",
      "course improvement queue from student error clusters"
    ]
  },
  {
    category: "AI health and evidence review",
    terms: ["medical", "clinical", "patient", "healthcare", "health"],
    angles: [
      "clinical documentation evidence auditor",
      "medical summary uncertainty checker for human review",
      "citation-preserving note review assistant"
    ]
  }
] as const;

function textOf(repo: IdeaSourceRepo, insight?: RepoInsight) {
  return [
    repo.name,
    repo.description,
    repo.topics.join(" "),
    repo.primaryLanguage ?? "",
    repo.readmeText,
    repo.issueSignals.map((issue) => `${issue.title} ${issue.body}`).join(" "),
    insight?.missingCapabilities.join(" ") ?? ""
  ]
    .join(" ")
    .toLowerCase();
}

function repoFullName(repo: IdeaSourceRepo) {
  return `${repo.owner}/${repo.name}`;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Number(value.toFixed(1))));
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function categoryFor(text: string) {
  const scored = categoryRules.map((rule) => ({
    rule,
    score: rule.terms.filter((term) => text.includes(term)).length
  }));
  scored.sort((left, right) => right.score - left.score);

  return scored[0]?.score ? scored[0].rule.category : "Emerging AI product workflows";
}

function trendByRepo(input: GhArchiveTrendRepo[] | undefined) {
  return new Map(
    (input ?? []).map((repo) => [repo.repoFullName.toLowerCase(), repo])
  );
}

function normalizedGithubSignal(repo: IdeaSourceRepo) {
  const stars = Math.min(repo.stars / 5000, 1) * 45;
  const forks = Math.min(repo.forks / 500, 1) * 25;
  const issues = Math.min((repo.openIssues ?? 10) / 100, 1) * 15;
  const readme = repo.readmeText.length > 250 ? 10 : 5;
  const pain = repo.issueSignals.length > 0 ? 5 : 0;
  return stars + forks + issues + readme + pain;
}

function scoreSexiness(text: string, repo: IdeaSourceRepo, trendScore: number) {
  const hotTerms = [
    "ai",
    "agent",
    "llm",
    "rag",
    "automation",
    "workflow",
    "inference",
    "eval",
    "local",
    "developer",
    "data"
  ];
  const termScore = hotTerms.filter((term) => text.includes(term)).length * 7;
  const trendBoost = Math.min(trendScore / 50, 25);
  const repoBoost = Math.min(repo.stars / 5000, 1) * 20;
  const painBoost = repo.issueSignals.length > 0 ? 10 : 0;

  return clampScore(25 + termScore + trendBoost + repoBoost + painBoost);
}

function scoreFeasibility(repo: IdeaSourceRepo, insight?: RepoInsight) {
  const languageBoost = ["typescript", "javascript", "python"].includes(
    (repo.primaryLanguage ?? "").toLowerCase()
  )
    ? 15
    : 5;
  const painBoost = repo.issueSignals.length > 0 ? 15 : 5;
  const scopeBoost = insight?.missingCapabilities.length ? 15 : 5;
  const repoSizePenalty = repo.stars > 20_000 ? 15 : 0;

  return clampScore(50 + languageBoost + painBoost + scopeBoost - repoSizePenalty);
}

function signalFor(input: {
  repo: IdeaSourceRepo;
  insight?: RepoInsight;
  trend?: GhArchiveTrendRepo;
  maxTrendScore: number;
}): TrendRadarRepoSignal {
  const text = textOf(input.repo, input.insight);
  const trendScore = input.trend?.trendScore ?? 0;
  const trendHeat =
    input.maxTrendScore > 0 ? (trendScore / input.maxTrendScore) * 65 : 0;
  const heatScore = clampScore(trendHeat + normalizedGithubSignal(input.repo) * 0.35);
  const sexinessScore = scoreSexiness(text, input.repo, trendScore);
  const feasibilityScore = scoreFeasibility(input.repo, input.insight);
  const category = categoryFor(text);
  const evidence = [
    `${input.repo.stars} stars, ${input.repo.forks} forks`,
    input.trend
      ? `GH Archive trend score ${input.trend.trendScore}`
      : "No GH Archive trend score attached",
    input.repo.issueSignals[0]?.title
      ? `Issue signal: ${input.repo.issueSignals[0].title}`
      : "No issue signal captured"
  ];

  return {
    repoId: input.repo.repoId,
    repoFullName: repoFullName(input.repo),
    category,
    heatScore,
    sexinessScore,
    feasibilityScore,
    trendScore,
    evidence
  };
}

function anglesFor(category: string) {
  return (
    categoryRules.find((rule) => rule.category === category)?.angles ?? [
      "evidence planner for a narrow AI workflow",
      "human-reviewed automation cockpit",
      "workflow risk and readiness checker"
    ]
  );
}

function whyHotFor(signals: TrendRadarRepoSignal[]) {
  const top = signals[0];
  const trendMention = top?.trendScore
    ? `Top repo has GH Archive trend score ${top.trendScore}.`
    : "Category is supported by GitHub popularity and repo evidence.";

  return [
    trendMention,
    `Average heat ${average(signals.map((signal) => signal.heatScore)).toFixed(1)} across ${signals.length} repo signal(s).`,
    "Issues/README evidence suggests productizable workflow gaps, not only abstract hype."
  ];
}

function categoryReports(signals: TrendRadarRepoSignal[]): TrendRadarCategory[] {
  const grouped = new Map<string, TrendRadarRepoSignal[]>();

  for (const signal of signals) {
    grouped.set(signal.category, [...(grouped.get(signal.category) ?? []), signal]);
  }

  return [...grouped.entries()]
    .map(([category, categorySignals]) => {
      const sorted = [...categorySignals].sort(
        (left, right) => right.heatScore - left.heatScore
      );

      return {
        category,
        repoCount: categorySignals.length,
        heatScore: clampScore(average(categorySignals.map((signal) => signal.heatScore))),
        sexinessScore: clampScore(
          average(categorySignals.map((signal) => signal.sexinessScore))
        ),
        feasibilityScore: clampScore(
          average(categorySignals.map((signal) => signal.feasibilityScore))
        ),
        representativeRepos: sorted.slice(0, 3).map((signal) => signal.repoFullName),
        whyHot: whyHotFor(sorted),
        opportunityAngles: anglesFor(category)
      };
    })
    .sort((left, right) => {
      const leftScore =
        left.heatScore * 0.45 + left.sexinessScore * 0.35 + left.feasibilityScore * 0.2;
      const rightScore =
        right.heatScore * 0.45 + right.sexinessScore * 0.35 + right.feasibilityScore * 0.2;
      return rightScore - leftScore;
    });
}

export function buildTrendRadar(input: BuildTrendRadarInput): TrendRadarReport {
  const insightsByRepo = new Map(input.repoInsights.map((insight) => [insight.repoId, insight]));
  const trends = trendByRepo(input.ghArchiveTrendRepos);
  const maxTrendScore = Math.max(
    0,
    ...(input.ghArchiveTrendRepos ?? []).map((repo) => repo.trendScore)
  );
  const repoSignals = input.sourceRepos
    .map((repo) =>
      signalFor({
        repo,
        insight: insightsByRepo.get(repo.repoId),
        trend: trends.get(repoFullName(repo).toLowerCase()),
        maxTrendScore
      })
    )
    .sort((left, right) => right.heatScore - left.heatScore);
  const categories = categoryReports(repoSignals);
  const topOpportunities = categories.slice(0, 5).map((category) => ({
    category: category.category,
    title: `${category.category} opportunity`,
    rationale: `${category.category} scores heat ${category.heatScore}, sexiness ${category.sexinessScore}, and feasibility ${category.feasibilityScore}.`,
    suggestedConstraints: [
      "do not clone the representative repositories",
      "keep MVP scope narrow enough for 2-4 weeks",
      category.opportunityAngles[0] ?? "focus on evidence-backed workflow planning"
    ]
  }));

  return TrendRadarReportSchema.parse({
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    repoSignals,
    categories,
    topOpportunities
  });
}

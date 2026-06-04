import type {
  DiscoveredIdea,
  GhArchiveTrendRepo,
  IdeaScore,
  IdeaSourceRepo,
  RepoInsight
} from "@/lib/project-ideas/types";

type SourceEvaluation = {
  repoId: string;
  repoFullName: string;
  score: number;
  trendScore: number;
  trendRank: number | null;
  relevanceScore: number;
  evidenceScore: number;
  freshnessScore: number;
  activityScore: number;
  reasons: string[];
  warnings: string[];
};

type IdeaSelection = {
  ideaId: string;
  title: string;
  selected: boolean;
  score: number;
  clusterKey: string;
  primarySource: string;
  supportingSources: string[];
  reasons: string[];
  warnings: string[];
};

type IdeaCluster = {
  key: string;
  title: string;
  candidateCount: number;
  supportingSources: string[];
  selectedIdeaId: string | null;
  rejectedIdeaIds: string[];
  reasons: string[];
};

export type SourceCurationReport = {
  generatedAt: string;
  sourceCount: number;
  evaluatedSources: SourceEvaluation[];
  warnings: string[];
};

export type IdeaSelectionReport = {
  generatedAt: string;
  candidateCount: number;
  promisingCandidateCount: number;
  selectedCount: number;
  duplicateClusterCount: number;
  clusters: IdeaCluster[];
  decisions: IdeaSelection[];
  warnings: string[];
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Number(value.toFixed(1))));
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function daysSince(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) {
    return 9999;
  }

  return Math.max(0, Math.round((Date.now() - time) / 86_400_000));
}

function repoFullName(repo: IdeaSourceRepo) {
  return `${repo.owner}/${repo.name}`;
}

function repoText(repo: IdeaSourceRepo, insight?: RepoInsight) {
  return [
    repo.name,
    repo.owner,
    repo.description,
    repo.topics.join(" "),
    repo.readmeText.slice(0, 8000),
    repo.issueSignals.map((issue) => `${issue.title} ${issue.body}`).join(" "),
    insight?.problemSolved,
    insight?.coreWorkflow,
    insight?.technicalMechanisms.join(" ")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function termScore(text: string, terms: string[]) {
  const matches = terms.filter((term) => text.includes(term)).length;
  return clamp01(matches / Math.max(terms.length, 1));
}

function trendLookup(trends?: GhArchiveTrendRepo[]) {
  const byRepo = new Map<string, { trend: GhArchiveTrendRepo; rank: number }>();

  for (const [index, trend] of (trends ?? []).entries()) {
    byRepo.set(trend.repoFullName.toLowerCase(), {
      trend,
      rank: index + 1
    });
  }

  return byRepo;
}

function evaluateSource(input: {
  repo: IdeaSourceRepo;
  insight?: RepoInsight;
  trend?: GhArchiveTrendRepo;
  trendRank: number | null;
  maxTrendScore: number;
  domain: string;
}): SourceEvaluation {
  const text = repoText(input.repo, input.insight);
  const domainText = input.domain.toLowerCase();
  const relevanceTerms = [
    "agent",
    "agents",
    "ai",
    "llm",
    "codex",
    "claude",
    "cursor",
    "developer",
    "code",
    "repo",
    "workflow",
    "automation",
    "research",
    "rag",
    "qa",
    "audit",
    "reliability",
    "benchmark",
    "eval",
    "evaluation",
    "monitor",
    "policy",
    "security",
    "self-hosted"
  ];
  const domainTerms = domainText
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 4);
  const trendNormalized = input.maxTrendScore
    ? (input.trend?.trendScore ?? 0) / input.maxTrendScore
    : 0;
  const readmeScore = clamp01(input.repo.readmeText.length / 10_000);
  const issueScore = clamp01(input.repo.issueSignals.length / 3);
  const evidenceScore = clamp01(readmeScore * 0.7 + issueScore * 0.3);
  const ageDays = daysSince(input.repo.createdAt);
  const pushedDays = daysSince(input.repo.pushedAt);
  const freshnessScore = clamp01(
    (ageDays <= 180 ? 0.55 : ageDays <= 540 ? 0.35 : 0.15) +
      (pushedDays <= 7 ? 0.35 : pushedDays <= 30 ? 0.2 : 0.05) +
      (input.trend ? 0.1 : 0)
  );
  const activityScore = clamp01(
    Math.min(input.repo.stars / 20_000, 1) * 0.25 +
      Math.min(input.repo.forks / 2_000, 1) * 0.15 +
      Math.min(input.repo.openIssues ?? 0, 500) / 500 * 0.2 +
      trendNormalized * 0.4
  );
  const relevanceScore = clamp01(
    termScore(text, relevanceTerms) * 0.75 + termScore(text, domainTerms) * 0.25
  );
  const warnings: string[] = [];
  const reasons: string[] = [];

  if (!input.trend) {
    warnings.push("No GH Archive trend signal attached.");
  } else {
    reasons.push(`GH Archive trend score ${input.trend.trendScore}.`);
  }

  if (input.repo.issueSignals.length === 0) {
    warnings.push("No issue pain signals were fetched.");
  }

  if (input.repo.readmeText.length < 1000) {
    warnings.push("README evidence is thin.");
  }

  if (relevanceScore < 0.25) {
    warnings.push("Repo looks weakly related to the requested discovery domain.");
  } else {
    reasons.push(`Domain/relevance score ${relevanceScore.toFixed(2)}.`);
  }

  if (freshnessScore >= 0.75) {
    reasons.push("Repo is fresh or recently active.");
  }

  const score = clampScore(
    trendNormalized * 30 +
      relevanceScore * 28 +
      evidenceScore * 17 +
      freshnessScore * 15 +
      activityScore * 10
  );

  return {
    repoId: input.repo.repoId,
    repoFullName: repoFullName(input.repo),
    score,
    trendScore: input.trend?.trendScore ?? 0,
    trendRank: input.trendRank,
    relevanceScore: Number(relevanceScore.toFixed(3)),
    evidenceScore: Number(evidenceScore.toFixed(3)),
    freshnessScore: Number(freshnessScore.toFixed(3)),
    activityScore: Number(activityScore.toFixed(3)),
    reasons,
    warnings
  };
}

export function buildSourceCurationReport(input: {
  sourceRepos: IdeaSourceRepo[];
  repoInsights: RepoInsight[];
  ghArchiveTrendRepos?: GhArchiveTrendRepo[];
  domain: string;
  generatedAt: string;
}): SourceCurationReport {
  const trendByRepo = trendLookup(input.ghArchiveTrendRepos);
  const insightByRepo = new Map(
    input.repoInsights.map((insight) => [insight.repoId, insight])
  );
  const maxTrendScore = Math.max(
    0,
    ...(input.ghArchiveTrendRepos ?? []).map((trend) => trend.trendScore)
  );
  const evaluatedSources = input.sourceRepos
    .map((repo) => {
      const trendHit = trendByRepo.get(repoFullName(repo).toLowerCase());

      return evaluateSource({
        repo,
        insight: insightByRepo.get(repo.repoId),
        trend: trendHit?.trend,
        trendRank: trendHit?.rank ?? null,
        maxTrendScore,
        domain: input.domain
      });
    })
    .sort((left, right) => right.score - left.score);
  const warnings = [
    ...(input.sourceRepos.length < 50
      ? [
          `Only ${input.sourceRepos.length} sources were evaluated; serious discovery should collect 50-300 before final curation.`
        ]
      : []),
    ...(input.ghArchiveTrendRepos?.length
      ? []
      : ["No GH Archive trend list was available for source curation."]),
    ...(evaluatedSources.filter((source) => source.warnings.length).length
      ? [
          `${evaluatedSources.filter((source) => source.warnings.length).length} sources have evidence, relevance or trend warnings.`
        ]
      : [])
  ];

  return {
    generatedAt: input.generatedAt,
    sourceCount: input.sourceRepos.length,
    evaluatedSources,
    warnings
  };
}

function conceptKey(idea: DiscoveredIdea) {
  const title = normalize(idea.title);
  const normalized = title
    .replace(/\bai\b/g, "")
    .replace(/\bllm\b/g, "")
    .replace(/\bconsole\b/g, "tool")
    .replace(/\bmonitor\b/g, "audit")
    .replace(/\baudit(or)?\b/g, "audit")
    .replace(/\bqa\b/g, "quality")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || title;
}

function ideaMismatchWarnings(input: {
  idea: DiscoveredIdea;
  repo: IdeaSourceRepo | undefined;
}) {
  const warnings: string[] = [];
  const text = input.repo ? repoText(input.repo) : "";
  const title = input.idea.title.toLowerCase();
  const clinicalTerms = ["clinical", "medical", "patient", "health"];
  const dataTerms = ["data quality", "warehouse", "analytics", "dataset"];

  if (
    clinicalTerms.some((term) => title.includes(term)) &&
    !clinicalTerms.some((term) => text.includes(term))
  ) {
    warnings.push("Clinical/medical idea title is weakly supported by source repo evidence.");
  }

  if (
    dataTerms.some((term) => title.includes(term)) &&
    !["data", "analytics", "dataset", "warehouse", "csv", "scrap"].some((term) =>
      text.includes(term)
    )
  ) {
    warnings.push("Data-quality idea title is weakly supported by source repo evidence.");
  }

  if (
    title.includes("llm release") &&
    !["llm", "model", "inference", "benchmark", "deployment", "release"].some((term) =>
      text.includes(term)
    )
  ) {
    warnings.push("LLM release-readiness idea is weakly supported by source repo evidence.");
  }

  if (title.includes("workflow evidence planner")) {
    warnings.push("Generic fallback idea should not enter the final shortlist without stronger domain evidence.");
  }

  return warnings;
}

function scoreFor(scores: IdeaScore[], ideaId: string) {
  const score = scores.find((candidate) => candidate.ideaId === ideaId);
  if (!score) {
    throw new Error(`Missing score for ${ideaId}`);
  }

  return score;
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

export function curateShortlistIdeas(input: {
  discoveredIdeas: DiscoveredIdea[];
  ideaScores: IdeaScore[];
  sourceRepos: IdeaSourceRepo[];
  sourceCuration: SourceCurationReport;
  maxIdeas: number;
  maxIdeasPerSource: number;
  generatedAt: string;
}) {
  const reposById = new Map(input.sourceRepos.map((repo) => [repo.repoId, repo]));
  const sourceScoreById = new Map(
    input.sourceCuration.evaluatedSources.map((source) => [source.repoId, source])
  );
  const promising = input.discoveredIdeas.filter(
    (idea) => scoreFor(input.ideaScores, idea.ideaId).verdict === "promising"
  );
  const clustersByKey = new Map<string, DiscoveredIdea[]>();

  for (const idea of promising) {
    const key = conceptKey(idea);
    clustersByKey.set(key, [...(clustersByKey.get(key) ?? []), idea]);
  }

  const rankedClusters = [...clustersByKey.entries()]
    .map(([key, ideas]) => {
      const rankedIdeas = [...ideas].sort((left, right) => {
        const leftSource = sourceScoreById.get(left.sourceRepos[0]);
        const rightSource = sourceScoreById.get(right.sourceRepos[0]);
        const leftScore =
          scoreFor(input.ideaScores, left.ideaId).total + (leftSource?.score ?? 0) * 0.12;
        const rightScore =
          scoreFor(input.ideaScores, right.ideaId).total + (rightSource?.score ?? 0) * 0.12;

        return rightScore - leftScore;
      });
      const representative = rankedIdeas[0];
      const representativeScore = scoreFor(input.ideaScores, representative.ideaId);
      const bestSourceScore =
        sourceScoreById.get(representative.sourceRepos[0])?.score ?? 0;
      const supportingSources = unique(rankedIdeas.flatMap((idea) => idea.sourceRepos));
      const clusterScore =
        representativeScore.total +
        bestSourceScore * 0.1 +
        Math.min(supportingSources.length - 1, 4) * 1.5;

      return {
        key,
        ideas: rankedIdeas,
        representative,
        supportingSources,
        clusterScore
      };
    })
    .sort((left, right) => right.clusterScore - left.clusterScore);

  const perSourceCounts = new Map<string, number>();
  const selected: DiscoveredIdea[] = [];
  const decisions: IdeaSelection[] = [];
  const clusters: IdeaCluster[] = [];

  for (const cluster of rankedClusters) {
    const representative = cluster.representative;
    const primarySource = representative.sourceRepos[0] ?? "unknown";
    const sourceCount = perSourceCounts.get(primarySource) ?? 0;
    const warnings = ideaMismatchWarnings({
      idea: representative,
      repo: reposById.get(primarySource)
    });
    const canSelect =
      selected.length < input.maxIdeas &&
      sourceCount < input.maxIdeasPerSource &&
      warnings.length === 0;
    const selectedIdea = canSelect
      ? {
          ...representative,
          sourceRepos: unique([
            ...representative.sourceRepos,
            ...cluster.supportingSources
          ]),
          originalInspiration:
            cluster.supportingSources.length > representative.sourceRepos.length
              ? `${representative.originalInspiration} Supporting sources: ${cluster.supportingSources.join(", ")}.`
              : representative.originalInspiration
        }
      : null;

    if (selectedIdea) {
      selected.push(selectedIdea);
      perSourceCounts.set(primarySource, sourceCount + 1);
    }

    const rejectedIdeaIds = cluster.ideas
      .filter((idea) => idea.ideaId !== representative.ideaId || !canSelect)
      .map((idea) => idea.ideaId);
    const supportReason =
      cluster.supportingSources.length > 1
        ? `Concept has ${cluster.supportingSources.length} supporting sources.`
        : "Concept has one supporting source.";
    const decisionReasons = [
      `Base idea score ${scoreFor(input.ideaScores, representative.ideaId).total}.`,
      `Source curation score ${sourceScoreById.get(primarySource)?.score ?? "n/a"}.`,
      supportReason,
      ...(canSelect
        ? ["Selected as the best representative for this concept cluster."]
        : selected.length >= input.maxIdeas
          ? ["Not selected because shortlist is full."]
          : sourceCount >= input.maxIdeasPerSource
            ? ["Not selected because source cap was reached."]
            : ["Not selected because source evidence raised mismatch warnings."])
    ];

    decisions.push({
      ideaId: representative.ideaId,
      title: representative.title,
      selected: Boolean(selectedIdea),
      score: Number(cluster.clusterScore.toFixed(1)),
      clusterKey: cluster.key,
      primarySource,
      supportingSources: cluster.supportingSources,
      reasons: decisionReasons,
      warnings
    });
    clusters.push({
      key: cluster.key,
      title: representative.title,
      candidateCount: cluster.ideas.length,
      supportingSources: cluster.supportingSources,
      selectedIdeaId: selectedIdea?.ideaId ?? null,
      rejectedIdeaIds,
      reasons: decisionReasons
    });
  }

  const report: IdeaSelectionReport = {
    generatedAt: input.generatedAt,
    candidateCount: input.discoveredIdeas.length,
    promisingCandidateCount: promising.length,
    selectedCount: selected.length,
    duplicateClusterCount: clusters.filter((cluster) => cluster.candidateCount > 1).length,
    clusters,
    decisions,
    warnings: [
      ...(selected.length < input.maxIdeas
        ? [`Selected only ${selected.length}/${input.maxIdeas} ideas after curation.`]
        : []),
      ...(clusters.some((cluster) => cluster.candidateCount > 1)
        ? [
            `${clusters.filter((cluster) => cluster.candidateCount > 1).length} duplicate/similar concept clusters were merged.`
          ]
        : [])
    ]
  };

  return {
    shortlist: selected,
    report
  };
}

export function sourceCurationReportToMarkdown(report: SourceCurationReport) {
  const lines = [
    "# Source Curation Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Sources: ${report.sourceCount}`,
    "",
    "## Warnings",
    "",
    ...(report.warnings.length ? report.warnings.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Sources",
    ""
  ];

  for (const source of report.evaluatedSources) {
    lines.push(`### ${source.repoFullName}`);
    lines.push("");
    lines.push(`- Score: ${source.score}`);
    lines.push(`- Trend score: ${source.trendScore}`);
    lines.push(`- Trend rank: ${source.trendRank ?? "n/a"}`);
    lines.push(`- Relevance: ${source.relevanceScore}`);
    lines.push(`- Evidence: ${source.evidenceScore}`);
    lines.push(`- Freshness: ${source.freshnessScore}`);
    lines.push(`- Activity: ${source.activityScore}`);
    lines.push("");
    lines.push("Reasons:");
    lines.push(...(source.reasons.length ? source.reasons : ["none"]).map((item) => `- ${item}`));
    lines.push("");
    lines.push("Warnings:");
    lines.push(...(source.warnings.length ? source.warnings : ["none"]).map((item) => `- ${item}`));
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function ideaSelectionReportToMarkdown(report: IdeaSelectionReport) {
  const lines = [
    "# Idea Selection Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Candidates: ${report.candidateCount}`,
    `Promising candidates: ${report.promisingCandidateCount}`,
    `Selected: ${report.selectedCount}`,
    `Duplicate clusters: ${report.duplicateClusterCount}`,
    "",
    "## Warnings",
    "",
    ...(report.warnings.length ? report.warnings.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Decisions",
    ""
  ];

  for (const decision of report.decisions) {
    lines.push(`### ${decision.selected ? "SELECTED" : "REJECTED"} ${decision.title}`);
    lines.push("");
    lines.push(`- Idea ID: ${decision.ideaId}`);
    lines.push(`- Score: ${decision.score}`);
    lines.push(`- Cluster: ${decision.clusterKey}`);
    lines.push(`- Primary source: ${decision.primarySource}`);
    lines.push(`- Supporting sources: ${decision.supportingSources.join(", ")}`);
    lines.push("");
    lines.push("Reasons:");
    lines.push(...decision.reasons.map((item) => `- ${item}`));
    lines.push("");
    lines.push("Warnings:");
    lines.push(...(decision.warnings.length ? decision.warnings : ["none"]).map((item) => `- ${item}`));
    lines.push("");
  }

  lines.push("## Clusters");
  lines.push("");

  for (const cluster of report.clusters) {
    lines.push(`### ${cluster.title}`);
    lines.push("");
    lines.push(`- Key: ${cluster.key}`);
    lines.push(`- Candidates: ${cluster.candidateCount}`);
    lines.push(`- Selected idea: ${cluster.selectedIdeaId ?? "none"}`);
    lines.push(`- Rejected ideas: ${cluster.rejectedIdeaIds.join(", ") || "none"}`);
    lines.push(`- Supporting sources: ${cluster.supportingSources.join(", ")}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

import { ProjectIdeaAuditSchema } from "@/lib/project-ideas/schemas";
import type {
  IdeaDiscoveryReport,
  IdeaScore,
  ProjectIdeaAuditFinding,
  TrendRadarReport
} from "@/lib/project-ideas/types";

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rounded(value: number, decimals = 3) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function scoreFor(scores: IdeaScore[], ideaId: string) {
  return scores.find((score) => score.ideaId === ideaId) ?? null;
}

function genericTitleCount(report: IdeaDiscoveryReport) {
  const genericPhrases = [
    "ai assistant",
    "ai tool",
    "ai platform",
    "ai workspace",
    "dashboard",
    "generator",
    "team edition"
  ];
  const concreteJobTerms = [
    "qa",
    "audit",
    "auditor",
    "diagnostic",
    "monitor",
    "validator",
    "reliability",
    "readiness",
    "compatibility",
    "regression",
    "policy"
  ];

  return report.shortlist.filter((idea) => {
    const title = idea.title.toLowerCase();
    const hasConcreteJob = concreteJobTerms.some((term) => title.includes(term));
    if (hasConcreteJob) {
      return false;
    }

    return genericPhrases.some((term) => title.includes(term));
  }).length;
}

function maxSourceDominance(report: IdeaDiscoveryReport) {
  if (report.shortlist.length === 0) {
    return 0;
  }

  const counts = new Map<string, number>();

  for (const idea of report.shortlist) {
    const source = idea.sourceRepos[0] ?? "unknown";
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }

  return Math.max(...counts.values()) / report.shortlist.length;
}

function diversity(values: string[]) {
  return new Set(values.map((value) => value.toLowerCase())).size;
}

function finding(input: ProjectIdeaAuditFinding): ProjectIdeaAuditFinding {
  return input;
}

export function auditIdeaDiscoveryReport(input: {
  report: IdeaDiscoveryReport;
  trendRadar?: TrendRadarReport | null;
}) {
  const shortlistScores = input.report.shortlist
    .map((idea) => scoreFor(input.report.ideaScores, idea.ideaId))
    .filter((score): score is IdeaScore => Boolean(score));
  const cloneRejectionRatio =
    input.report.metrics.ideaCount > 0
      ? input.report.metrics.cloneRejectedCount / input.report.metrics.ideaCount
      : 0;
  const researchReadyRatio =
    input.report.shortlist.length > 0
      ? input.report.metrics.researchReadyCount / input.report.shortlist.length
      : 0;
  const domainDiversity = diversity(input.report.shortlist.flatMap((idea) => idea.domains));
  const targetUserDiversity = diversity(
    input.report.shortlist.flatMap((idea) => idea.targetUsers)
  );
  const metrics = {
    sourceRepoCount: input.report.sourceRepos.length,
    shortlistCount: input.report.shortlist.length,
    rejectedCount: input.report.rejectedIdeas.length,
    cloneRejectionRatio: rounded(cloneRejectionRatio),
    averageShortlistScore: rounded(
      average(shortlistScores.map((score) => score.total)),
      1
    ),
    averageNovelty: input.report.metrics.averageNovelty,
    averageMvpFeasibility: input.report.metrics.averageMvpFeasibility,
    averageGithubSignalStrength: input.report.metrics.averageGithubSignalStrength,
    researchReadyRatio: rounded(researchReadyRatio),
    domainDiversity,
    targetUserDiversity,
    maxSourceDominance: rounded(maxSourceDominance(input.report)),
    trendRadarCategoryCount: input.trendRadar?.categories.length ?? 0,
    trendRadarOpportunityCount: input.trendRadar?.topOpportunities.length ?? 0,
    genericTitleCount: genericTitleCount(input.report)
  };
  const weaknesses: ProjectIdeaAuditFinding[] = [];

  if (metrics.shortlistCount === 0) {
    weaknesses.push(
      finding({
        severity: "critical",
        area: "shortlist",
        message: "No promising ideas reached the shortlist.",
        evidence: [`ideaCount=${input.report.metrics.ideaCount}`],
        action: "Add stronger source repos or lower the shortlist threshold only after clone-risk checks pass."
      })
    );
  }

  if (metrics.sourceRepoCount < 3) {
    weaknesses.push(
      finding({
        severity: "warning",
        area: "source_diversity",
        message: "The run uses too few source repositories for robust trend discovery.",
        evidence: [`sourceRepoCount=${metrics.sourceRepoCount}`],
        action: "Use GitHub Search plus GH Archive enrichment and target at least 5-20 repos before judging market direction."
      })
    );
  }

  if (metrics.averageGithubSignalStrength < 0.45) {
    weaknesses.push(
      finding({
        severity: "warning",
        area: "github_signal",
        message: "Shortlisted ideas are backed by weak GitHub popularity or issue signal.",
        evidence: [`averageGithubSignalStrength=${metrics.averageGithubSignalStrength}`],
        action: "Prefer repos with recent stars, forks, open issue pain and README evidence before architecture generation."
      })
    );
  }

  if (metrics.averageNovelty < 0.75) {
    weaknesses.push(
      finding({
        severity: "critical",
        area: "novelty",
        message: "Shortlisted ideas are too close to their source workflows.",
        evidence: [`averageNovelty=${metrics.averageNovelty}`],
        action: "Force adjacent QA, audit, diagnostic, reliability or governance angles and reject direct replacements."
      })
    );
  }

  if (metrics.cloneRejectionRatio === 0 && input.report.metrics.ideaCount > 1) {
    weaknesses.push(
      finding({
        severity: "warning",
        area: "clone_guard",
        message: "The anti-clone layer did not reject anything in this run.",
        evidence: [`cloneRejectionRatio=${metrics.cloneRejectionRatio}`],
        action: "Inject explicit clone candidates into benchmarks and verify the guard rejects them."
      })
    );
  }

  if (metrics.maxSourceDominance > 0.6 && metrics.shortlistCount > 2) {
    weaknesses.push(
      finding({
        severity: "warning",
        area: "source_balance",
        message: "One source repository dominates the shortlist.",
        evidence: [`maxSourceDominance=${metrics.maxSourceDominance}`],
        action: "Cap shortlist entries per source repo or diversify GH Archive/Search input before final selection."
      })
    );
  }

  if (metrics.genericTitleCount > 0) {
    weaknesses.push(
      finding({
        severity: "warning",
        area: "positioning",
        message: "Some shortlisted titles are generic and may hide weak differentiation.",
        evidence: [`genericTitleCount=${metrics.genericTitleCount}`],
        action: "Rename ideas around the specific QA/audit/reliability job-to-be-done, not a broad platform label."
      })
    );
  }

  if (metrics.researchReadyRatio < 1 && metrics.shortlistCount > 0) {
    weaknesses.push(
      finding({
        severity: "warning",
        area: "research_handoff",
        message: "Not every shortlisted idea is ready for research handoff.",
        evidence: [`researchReadyRatio=${metrics.researchReadyRatio}`],
        action: "Require at least two research questions and valid ProjectIdeaInput output for each shortlisted idea."
      })
    );
  }

  if (metrics.trendRadarCategoryCount === 0) {
    weaknesses.push(
      finding({
        severity: "warning",
        area: "trend_radar",
        message: "Trend radar did not produce a category-level market view.",
        evidence: ["trendRadarCategoryCount=0"],
        action: "Always build a trend radar artifact when source repos are collected from GitHub or GH Archive."
      })
    );
  }

  const strengths = [
    ...(metrics.shortlistCount > 0
      ? [`Shortlist produced ${metrics.shortlistCount} research candidates.`]
      : []),
    ...(metrics.cloneRejectionRatio > 0
      ? [`Anti-clone guard rejected ${input.report.metrics.cloneRejectedCount} weak candidates.`]
      : []),
    ...(metrics.averageNovelty >= 0.85
      ? [`Average novelty is strong at ${metrics.averageNovelty}.`]
      : []),
    ...(metrics.averageMvpFeasibility >= 0.85
      ? [`MVP feasibility is strong at ${metrics.averageMvpFeasibility}.`]
      : []),
    ...(metrics.researchReadyRatio === 1 && metrics.shortlistCount > 0
      ? ["Every shortlisted idea is ready for research handoff."]
      : []),
    ...(metrics.trendRadarCategoryCount > 0
      ? [`Trend radar found ${metrics.trendRadarCategoryCount} market categories.`]
      : [])
  ];
  const criticalCount = weaknesses.filter(
    (item) => item.severity === "critical"
  ).length;
  const warningCount = weaknesses.filter((item) => item.severity === "warning").length;
  const baseScore = 100 - criticalCount * 28 - warningCount * 8;
  const strengthBoost = Math.min(12, strengths.length * 2);
  const score = Math.max(0, Math.min(100, Math.round(baseScore + strengthBoost)));
  const readiness =
    criticalCount > 0 || score < 65
      ? "blocked"
      : score >= 82
        ? "ready"
        : "needs_review";
  const promotionMoves = [
    "Keep the strongest pattern: generate adjacent QA, audit, diagnostic, readiness and reliability products, not clones.",
    "Surface novelty, GitHub signal, MVP feasibility and research readiness next to every shortlist decision.",
    "Use trend radar categories to explain why a direction is timely before spending tokens on research and architecture."
  ];
  const mitigationMoves = weaknesses.map((item) => item.action);

  return ProjectIdeaAuditSchema.parse({
    generatedAt: input.report.generatedAt,
    reportId: input.report.id,
    score,
    readiness,
    strengths,
    weaknesses,
    promotionMoves,
    mitigationMoves,
    metrics
  });
}

export function projectIdeaAuditToMarkdown(audit: ReturnType<typeof auditIdeaDiscoveryReport>) {
  const lines = [
    "# Project Idea System Audit",
    "",
    `**Generated:** ${audit.generatedAt}`,
    `**Report:** ${audit.reportId}`,
    `**Score:** ${audit.score}/100`,
    `**Readiness:** ${audit.readiness}`,
    "",
    "## Strengths",
    "",
    ...(audit.strengths.length ? audit.strengths.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Weaknesses",
    ""
  ];

  for (const weakness of audit.weaknesses) {
    lines.push(`### ${weakness.severity.toUpperCase()} ${weakness.area}`);
    lines.push("");
    lines.push(weakness.message);
    lines.push("");
    lines.push("Evidence:");
    lines.push(...weakness.evidence.map((item) => `- ${item}`));
    lines.push("");
    lines.push(`Action: ${weakness.action}`);
    lines.push("");
  }

  lines.push("## Promotion Moves");
  lines.push("");
  lines.push(...audit.promotionMoves.map((item) => `- ${item}`));
  lines.push("");
  lines.push("## Mitigation Moves");
  lines.push("");
  lines.push(
    ...(audit.mitigationMoves.length
      ? audit.mitigationMoves.map((item) => `- ${item}`)
      : ["- none"])
  );
  lines.push("");

  return `${lines.join("\n")}\n`;
}

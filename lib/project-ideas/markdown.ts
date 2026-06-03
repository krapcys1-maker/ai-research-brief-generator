import type {
  IdeaDiscoveryReport,
  ProjectIdeaHandoffQuality,
  TrendRadarReport
} from "@/lib/project-ideas/types";

function listItems(items: string[]) {
  if (items.length === 0) {
    return ["- none"];
  }

  return items.map((item) => `- ${item}`);
}

export function ideaDiscoveryReportToMarkdown(report: IdeaDiscoveryReport) {
  const lines = [
    `# ${report.input.domain} Idea Discovery`,
    "",
    `**Generated:** ${report.generatedAt}`,
    `**Source repos:** ${report.sourceRepos.length}`,
    `**Ideas:** ${report.metrics.ideaCount}`,
    `**Promising:** ${report.metrics.promisingCount}`,
    `**Max ideas per source:** ${report.metrics.maxIdeasPerSource}`,
    `**Shortlist source dominance:** ${report.metrics.shortlistSourceDominance}`,
    `**Clone rejections:** ${report.metrics.cloneRejectedCount}`,
    `**Research ready:** ${report.metrics.researchReadyCount}`,
    `**Handoff ready:** ${report.metrics.handoffReadyCount}`,
    `**Average handoff quality:** ${report.metrics.averageHandoffQualityScore}`,
    "",
    "## Shortlist",
    ""
  ];

  for (const idea of report.shortlist) {
    const score = report.ideaScores.find((item) => item.ideaId === idea.ideaId);
    lines.push(`### ${idea.title}`);
    lines.push("");
    lines.push(`**Score:** ${score?.total ?? "n/a"}`);
    lines.push(`**Verdict:** ${score?.verdict ?? "n/a"}`);
    lines.push(`**Problem:** ${idea.problem}`);
    lines.push("");
    lines.push("**Target users:**");
    lines.push(...listItems(idea.targetUsers));
    lines.push("");
    lines.push("**MVP scope:**");
    lines.push(...listItems(idea.mvpScope));
    lines.push("");
    lines.push("**Differentiation:**");
    lines.push(...listItems(idea.differentiation));
    lines.push("");
    lines.push("**Research questions:**");
    lines.push(...listItems(idea.researchQuestions));
    lines.push("");
  }

  lines.push("## Rejected Ideas");
  lines.push("");

  for (const idea of report.rejectedIdeas) {
    const score = report.ideaScores.find((item) => item.ideaId === idea.ideaId);
    lines.push(`### ${idea.title}`);
    lines.push("");
    lines.push(`**Score:** ${score?.total ?? "n/a"}`);
    lines.push(`**Reason:** ${(score?.reasons ?? []).join(" ") || "not selected"}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function projectIdeaHandoffQualityToMarkdown(
  qualities: ProjectIdeaHandoffQuality[]
) {
  const averageScore =
    qualities.length > 0
      ? qualities.reduce((sum, quality) => sum + quality.score, 0) /
        qualities.length
      : 0;
  const readyCount = qualities.filter(
    (quality) => quality.readiness === "ready"
  ).length;
  const lines = [
    "# Project Idea Handoff Quality",
    "",
    `**Ideas:** ${qualities.length}`,
    `**Ready:** ${readyCount}/${qualities.length}`,
    `**Average score:** ${averageScore.toFixed(1)}`,
    "",
    "## Ideas",
    ""
  ];

  for (const quality of qualities) {
    lines.push(`### ${quality.title}`);
    lines.push("");
    lines.push(`**Score:** ${quality.score}/100`);
    lines.push(`**Readiness:** ${quality.readiness}`);
    lines.push(`**Input valid:** ${quality.inputValid ? "yes" : "no"}`);
    lines.push(`**Constraints quality:** ${quality.constraintsQuality}`);
    lines.push(`**Domain specificity:** ${quality.domainSpecificity}`);
    lines.push(`**Research question coverage:** ${quality.researchQuestionCoverage}`);
    lines.push(`**Non-goal clarity:** ${quality.nonGoalClarity}`);
    lines.push(`**Description specificity:** ${quality.descriptionSpecificity}`);
    lines.push("");
    lines.push("**Strengths:**");
    lines.push(...listItems(quality.strengths));
    lines.push("");
    lines.push("**Weaknesses:**");
    lines.push(...listItems(quality.weaknesses));
    lines.push("");
    lines.push("**Required fixes:**");
    lines.push(...listItems(quality.requiredFixes));
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function trendRadarToMarkdown(report: TrendRadarReport) {
  const lines = [
    "# Trend Radar",
    "",
    `**Generated:** ${report.generatedAt}`,
    `**Categories:** ${report.categories.length}`,
    `**Repo signals:** ${report.repoSignals.length}`,
    "",
    "## Top Categories",
    ""
  ];

  for (const category of report.categories) {
    lines.push(`### ${category.category}`);
    lines.push("");
    lines.push(`**Heat:** ${category.heatScore}`);
    lines.push(`**Sexiness:** ${category.sexinessScore}`);
    lines.push(`**Feasibility:** ${category.feasibilityScore}`);
    lines.push(`**Repos:** ${category.representativeRepos.join(", ")}`);
    lines.push("");
    lines.push("**Why hot:**");
    lines.push(...listItems(category.whyHot));
    lines.push("");
    lines.push("**Opportunity angles:**");
    lines.push(...listItems(category.opportunityAngles));
    lines.push("");
  }

  lines.push("## Top Opportunities");
  lines.push("");

  for (const opportunity of report.topOpportunities) {
    lines.push(`### ${opportunity.title}`);
    lines.push("");
    lines.push(`**Category:** ${opportunity.category}`);
    lines.push(`**Rationale:** ${opportunity.rationale}`);
    lines.push("");
    lines.push("**Suggested constraints:**");
    lines.push(...listItems(opportunity.suggestedConstraints));
    lines.push("");
  }

  lines.push("## Repo Signals");
  lines.push("");

  for (const signal of report.repoSignals) {
    lines.push(`### ${signal.repoFullName}`);
    lines.push("");
    lines.push(`**Category:** ${signal.category}`);
    lines.push(`**Heat:** ${signal.heatScore}`);
    lines.push(`**Sexiness:** ${signal.sexinessScore}`);
    lines.push(`**Feasibility:** ${signal.feasibilityScore}`);
    lines.push(`**Trend score:** ${signal.trendScore}`);
    lines.push("");
    lines.push("**Evidence:**");
    lines.push(...listItems(signal.evidence));
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

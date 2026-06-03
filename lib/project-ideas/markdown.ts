import type { IdeaDiscoveryReport } from "@/lib/project-ideas/types";

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
    `**Clone rejections:** ${report.metrics.cloneRejectedCount}`,
    `**Research ready:** ${report.metrics.researchReadyCount}`,
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


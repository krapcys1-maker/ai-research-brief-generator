import type { ProjectPrd } from "@/lib/project-prd/types";

function listItems(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`) : ["- none"];
}

function sources(ids: string[]) {
  return ids.length ? ids.map((id) => `[${id}]`).join(" ") : "[no source]";
}

export function projectPrdToMarkdown(prd: ProjectPrd) {
  const lines: string[] = [];

  lines.push(`# ${prd.productName} PRD`);
  lines.push("");
  lines.push(`**Status:** ${prd.status}`);
  lines.push(`**Source brief:** ${prd.sourceBriefId}`);
  lines.push(`**Generated:** ${prd.generatedAt}`);
  lines.push("");
  lines.push("## Problem");
  lines.push("");
  lines.push(prd.problem);
  lines.push("");
  lines.push("## Target Users");
  lines.push("");
  lines.push(...listItems(prd.targetUsers));
  lines.push("");
  lines.push("## Evidence Summary");
  lines.push("");
  lines.push(prd.evidenceSummary);
  lines.push("");

  if (prd.blockers.length) {
    lines.push("## Blockers");
    lines.push("");
    lines.push(...listItems(prd.blockers));
    lines.push("");
  }

  lines.push("## Goals");
  lines.push("");
  lines.push(...listItems(prd.goals));
  lines.push("");
  lines.push("## Non-Goals");
  lines.push("");
  lines.push(...listItems(prd.nonGoals));
  lines.push("");
  lines.push("## Requirements");
  lines.push("");

  for (const requirement of prd.requirements) {
    lines.push(`### ${requirement.id}: ${requirement.title}`);
    lines.push("");
    lines.push(requirement.description);
    lines.push("");
    lines.push(`- Priority: ${requirement.priority}`);
    lines.push(`- Type: ${requirement.requirementType}`);
    lines.push(`- Evidence strength: ${requirement.evidenceStrength}`);
    lines.push(`- Sources: ${sources(requirement.sourcePaperIds)}`);
    lines.push("- Acceptance criteria:");
    lines.push(...listItems(requirement.acceptanceCriteria));
    lines.push("");
  }

  lines.push("## Risks");
  lines.push("");
  for (const risk of prd.risks) {
    lines.push(`### ${risk.risk}`);
    lines.push("");
    lines.push(`- Severity: ${risk.severity}`);
    lines.push(`- Mitigation: ${risk.mitigation}`);
    lines.push(`- Sources: ${sources(risk.sourcePaperIds)}`);
    lines.push("");
  }

  lines.push("## Open Questions");
  lines.push("");
  lines.push(...listItems(prd.openQuestions));
  lines.push("");
  lines.push("## Traceability");
  lines.push("");
  lines.push(`- Requirements: ${prd.traceability.requirementCount}`);
  lines.push(
    `- Requirements with paper sources: ${prd.traceability.requirementsWithPaperSources}`
  );
  lines.push(`- Source papers: ${sources(prd.traceability.sourcePaperIds)}`);
  lines.push("");
  lines.push("## Audit");
  lines.push("");
  lines.push(`- Score: ${prd.audit.score}/100`);
  lines.push(`- Verdict: ${prd.audit.verdict}`);
  lines.push("");
  lines.push("### Strengths");
  lines.push("");
  lines.push(...listItems(prd.audit.strengths));
  lines.push("");
  lines.push("### Weaknesses");
  lines.push("");
  lines.push(...listItems(prd.audit.weaknesses));

  return `${lines.join("\n").trim()}\n`;
}

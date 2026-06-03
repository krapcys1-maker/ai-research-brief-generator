import type {
  ProjectArchitecture,
  ProjectArchitectureJudge
} from "@/lib/project-architecture/types";

function listItems(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`) : ["- none"];
}

function refs(ids: string[]) {
  return ids.length ? ids.join(", ") : "none";
}

export function projectArchitectureToMarkdown(architecture: ProjectArchitecture) {
  const lines: string[] = [];

  lines.push(`# ${architecture.systemName} Architecture`);
  lines.push("");
  lines.push(`**Status:** ${architecture.status}`);
  lines.push(`**Source PRD:** ${architecture.sourcePrdId}`);
  lines.push(`**Source brief:** ${architecture.sourceBriefId}`);
  lines.push(`**Generated:** ${architecture.generatedAt}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(architecture.summary);
  lines.push("");

  if (architecture.blockers.length) {
    lines.push("## Blockers");
    lines.push("");
    lines.push(...listItems(architecture.blockers));
    lines.push("");
  }

  lines.push("## Components");
  lines.push("");
  for (const component of architecture.components) {
    lines.push(`### ${component.id}: ${component.name}`);
    lines.push("");
    lines.push(component.responsibility);
    lines.push("");
    lines.push(`- Type: ${component.componentType}`);
    lines.push(`- Requirement refs: ${refs(component.sourceRequirementIds)}`);
    lines.push(`- Paper refs: ${refs(component.sourcePaperIds)}`);
    lines.push("- Inputs:");
    lines.push(...listItems(component.inputs));
    lines.push("- Outputs:");
    lines.push(...listItems(component.outputs));
    lines.push("");
  }

  lines.push("## Decisions");
  lines.push("");
  for (const decision of architecture.decisions) {
    lines.push(`### ${decision.id}: ${decision.decision}`);
    lines.push("");
    lines.push(decision.rationale);
    lines.push("");
    lines.push(`- Requirement refs: ${refs(decision.sourceRequirementIds)}`);
    lines.push(`- Paper refs: ${refs(decision.sourcePaperIds)}`);
    lines.push("- Tradeoffs:");
    lines.push(...listItems(decision.tradeoffs));
    lines.push("");
  }

  lines.push("## Risks");
  lines.push("");
  for (const risk of architecture.risks) {
    lines.push(`### ${risk.risk}`);
    lines.push("");
    lines.push(`- Mitigation: ${risk.mitigation}`);
    lines.push(`- Requirement refs: ${refs(risk.sourceRequirementIds)}`);
    lines.push(`- Paper refs: ${refs(risk.sourcePaperIds)}`);
    lines.push("");
  }

  lines.push("## Test Strategy");
  lines.push("");
  lines.push(...listItems(architecture.testStrategy));
  lines.push("");
  lines.push("## Traceability");
  lines.push("");
  lines.push(`- Components: ${architecture.traceability.componentCount}`);
  lines.push(
    `- Components with requirements: ${architecture.traceability.componentsWithRequirements}`
  );
  lines.push(`- Decisions: ${architecture.traceability.decisionCount}`);
  lines.push(
    `- Decisions with paper sources: ${architecture.traceability.decisionsWithPaperSources}`
  );
  lines.push(
    `- Requirement refs: ${refs(architecture.traceability.sourceRequirementIds)}`
  );
  lines.push(`- Paper refs: ${refs(architecture.traceability.sourcePaperIds)}`);
  lines.push("");
  lines.push("## Audit");
  lines.push("");
  lines.push(`- Score: ${architecture.audit.score}/100`);
  lines.push(`- Verdict: ${architecture.audit.verdict}`);
  lines.push("");
  lines.push("### Strengths");
  lines.push("");
  lines.push(...listItems(architecture.audit.strengths));
  lines.push("");
  lines.push("### Weaknesses");
  lines.push("");
  lines.push(...listItems(architecture.audit.weaknesses));

  return `${lines.join("\n").trim()}\n`;
}

export function projectArchitectureJudgeToMarkdown(
  judge: ProjectArchitectureJudge
) {
  const lines = [
    "# Project Architecture Judge",
    "",
    `**Architecture:** ${judge.architectureId}`,
    `**Source PRD:** ${judge.sourcePrdId}`,
    `**Source brief:** ${judge.sourceBriefId}`,
    `**Score:** ${judge.score}/100`,
    `**Verdict:** ${judge.verdict}`,
    "",
    "## Metrics",
    "",
    `- Requirement coverage: ${(judge.requirementCoverage * 100).toFixed(1)}%`,
    `- Component traceability: ${(judge.componentTraceabilityCoverage * 100).toFixed(1)}%`,
    `- Decision paper coverage: ${(judge.decisionPaperCoverage * 100).toFixed(1)}%`,
    `- Component type diversity: ${judge.componentTypeDiversity}`,
    `- Generic component count: ${judge.genericComponentCount}`,
    `- Paper evidence coverage: ${(judge.paperEvidenceCoverage * 100).toFixed(1)}%`,
    `- Risk coverage: ${(judge.riskCoverage * 100).toFixed(1)}%`,
    `- Specific term coverage: ${(judge.specificTermCoverage * 100).toFixed(1)}%`,
    "",
    "## Strengths",
    "",
    ...listItems(judge.strengths),
    "",
    "## Weaknesses",
    "",
    ...listItems(judge.weaknesses),
    "",
    "## Required Fixes",
    "",
    ...listItems(judge.requiredFixes)
  ];

  return `${lines.join("\n").trim()}\n`;
}

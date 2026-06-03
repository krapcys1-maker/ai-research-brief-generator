import type {
  ProjectEvidenceStrength,
  ProjectResearchBrief
} from "@/lib/project-research/types";

function sourceList(ids: string[]) {
  return ids.length ? ids.map((id) => `[${id}]`).join(" ") : "[no paper source]";
}

function evidenceLabel(value: ProjectEvidenceStrength) {
  return value.replaceAll("_", " ");
}

function listItems(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`) : ["- none"];
}

export function projectResearchBriefToMarkdown(brief: ProjectResearchBrief) {
  const lines: string[] = [];

  lines.push(`# ${brief.normalizedIdea.title}`);
  lines.push("");
  lines.push(`**Project research brief ID:** ${brief.id}`);
  lines.push(`**Generated:** ${brief.generatedAt}`);
  lines.push(`**Output language:** ${brief.outputLanguage}`);
  lines.push("");
  lines.push("## Idea");
  lines.push("");
  lines.push(`**Original title:** ${brief.idea.title}`);
  lines.push(`**One sentence:** ${brief.normalizedIdea.oneSentence}`);
  lines.push(`**Problem:** ${brief.normalizedIdea.problem}`);
  lines.push("");
  lines.push("**Target users:**");
  lines.push(...listItems(brief.normalizedIdea.targetUsers));
  lines.push("");
  lines.push("**Domains:**");
  lines.push(...listItems(brief.normalizedIdea.domains));
  lines.push("");
  lines.push("## Research Summary");
  lines.push("");
  lines.push(brief.researchSummary);
  lines.push("");
  lines.push("## Readiness");
  lines.push("");
  lines.push(`- PRD: ${brief.readiness.prd}`);
  lines.push(`- Architecture: ${brief.readiness.architecture}`);
  lines.push(`- Reason: ${brief.readiness.reason}`);
  lines.push("");
  lines.push("## Evidence Coverage");
  lines.push("");
  lines.push(
    `- Required buckets covered: ${brief.evidenceCoverage.requiredCoveredCount}/${brief.evidenceCoverage.requiredBucketCount}`
  );
  lines.push(
    `- Can synthesize project: ${brief.evidenceCoverage.canSynthesizeProject ? "yes" : "no"}`
  );
  lines.push(
    `- Missing required buckets: ${brief.evidenceCoverage.missingRequiredBuckets.join(", ") || "none"}`
  );
  lines.push("");
  for (const bucket of brief.evidenceCoverage.buckets) {
    lines.push(
      `- ${bucket.bucketId}: ${bucket.status}; selected ${bucket.selectedCount}; parsed ${bucket.parsedCount}; reviewed ${bucket.reviewedCount}; useful ${bucket.usefulReviewedCount}`
    );
  }
  lines.push("");
  lines.push("## Research Plan");
  lines.push("");
  lines.push("### Goals");
  lines.push("");
  lines.push(...listItems(brief.researchPlan.researchGoals));
  lines.push("");
  lines.push("### Evidence Buckets");
  lines.push("");
  for (const bucket of brief.researchPlan.evidenceBuckets) {
    lines.push(`#### ${bucket.id}: ${bucket.label}`);
    lines.push("");
    lines.push(`- Required: ${bucket.required ? "yes" : "no"}`);
    lines.push(`- Min parsed papers: ${bucket.minParsedPapers}`);
    lines.push(`- Query: ${bucket.query}`);
    lines.push(`- Keywords: ${bucket.keywords.join(", ")}`);
    if (bucket.targetQuestions.length) {
      lines.push("- Target questions:");
      lines.push(...listItems(bucket.targetQuestions));
    }
    lines.push("");
  }
  lines.push("## Reviewed Papers");
  lines.push("");
  for (const paper of brief.reviewedPapers) {
    lines.push(`### [${paper.paperId}] ${paper.title}`);
    lines.push("");
    lines.push(`- Year: ${paper.year ?? "N/A"}`);
    lines.push(`- DOI: ${paper.doi ?? "N/A"}`);
    lines.push(`- URL: ${paper.url ?? "N/A"}`);
    lines.push(`- Buckets: ${paper.bucketIds.join(", ")}`);
    lines.push(`- Full text status: ${paper.fullTextStatus}`);
    lines.push(`- Useful for project: ${paper.usefulForProject ? "yes" : "no"}`);
    lines.push(`- Evidence strength: ${evidenceLabel(paper.evidenceStrength)}`);
    if (paper.keyMethods.length) {
      lines.push("- Key methods:");
      lines.push(...listItems(paper.keyMethods));
    }
    if (paper.implementationImplications.length) {
      lines.push("- Implementation implications:");
      lines.push(...listItems(paper.implementationImplications));
    }
    if (paper.riskImplications.length) {
      lines.push("- Risk implications:");
      lines.push(...listItems(paper.riskImplications));
    }
    if (paper.limitations.length) {
      lines.push("- Limitations:");
      lines.push(...listItems(paper.limitations));
    }
    lines.push("");
  }
  lines.push("## Project Insights");
  lines.push("");
  for (const insight of brief.projectInsights) {
    lines.push(`### ${insight.claim}`);
    lines.push("");
    lines.push(insight.explanation);
    lines.push("");
    lines.push(`- Type: ${insight.insightType}`);
    lines.push(`- Confidence: ${insight.confidence}`);
    lines.push(`- Evidence strength: ${evidenceLabel(insight.evidenceStrength)}`);
    lines.push(`- Sources: ${sourceList(insight.sourcePaperIds)}`);
    lines.push(`- Usable for PRD: ${insight.usableForPrd ? "yes" : "no"}`);
    lines.push(
      `- Usable for architecture: ${insight.usableForArchitecture ? "yes" : "no"}`
    );
    if (insight.evidence.length) {
      lines.push("- Evidence:");
      for (const evidence of insight.evidence) {
        const chunks = evidence.chunkIds.length
          ? ` chunks: ${evidence.chunkIds.join(", ")}`
          : "";
        lines.push(
          `  - [${evidence.paperId}] ${evidence.supportLevel}/${evidenceLabel(evidence.evidenceStrength)}${chunks}: ${evidence.claim}`
        );
      }
    }
    lines.push("");
  }
  lines.push("## Recommended Technical Direction");
  lines.push("");
  lines.push(brief.recommendedTechnicalDirection.summary);
  lines.push("");
  lines.push(`**Why:** ${brief.recommendedTechnicalDirection.why}`);
  lines.push("");
  lines.push(`**Evidence strength:** ${evidenceLabel(brief.recommendedTechnicalDirection.evidenceStrength)}`);
  lines.push(`**Sources:** ${sourceList(brief.recommendedTechnicalDirection.sourcePaperIds)}`);
  lines.push("");
  lines.push("### Approach");
  lines.push("");
  lines.push(...listItems(brief.recommendedTechnicalDirection.approach));
  lines.push("");
  lines.push("### Avoid");
  lines.push("");
  lines.push(...listItems(brief.recommendedTechnicalDirection.avoid));
  lines.push("");
  lines.push("## Risks");
  lines.push("");
  for (const risk of brief.risks) {
    lines.push(`### ${risk.risk}`);
    lines.push("");
    lines.push(`- Severity: ${risk.severity}`);
    lines.push(`- Mitigation: ${risk.mitigation}`);
    lines.push(`- Evidence strength: ${evidenceLabel(risk.evidenceStrength)}`);
    lines.push(`- Sources: ${sourceList(risk.sourcePaperIds)}`);
    lines.push("");
  }
  lines.push("## Gaps");
  lines.push("");
  for (const gap of brief.gaps) {
    lines.push(`### ${gap.gap}`);
    lines.push("");
    lines.push(gap.whyItMatters);
    lines.push("");
    lines.push(`- Evidence strength: ${evidenceLabel(gap.evidenceStrength)}`);
    lines.push(`- Sources: ${sourceList(gap.sourcePaperIds)}`);
    if (gap.suggestedNextResearch.length) {
      lines.push("- Suggested next research:");
      lines.push(...listItems(gap.suggestedNextResearch));
    }
    lines.push("");
  }
  lines.push("## Audit");
  lines.push("");
  lines.push(`- Score: ${brief.audit.score}/100`);
  lines.push(`- Verdict: ${brief.audit.verdict}`);
  lines.push("");
  lines.push("### Strengths");
  lines.push("");
  lines.push(...listItems(brief.audit.strengths));
  lines.push("");
  lines.push("### Weaknesses");
  lines.push("");
  lines.push(...listItems(brief.audit.weaknesses));
  lines.push("");
  lines.push("### Must Fix Before PRD");
  lines.push("");
  lines.push(...listItems(brief.audit.mustFixBeforePrd));
  lines.push("");
  lines.push("### Must Fix Before Architecture");
  lines.push("");
  lines.push(...listItems(brief.audit.mustFixBeforeArchitecture));

  return `${lines.join("\n").trim()}\n`;
}

import type { ResearchBrief } from "@/lib/ai/schemas";
import type { NormalizedPaper } from "@/lib/sources/types";

function sourceList(ids: string[]) {
  return ids.map((id) => `[${id}]`).join(" ");
}

function clean(value: string | null | undefined) {
  return value?.trim() ? value.trim() : "N/A";
}

function score(value: number | undefined) {
  return typeof value === "number" ? value.toFixed(2) : "N/A";
}

export function researchBriefToMarkdown(input: {
  brief: ResearchBrief;
  papers: NormalizedPaper[];
}) {
  const { brief, papers } = input;
  const lines: string[] = [];

  lines.push(`# ${brief.title}`);
  lines.push("");
  lines.push(`**Query:** ${brief.query}`);
  lines.push(`**Output language:** ${brief.outputLanguage}`);
  lines.push(`**Generated:** ${brief.generatedAt}`);
  lines.push("");
  lines.push("## TL;DR");
  lines.push("");
  lines.push(brief.tldr);
  lines.push("");
  lines.push("## Executive Summary");
  lines.push("");
  lines.push(`${brief.executiveSummary.paragraph} ${sourceList(brief.executiveSummary.sourcePaperIds)}`);
  lines.push("");
  lines.push("## Key Findings");
  lines.push("");

  for (const item of brief.keyFindings) {
    lines.push(`### ${item.finding}`);
    lines.push("");
    lines.push(`${item.explanation} ${sourceList(item.sourcePaperIds)}`);
    lines.push("");
    lines.push(`**Confidence:** ${item.confidence}`);
    if (item.caveats.length) {
      lines.push("");
      lines.push(`**Caveats:** ${item.caveats.join("; ")}`);
    }
    lines.push("");
  }

  lines.push("## Major Themes");
  lines.push("");
  for (const item of brief.majorThemes) {
    lines.push(`### ${item.theme}`);
    lines.push("");
    lines.push(`${item.description} ${sourceList(item.sourcePaperIds)}`);
    lines.push("");
  }

  lines.push("## Influential Papers");
  lines.push("");
  for (const item of brief.influentialPapers) {
    lines.push(`- **${item.paperId}:** ${item.reason}`);
  }
  lines.push("");

  lines.push("## Research Gaps");
  lines.push("");
  for (const item of brief.researchGaps) {
    lines.push(`### ${item.gap}`);
    lines.push("");
    lines.push(`${item.whyItMatters} ${sourceList(item.sourcePaperIds)}`);
    lines.push("");
  }

  lines.push("## Controversies / Uncertainties");
  lines.push("");
  for (const item of brief.controversiesOrUncertainties) {
    lines.push(`### ${item.issue}`);
    lines.push("");
    lines.push(`${item.explanation} ${sourceList(item.sourcePaperIds)}`);
    lines.push("");
  }

  lines.push("## Suggested Next Questions");
  lines.push("");
  for (const question of brief.suggestedNextQuestions) {
    lines.push(`- ${question}`);
  }
  lines.push("");

  lines.push("## Search Summary");
  lines.push("");
  lines.push(`- Sources used: ${brief.searchSummary.sourcesUsed.join(", ")}`);
  lines.push(`- Total found: ${brief.searchSummary.totalFound}`);
  lines.push(`- Total after deduplication: ${brief.searchSummary.totalAfterDeduplication}`);
  lines.push(`- Total used in brief: ${brief.searchSummary.totalUsedInBrief}`);
  if (brief.searchSummary.warnings.length) {
    lines.push(`- Warnings: ${brief.searchSummary.warnings.join("; ")}`);
  }
  lines.push("");
  lines.push("### Query Variants");
  lines.push("");
  for (const query of brief.searchSummary.queryVariants) {
    lines.push(`- ${query}`);
  }
  lines.push("");

  lines.push("## Bibliography");
  lines.push("");
  for (const paper of papers) {
    lines.push(`### [${paper.id}] ${paper.title}`);
    lines.push("");
    lines.push(`- Source: ${paper.source}`);
    lines.push(`- Authors: ${paper.authors.join(", ")}`);
    lines.push(`- Year: ${clean(paper.year?.toString())}`);
    lines.push(`- Venue: ${clean(paper.venue)}`);
    lines.push(`- DOI: ${clean(paper.doi)}`);
    lines.push(`- URL: ${clean(paper.sourceUrls[0])}`);
    lines.push(`- Citation count: ${clean(paper.citationCount?.toString())}`);
    lines.push(`- Influential citation count: ${clean(paper.influentialCitationCount?.toString())}`);
    lines.push(`- Final score: ${score(paper.finalScore)}`);
    lines.push(`- Score breakdown: relevance ${score(paper.relevanceScore)}, citations ${score(paper.citationScore)}, recency ${score(paper.recencyScore)}, completeness ${score(paper.completenessScore)}, source ${score(paper.sourceQualityScore)}, identifiers ${score(paper.identifierScore)}`);
    if (paper.abstract) {
      lines.push(`- Abstract: ${paper.abstract}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

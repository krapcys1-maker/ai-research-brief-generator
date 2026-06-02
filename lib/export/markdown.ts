import type { ResearchBrief } from "@/lib/ai/schemas";
import type { EvidenceLink } from "@/lib/ai/schemas";
import type { NormalizedPaper } from "@/lib/sources/types";
import { getEvidenceBoundary } from "@/lib/brief/evidenceBoundary";
import { formatDoi, getDoiUrl } from "@/lib/sources/doi";
import { getPaperMetadataWarnings } from "@/lib/pipeline/metadataQuality";
import {
  getPaperInsight,
  getSourceQualitySummary
} from "@/lib/pipeline/paperInsights";

function sourceList(ids: string[]) {
  return ids.map((id) => `[${id}]`).join(" ");
}

function clean(value: string | null | undefined) {
  return value?.trim() ? value.trim() : "N/A";
}

function score(value: number | undefined) {
  return typeof value === "number" ? value.toFixed(2) : "N/A";
}

function doiMarkdown(value: string | null | undefined) {
  const url = getDoiUrl(value);

  return url ? `[${formatDoi(value)}](${url})` : "N/A";
}

function evidenceLines(evidence: EvidenceLink[]) {
  if (!evidence.length) {
    return [];
  }

  return [
    "**Evidence:**",
    ...evidence.map(
      (item) =>
        `- [${item.paperId}] (${item.supportLevel}) ${item.evidenceText}`
    )
  ];
}

function getFallbackWarning(warnings: string[]) {
  return warnings.find((warning) =>
    warning.startsWith("AI synthesis fallback used")
  );
}

export function researchBriefToMarkdown(input: {
  brief: ResearchBrief;
  papers: NormalizedPaper[];
}) {
  const { brief, papers } = input;
  const evidenceBoundary = getEvidenceBoundary({
    outputLanguage: brief.outputLanguage,
    papers
  });
  const alignmentQuery =
    brief.searchSummary.queryVariants.length > 0
      ? brief.searchSummary.queryVariants.join(" ")
      : brief.query;
  const sourceQuality = getSourceQualitySummary(papers, alignmentQuery);
  const fallbackWarning = getFallbackWarning(brief.searchSummary.warnings);
  const lines: string[] = [];

  lines.push(`# ${brief.title}`);
  lines.push("");
  lines.push(`**Query:** ${brief.query}`);
  lines.push(`**Output language:** ${brief.outputLanguage}`);
  lines.push(`**Generated:** ${brief.generatedAt}`);
  lines.push("");
  if (fallbackWarning) {
    lines.push("## Fallback Mode");
    lines.push("");
    lines.push("**Extractive evidence summary.**");
    lines.push("");
    lines.push(
      "The AI synthesis provider did not return a fully validated narrative. This export uses a safer fallback built from selected paper titles, abstracts, and source metadata only."
    );
    lines.push("");
    lines.push(
      "For a richer synthesized brief, retry generation, narrow the topic, or use stronger provider settings. Treat this output as abstract-level evidence, not full-text verification."
    );
    lines.push("");
    lines.push(`**Fallback reason:** ${fallbackWarning}`);
    lines.push("");
  }
  lines.push(`## ${evidenceBoundary.title}`);
  lines.push("");
  lines.push(evidenceBoundary.summary);
  lines.push("");
  lines.push(`- Selected papers: ${evidenceBoundary.metrics.totalPapers}`);
  lines.push(
    `- Papers with abstracts: ${evidenceBoundary.metrics.papersWithAbstracts}/${evidenceBoundary.metrics.totalPapers}`
  );
  lines.push(
    `- Papers with PDF links: ${evidenceBoundary.metrics.papersWithPdfLinks}/${evidenceBoundary.metrics.totalPapers}`
  );
  lines.push(
    `- Papers with DOI: ${evidenceBoundary.metrics.papersWithDoi}/${evidenceBoundary.metrics.totalPapers}`
  );
  for (const bullet of evidenceBoundary.bullets) {
    lines.push(`- ${bullet}`);
  }
  lines.push("");
  lines.push("## Source Quality");
  lines.push("");
  lines.push(`**${sourceQuality.label}:** ${sourceQuality.description}`);
  lines.push("");
  lines.push(`- Live papers: ${sourceQuality.metrics.livePapers}`);
  lines.push(`- Mock papers: ${sourceQuality.metrics.mockPapers}`);
  lines.push(`- Source diversity: ${sourceQuality.metrics.sourceDiversity}`);
  lines.push(`- Average relevance: ${sourceQuality.metrics.averageRelevance.toFixed(2)}`);
  lines.push(`- Strong query matches: ${sourceQuality.metrics.highRelevancePapers}`);
  lines.push(`- Low query matches: ${sourceQuality.metrics.lowRelevancePapers}`);
  lines.push(
    `- Direct query-title/abstract matches: ${sourceQuality.metrics.strongQueryAlignmentPapers}`
  );
  lines.push(
    `- Weak query-title/abstract matches: ${sourceQuality.metrics.weakQueryAlignmentPapers}`
  );
  if (sourceQuality.strengths.length) {
    lines.push("- Strengths: " + sourceQuality.strengths.join("; "));
  }
  if (sourceQuality.cautions.length) {
    lines.push("- Cautions: " + sourceQuality.cautions.join("; "));
  }
  lines.push("");
  lines.push("## TL;DR");
  lines.push("");
  lines.push(brief.tldr);
  lines.push("");
  lines.push("## Executive Summary");
  lines.push("");
  lines.push(`${brief.executiveSummary.paragraph} ${sourceList(brief.executiveSummary.sourcePaperIds)}`);
  lines.push(...evidenceLines(brief.executiveSummary.evidence));
  lines.push("");
  lines.push("## Key Findings");
  lines.push("");

  for (const item of brief.keyFindings) {
    lines.push(`### ${item.finding}`);
    lines.push("");
    lines.push(`${item.explanation} ${sourceList(item.sourcePaperIds)}`);
    lines.push(...evidenceLines(item.evidence));
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
    lines.push(...evidenceLines(item.evidence));
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
    lines.push(...evidenceLines(item.evidence));
    lines.push("");
  }

  lines.push("## Controversies / Uncertainties");
  lines.push("");
  for (const item of brief.controversiesOrUncertainties) {
    lines.push(`### ${item.issue}`);
    lines.push("");
    lines.push(`${item.explanation} ${sourceList(item.sourcePaperIds)}`);
    lines.push(...evidenceLines(item.evidence));
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
  lines.push(`- Requested sources: ${brief.searchSummary.requestedSources.join(", ")}`);
  lines.push(`- Successful sources: ${brief.searchSummary.sourcesUsed.join(", ")}`);
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

  if (brief.searchSummary.sourceDiagnostics.length) {
    lines.push("### Source Diagnostics");
    lines.push("");
    lines.push("| Source | Status | Results | Cached | Query | Message |");
    lines.push("| --- | --- | ---: | --- | --- | --- |");
    for (const diagnostic of brief.searchSummary.sourceDiagnostics) {
      lines.push(
        `| ${diagnostic.source} | ${diagnostic.status} | ${diagnostic.resultCount} | ${
          diagnostic.cached ? "yes" : "no"
        } | ${diagnostic.query} | ${diagnostic.message ?? ""} |`
      );
    }
    lines.push("");
  }

  lines.push("## Bibliography");
  lines.push("");
  for (const paper of papers) {
    const insight = getPaperInsight(paper, undefined, alignmentQuery);
    const metadataWarnings = getPaperMetadataWarnings(paper);

    lines.push(`### [${paper.id}] ${paper.title}`);
    lines.push("");
    lines.push(`- Source: ${paper.source}`);
    lines.push(`- Role: ${insight.role}`);
    lines.push(`- Why read this: ${insight.whyRead}`);
    if (insight.queryAlignment) {
      lines.push(`- Query alignment: ${insight.queryAlignment.label} (${insight.queryAlignment.combinedScore.toFixed(2)})`);
      lines.push(`- Query alignment detail: title ${insight.queryAlignment.titleScore.toFixed(2)}, abstract ${insight.queryAlignment.abstractScore.toFixed(2)}`);
      if (insight.queryAlignment.matchedTerms.length) {
        lines.push(`- Matched query terms: ${insight.queryAlignment.matchedTerms.join(", ")}`);
      }
      if (insight.queryAlignment.missingTerms.length) {
        lines.push(`- Missing query terms: ${insight.queryAlignment.missingTerms.join(", ")}`);
      }
    }
    if (insight.strengths.length) {
      lines.push(`- Strengths: ${insight.strengths.join("; ")}`);
    }
    if (insight.limitations.length) {
      lines.push(`- Limitations: ${insight.limitations.join("; ")}`);
    }
    if (metadataWarnings.length) {
      lines.push(
        `- Metadata warnings: ${metadataWarnings
          .map((warning) => warning.replace("metadata warning:", "").trim())
          .join("; ")}`
      );
    }
    lines.push(`- Authors: ${paper.authors.join(", ")}`);
    lines.push(`- Year: ${clean(paper.year?.toString())}`);
    lines.push(`- Venue: ${clean(paper.venue)}`);
    lines.push(`- DOI: ${doiMarkdown(paper.doi)}`);
    lines.push(`- URL: ${clean(paper.sourceUrls[0])}`);
    lines.push(`- Citation count: ${clean(paper.citationCount?.toString())}`);
    lines.push(`- Influential citation count: ${clean(paper.influentialCitationCount?.toString())}`);
    lines.push(`- Final score: ${score(paper.finalScore)}`);
    lines.push(`- Score breakdown: relevance ${score(paper.relevanceScore)}, semantic ${score(paper.semanticScore)}, citations ${score(paper.citationScore)}, recency ${score(paper.recencyScore)}, completeness ${score(paper.completenessScore)}, source ${score(paper.sourceQualityScore)}, identifiers ${score(paper.identifierScore)}`);
    if (paper.abstract) {
      lines.push(`- Abstract: ${paper.abstract}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trim()}\n`;
}

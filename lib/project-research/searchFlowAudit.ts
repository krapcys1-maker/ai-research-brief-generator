import { discoverFullText } from "@/lib/fulltext/discoverFullText";
import type { EvidenceCollectionResult } from "@/lib/project-research/evidenceCollector";
import type { NormalizedPaper, SourceSearchDiagnostic } from "@/lib/sources/types";

export type SearchFlowAudit = {
  queryVariantCount: number;
  successfulQueryCount: number;
  emptyQueryCount: number;
  failedQueryCount: number;
  rawPaperCount: number;
  dedupedPaperCount: number;
  candidatePaperCount: number;
  candidateWithFullTextCandidateCount: number;
  attemptedFullTextCount: number;
  parsedFullTextCount: number;
  unavailableFullTextCount: number;
  failedFullTextCount: number;
  requiredBucketCandidateCoverage: number;
  sourceResultCounts: Record<string, number>;
  topCandidateIds: string[];
  verdict: "pass" | "needs_review";
  warnings: string[];
};

type FullTextAttempt = {
  paper: NormalizedPaper;
  fullText: {
    status: "not_checked" | "unavailable" | "available" | "fetched" | "parsed" | "failed";
  };
};

function hasFullTextCandidate(paper: NormalizedPaper) {
  return discoverFullText(paper).status === "available";
}

function evidenceRankByPaperId(bucketMetrics: EvidenceCollectionResult["bucketMetrics"]) {
  const ranks = new Map<string, number>();

  for (const metric of bucketMetrics) {
    metric.topPaperIds.forEach((paperId, index) => {
      const current = ranks.get(paperId);
      const rank = index + 1;
      ranks.set(paperId, current === undefined ? rank : Math.min(current, rank));
    });
  }

  return ranks;
}

export function rankCandidatePapersForFullText(input: {
  papers: NormalizedPaper[];
  bucketMetrics: EvidenceCollectionResult["bucketMetrics"];
}) {
  const ranks = evidenceRankByPaperId(input.bucketMetrics);

  return input.papers
    .filter((paper) => ranks.has(paper.id))
    .sort((left, right) => {
      const leftFullText = hasFullTextCandidate(left) ? 0 : 1;
      const rightFullText = hasFullTextCandidate(right) ? 0 : 1;
      if (leftFullText !== rightFullText) {
        return leftFullText - rightFullText;
      }

      const leftRank = ranks.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightRank = ranks.get(right.id) ?? Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      const leftCitations = left.citationCount ?? 0;
      const rightCitations = right.citationCount ?? 0;
      if (leftCitations !== rightCitations) {
        return rightCitations - leftCitations;
      }

      return (right.year ?? 0) - (left.year ?? 0);
    });
}

function sourceResultCounts(diagnostics: SourceSearchDiagnostic[]) {
  return diagnostics.reduce<Record<string, number>>((counts, diagnostic) => {
    counts[diagnostic.source] = (counts[diagnostic.source] ?? 0) + diagnostic.resultCount;
    return counts;
  }, {});
}

function queryStatusCounts(diagnostics: SourceSearchDiagnostic[]) {
  const byQuery = new Map<string, SourceSearchDiagnostic[]>();

  for (const diagnostic of diagnostics) {
    byQuery.set(diagnostic.query, [...(byQuery.get(diagnostic.query) ?? []), diagnostic]);
  }

  const queryGroups = [...byQuery.values()];

  return {
    successfulQueryCount: queryGroups.filter((group) =>
      group.some((diagnostic) => diagnostic.status === "success" && diagnostic.resultCount > 0)
    ).length,
    emptyQueryCount: queryGroups.filter((group) =>
      group.every((diagnostic) => diagnostic.status === "empty")
    ).length,
    failedQueryCount: queryGroups.filter((group) =>
      group.every((diagnostic) => diagnostic.status === "failed")
    ).length
  };
}

function requiredBucketCandidateCoverage(
  evidenceCollection: EvidenceCollectionResult
) {
  const requiredMetrics = evidenceCollection.bucketMetrics.filter((metric) =>
    !evidenceCollection.missingRequiredBuckets.includes(metric.bucketId)
  );

  if (evidenceCollection.requiredBucketCount === 0) {
    return 0;
  }

  return Number(
    (requiredMetrics.filter((metric) => metric.candidateCount > 0).length /
      evidenceCollection.requiredBucketCount).toFixed(3)
  );
}

function warningsFor(input: {
  queryVariantCount: number;
  successfulQueryCount: number;
  candidatePaperCount: number;
  candidateWithFullTextCandidateCount: number;
  attemptedFullTextCount: number;
  parsedFullTextCount: number;
  requiredBucketCandidateCoverage: number;
}) {
  const warnings: string[] = [];

  if (input.successfulQueryCount === 0) {
    warnings.push("No query variant returned papers.");
  } else if (input.successfulQueryCount / input.queryVariantCount < 0.2) {
    warnings.push("Too few query variants returned source papers.");
  }

  if (input.candidatePaperCount === 0) {
    warnings.push("Evidence collector produced no candidate papers.");
  }

  if (
    input.candidatePaperCount > 0 &&
    input.candidateWithFullTextCandidateCount / input.candidatePaperCount < 0.25
  ) {
    warnings.push("Few candidate papers have legal full-text/PDF candidates.");
  }

  if (input.candidateWithFullTextCandidateCount > 0 && input.attemptedFullTextCount === 0) {
    warnings.push("Full-text candidates exist but ingestion attempted none.");
  }

  if (input.attemptedFullTextCount > 0 && input.parsedFullTextCount === 0) {
    warnings.push("Full-text ingestion attempted papers but parsed none.");
  }

  if (input.requiredBucketCandidateCoverage < 1) {
    warnings.push("Not every required bucket produced candidate papers.");
  }

  return warnings;
}

export function auditSearchFlow(input: {
  queryVariants: string[];
  sourceDiagnostics: SourceSearchDiagnostic[];
  rawPapers: NormalizedPaper[];
  dedupedPapers: NormalizedPaper[];
  candidatePapers: NormalizedPaper[];
  evidenceCollection: EvidenceCollectionResult;
  fullTextAttempts: FullTextAttempt[];
}): SearchFlowAudit {
  const statusCounts = queryStatusCounts(input.sourceDiagnostics);
  const candidateWithFullTextCandidateCount = input.candidatePapers.filter(
    hasFullTextCandidate
  ).length;
  const parsedFullTextCount = input.fullTextAttempts.filter(
    (attempt) => attempt.fullText.status === "parsed"
  ).length;
  const unavailableFullTextCount = input.fullTextAttempts.filter(
    (attempt) => attempt.fullText.status === "unavailable"
  ).length;
  const failedFullTextCount = input.fullTextAttempts.filter(
    (attempt) => attempt.fullText.status === "failed"
  ).length;
  const bucketCandidateCoverage = requiredBucketCandidateCoverage(
    input.evidenceCollection
  );
  const warnings = warningsFor({
    queryVariantCount: input.queryVariants.length,
    successfulQueryCount: statusCounts.successfulQueryCount,
    candidatePaperCount: input.candidatePapers.length,
    candidateWithFullTextCandidateCount,
    attemptedFullTextCount: input.fullTextAttempts.length,
    parsedFullTextCount,
    requiredBucketCandidateCoverage: bucketCandidateCoverage
  });

  return {
    queryVariantCount: input.queryVariants.length,
    ...statusCounts,
    rawPaperCount: input.rawPapers.length,
    dedupedPaperCount: input.dedupedPapers.length,
    candidatePaperCount: input.candidatePapers.length,
    candidateWithFullTextCandidateCount,
    attemptedFullTextCount: input.fullTextAttempts.length,
    parsedFullTextCount,
    unavailableFullTextCount,
    failedFullTextCount,
    requiredBucketCandidateCoverage: bucketCandidateCoverage,
    sourceResultCounts: sourceResultCounts(input.sourceDiagnostics),
    topCandidateIds: input.candidatePapers.slice(0, 12).map((paper) => paper.id),
    verdict: warnings.length === 0 ? "pass" : "needs_review",
    warnings
  };
}

export function searchFlowAuditToMarkdown(audit: SearchFlowAudit) {
  return [
    "# Search Flow Audit",
    "",
    `Verdict: ${audit.verdict}`,
    `Query variants: ${audit.queryVariantCount}`,
    `Successful queries: ${audit.successfulQueryCount}`,
    `Empty queries: ${audit.emptyQueryCount}`,
    `Failed queries: ${audit.failedQueryCount}`,
    `Raw papers: ${audit.rawPaperCount}`,
    `Deduped papers: ${audit.dedupedPaperCount}`,
    `Candidate papers: ${audit.candidatePaperCount}`,
    `Candidates with full-text/PDF: ${audit.candidateWithFullTextCandidateCount}`,
    `Attempted full-text: ${audit.attemptedFullTextCount}`,
    `Parsed full-text: ${audit.parsedFullTextCount}`,
    `Unavailable full-text: ${audit.unavailableFullTextCount}`,
    `Failed full-text: ${audit.failedFullTextCount}`,
    `Required bucket candidate coverage: ${audit.requiredBucketCandidateCoverage}`,
    `Top candidate IDs: ${audit.topCandidateIds.join(", ") || "none"}`,
    "",
    "## Source result counts",
    "",
    ...Object.entries(audit.sourceResultCounts).map(
      ([source, count]) => `- ${source}: ${count}`
    ),
    "",
    "## Warnings",
    "",
    ...(audit.warnings.length ? audit.warnings.map((warning) => `- ${warning}`) : ["- none"]),
    ""
  ].join("\n");
}

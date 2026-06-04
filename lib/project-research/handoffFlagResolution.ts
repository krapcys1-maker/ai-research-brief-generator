import type {
  HandoffFlagResolution,
  ProjectIdeaHandoffContext,
  ReviewedPaper
} from "@/lib/project-research/types";

type ProposalInput = {
  handoffContext?: ProjectIdeaHandoffContext;
  requiredCoveredCount: number;
  requiredBucketCount: number;
  requiredBucketsWithoutParsedFullText: string[];
  parsedFullTextCount: number;
  minParsedPapers: number;
  reviewedPapers: ReviewedPaper[];
};

const RESOLVED_STATUS = "replaced_by_stronger_evidence" satisfies HandoffFlagResolution["status"];

function strongestEvidenceIds(papers: ReviewedPaper[]) {
  const strengthRank = new Map([
    ["full_text_strong", 4],
    ["full_text_partial", 3],
    ["abstract_supported", 2],
    ["metadata_only", 1],
    ["weak_ai_hypothesis", 0]
  ]);

  return [...papers]
    .filter((paper) => paper.usefulForProject)
    .sort(
      (left, right) =>
        (strengthRank.get(right.evidenceStrength) ?? 0) -
        (strengthRank.get(left.evidenceStrength) ?? 0)
    )
    .slice(0, 5)
    .map((paper) => paper.paperId);
}

function researchEvidenceIsStrongEnough(input: ProposalInput) {
  return (
    input.requiredBucketCount > 0 &&
    input.requiredCoveredCount === input.requiredBucketCount &&
    input.requiredBucketsWithoutParsedFullText.length === 0 &&
    input.parsedFullTextCount >= input.minParsedPapers
  );
}

function unresolvedRationale(input: ProposalInput) {
  const reasons = [
    input.requiredCoveredCount < input.requiredBucketCount
      ? `required coverage incomplete: ${input.requiredCoveredCount}/${input.requiredBucketCount}`
      : null,
    input.requiredBucketsWithoutParsedFullText.length > 0
      ? `covered buckets without parsed full-text: ${input.requiredBucketsWithoutParsedFullText.join(", ")}`
      : null,
    input.parsedFullTextCount < input.minParsedPapers
      ? `parsed full-text below target: ${input.parsedFullTextCount}/${input.minParsedPapers}`
      : null
  ].filter(Boolean);

  return reasons.length
    ? reasons.join("; ")
    : "Research did not provide enough explicit evidence to resolve this handoff review flag.";
}

export function proposeHandoffFlagResolutions(
  input: ProposalInput
): HandoffFlagResolution[] {
  const flags = input.handoffContext?.reviewFlags ?? [];

  if (flags.length === 0) {
    return [];
  }

  const evidenceIds = strongestEvidenceIds(input.reviewedPapers);
  const canReplaceWeakSourceSignal =
    researchEvidenceIsStrongEnough(input) && evidenceIds.length > 0;

  return flags.map((flag) =>
    canReplaceWeakSourceSignal
      ? {
          reviewFlag: flag,
          status: RESOLVED_STATUS,
          rationale:
            "GitHub/source-level signal was weak, but required research buckets are covered with parsed full-text evidence before PRD and architecture.",
          evidenceIds
        }
      : {
          reviewFlag: flag,
          status: "unresolved",
          rationale: unresolvedRationale(input),
          evidenceIds
        }
  );
}

export function handoffFlagResolutionProposalToMarkdown(
  resolutions: HandoffFlagResolution[]
) {
  const resolvedCount = resolutions.filter(
    (resolution) => resolution.status !== "unresolved"
  ).length;
  const unresolvedCount = resolutions.filter(
    (resolution) => resolution.status === "unresolved"
  ).length;

  return [
    "# Handoff flag resolution proposal",
    "",
    "This is an automatic proposal created after the research iteration. It is not silently applied to the project pack; inspect it before using it as `handoffFlagResolutions`.",
    "",
    `Resolved proposed: ${resolvedCount}`,
    `Unresolved: ${unresolvedCount}`,
    "",
    "## Decisions",
    "",
    ...(resolutions.length
      ? resolutions.flatMap((resolution) => [
          `### ${resolution.reviewFlag}`,
          "",
          `- Proposed status: ${resolution.status}`,
          `- Rationale: ${resolution.rationale}`,
          `- Evidence IDs: ${resolution.evidenceIds.join(", ") || "none"}`,
          ""
        ])
      : ["- none"])
  ].join("\n");
}

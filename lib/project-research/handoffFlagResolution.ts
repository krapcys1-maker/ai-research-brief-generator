import type {
  HandoffFlagResolution,
  ProjectIdeaInput,
  ProjectIdeaHandoffContext,
  ReviewedPaper
} from "@/lib/project-research/types";

type ProposalInput = {
  idea?: ProjectIdeaInput;
  handoffContext?: ProjectIdeaHandoffContext;
  requiredBucketIds: string[];
  requiredCoveredCount: number;
  requiredBucketCount: number;
  requiredBucketsWithoutParsedFullText: string[];
  parsedFullTextCount: number;
  minParsedPapers: number;
  reviewedPapers: ReviewedPaper[];
  paperTextsById?: Record<string, string>;
};

const RESOLVED_STATUS = "replaced_by_stronger_evidence" satisfies HandoffFlagResolution["status"];
const STRONG_EVIDENCE = new Set<ReviewedPaper["evidenceStrength"]>([
  "full_text_strong",
  "full_text_partial"
]);
const STOP_TERMS = new Set([
  "and",
  "for",
  "from",
  "how",
  "the",
  "with",
  "system",
  "systems",
  "monitor",
  "quality",
  "project",
  "tool",
  "tools"
]);

const BUCKET_HINTS: Record<string, string[]> = {
  context_compression_fidelity: [
    "context",
    "compression",
    "compress",
    "fidelity",
    "retention",
    "summarization",
    "summary"
  ],
  token_budget_tradeoffs: [
    "token",
    "budget",
    "context",
    "compression",
    "cost",
    "efficient",
    "attention"
  ],
  agent_task_success: [
    "agent",
    "task",
    "success",
    "workflow",
    "tool use",
    "agent memory",
    "long horizon"
  ],
  rag_evidence_loss: [
    "retrieval",
    "augmented",
    "generation",
    "rag",
    "evidence",
    "faithfulness",
    "hallucination"
  ]
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenize(value: string) {
  return normalize(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length > 2 && !STOP_TERMS.has(term));
}

function uniqueTerms(values: string[]) {
  return Array.from(new Set(values.flatMap(tokenize)));
}

function bucketTerms(bucketId: string) {
  return uniqueTerms([bucketId, ...(BUCKET_HINTS[bucketId] ?? [])]);
}

function ideaTerms(idea?: ProjectIdeaInput) {
  if (!idea) {
    return [];
  }

  return uniqueTerms([idea.title, idea.description, ...idea.preferredDomains]).slice(
    0,
    24
  );
}

function paperText(input: ProposalInput, paper: ReviewedPaper) {
  return normalize(
    [
      paper.title,
      paper.keyMethods.join(" "),
      input.paperTextsById?.[paper.paperId] ?? ""
    ].join(" ")
  );
}

function hasRelevantBucketSignal(input: ProposalInput, paper: ReviewedPaper) {
  const text = paperText(input, paper);
  const projectTerms = ideaTerms(input.idea);

  return paper.bucketIds.some((bucketId) => {
    const bucketHits = bucketTerms(bucketId).filter((term) => text.includes(term));
    const projectHits = projectTerms.filter((term) => text.includes(term));

    return bucketHits.length >= 1 && projectHits.length >= 1;
  });
}

function strongestEvidenceIds(papers: ReviewedPaper[]) {
  const strengthRank = new Map([
    ["full_text_strong", 4],
    ["full_text_partial", 3],
    ["abstract_supported", 2],
    ["metadata_only", 1],
    ["weak_ai_hypothesis", 0]
  ]);

  return [...papers]
    .filter((paper) => paper.usefulForProject && STRONG_EVIDENCE.has(paper.evidenceStrength))
    .sort(
      (left, right) =>
        (strengthRank.get(right.evidenceStrength) ?? 0) -
        (strengthRank.get(left.evidenceStrength) ?? 0)
    )
    .slice(0, 5)
    .map((paper) => paper.paperId);
}

function requiredBucketsHaveRelevantParsedEvidence(input: ProposalInput) {
  const requiredBucketIds =
    input.requiredBucketIds.length > 0
      ? input.requiredBucketIds
      : Array.from(new Set(input.reviewedPapers.flatMap((paper) => paper.bucketIds)));

  return requiredBucketIds.every((bucketId) =>
    input.reviewedPapers.some(
      (paper) =>
        paper.bucketIds.includes(bucketId) &&
        paper.usefulForProject &&
        paper.fullTextStatus === "parsed" &&
        STRONG_EVIDENCE.has(paper.evidenceStrength) &&
        hasRelevantBucketSignal(input, paper)
    )
  );
}

function relevantStrongEvidence(input: ProposalInput) {
  return input.reviewedPapers.filter(
    (paper) =>
      paper.usefulForProject &&
      paper.fullTextStatus === "parsed" &&
      STRONG_EVIDENCE.has(paper.evidenceStrength) &&
      hasRelevantBucketSignal(input, paper)
  );
}

function researchEvidenceIsStrongEnough(input: ProposalInput) {
  return (
    input.requiredBucketCount > 0 &&
    input.requiredCoveredCount === input.requiredBucketCount &&
    input.requiredBucketsWithoutParsedFullText.length === 0 &&
    input.parsedFullTextCount >= input.minParsedPapers &&
    requiredBucketsHaveRelevantParsedEvidence(input)
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
      : null,
    !requiredBucketsHaveRelevantParsedEvidence(input)
      ? "missing relevant parsed full-text evidence for every required bucket"
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

  const evidenceIds = strongestEvidenceIds(relevantStrongEvidence(input));
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

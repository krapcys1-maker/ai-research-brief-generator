import {
  hasRequiredBucketAnchor,
  requiredAnchorsForBucket
} from "@/lib/project-research/domainAnchors";
import type {
  ProjectIdeaInput,
  ResearchPlan,
  ReviewedPaper
} from "@/lib/project-research/types";

export type PaperRelevanceDecision = "keep" | "maybe" | "reject";

export type PaperRelevanceJudgment = {
  paperId: string;
  title: string;
  bucketId: string;
  score: number;
  decision: PaperRelevanceDecision;
  rationale: string;
  matchedSignals: string[];
  missingSignals: string[];
};

export type PaperRelevanceJudgeResult = {
  judgments: PaperRelevanceJudgment[];
  filteredReviewedPapers: ReviewedPaper[];
  keptPaperCount: number;
  rejectedAssignmentCount: number;
  maybeAssignmentCount: number;
};

const STOP_TERMS = new Set([
  "and",
  "for",
  "from",
  "how",
  "the",
  "with",
  "system",
  "systems",
  "paper",
  "study",
  "survey",
  "review",
  "large",
  "language",
  "model",
  "models"
]);
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

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function phraseMatches(text: string, value: string) {
  const normalizedValue = normalize(value);
  const terms = tokenize(value);
  if (terms.length === 0) {
    return false;
  }

  if (terms.length === 1) {
    return new Set(tokenize(text)).has(terms[0]);
  }

  if (text.includes(normalizedValue)) {
    return true;
  }

  return terms.filter((term) => text.includes(term)).length >= 2;
}

function paperText(
  paper: ReviewedPaper,
  paperTextsById: Record<string, string> | undefined
) {
  const sourcePaperText = paperTextsById?.[paper.paperId];

  if (sourcePaperText) {
    return normalize([paper.title, sourcePaperText].join(" "));
  }

  return normalize(
    [
      paper.title,
      paper.keyMethods.join(" "),
      paper.implementationImplications.join(" "),
      paper.riskImplications.join(" "),
      paperTextsById?.[paper.paperId] ?? ""
    ].join(" ")
  );
}

function scoreBucketAssignment(input: {
  idea: ProjectIdeaInput;
  researchPlan: ResearchPlan;
  paper: ReviewedPaper;
  bucketId: string;
  paperTextsById?: Record<string, string>;
}): PaperRelevanceJudgment {
  const bucket = input.researchPlan.evidenceBuckets.find(
    (item) => item.id === input.bucketId
  );
  const text = paperText(input.paper, input.paperTextsById);
  const matchedSignals: string[] = [];
  const missingSignals: string[] = [];

  if (!bucket) {
    return {
      paperId: input.paper.paperId,
      title: input.paper.title,
      bucketId: input.bucketId,
      score: 0,
      decision: "reject",
      rationale: "Unknown research bucket.",
      matchedSignals: [],
      missingSignals: ["unknown bucket"]
    };
  }

  const keywordHits = bucket.keywords.filter((keyword) =>
    phraseMatches(text, keyword)
  );
  const bucketTerms = unique([
    ...tokenize(bucket.id),
    ...tokenize(bucket.label),
    ...tokenize(bucket.query),
    ...bucket.targetQuestions.flatMap(tokenize)
  ]);
  const bucketTermHits = bucketTerms.filter((term) => text.includes(term));
  const ideaTerms = unique([
    ...tokenize(input.idea.title),
    ...tokenize(input.idea.description),
    ...input.idea.preferredDomains.flatMap(tokenize)
  ]);
  const ideaHits = ideaTerms.filter((term) => text.includes(term));
  const requiredAnchors = requiredAnchorsForBucket(bucket.id);
  const hasDomainAnchor = hasRequiredBucketAnchor(bucket, text);

  if (keywordHits.length > 0) {
    matchedSignals.push(`keyword hits: ${keywordHits.slice(0, 4).join(", ")}`);
  } else {
    missingSignals.push("no bucket keyword hit");
  }

  if (bucketTermHits.length > 0) {
    matchedSignals.push(
      `bucket term hits: ${bucketTermHits.slice(0, 6).join(", ")}`
    );
  } else {
    missingSignals.push("no bucket term hit");
  }

  if (ideaHits.length > 0) {
    matchedSignals.push(`idea term hits: ${ideaHits.slice(0, 6).join(", ")}`);
  } else {
    missingSignals.push("no idea term hit");
  }

  if (requiredAnchors.length === 0) {
    matchedSignals.push("no required domain anchor configured");
  } else if (hasDomainAnchor) {
    matchedSignals.push("required domain anchor present");
  } else {
    missingSignals.push(
      `missing required domain anchor: ${requiredAnchors.slice(0, 6).join(", ")}`
    );
  }

  const keywordScore = bucket.keywords.length
    ? keywordHits.length / bucket.keywords.length
    : 0;
  const bucketTermScore = bucketTerms.length
    ? Math.min(1, bucketTermHits.length / Math.min(bucketTerms.length, 8))
    : 0;
  const ideaScore = ideaTerms.length
    ? Math.min(1, ideaHits.length / Math.min(ideaTerms.length, 6))
    : 0;
  const fullTextBonus = input.paper.fullTextStatus === "parsed" ? 15 : 0;
  const usefulBonus = input.paper.usefulForProject ? 5 : 0;
  const score = Math.round(
    Math.min(
      100,
      keywordScore * 45 + bucketTermScore * 25 + ideaScore * 15 + fullTextBonus + usefulBonus
    )
  );
  const hasStrongTopicalMatch =
    hasDomainAnchor &&
    (keywordHits.length > 0 || (bucketTermHits.length >= 2 && ideaHits.length > 0));
  const decision: PaperRelevanceDecision =
    !hasDomainAnchor
      ? "reject"
      : score >= 55 && hasStrongTopicalMatch && bucketTermHits.length > 0
      ? "keep"
      : score >= 35 && (keywordHits.length > 0 || bucketTermHits.length >= 2)
        ? "maybe"
        : "reject";

  return {
    paperId: input.paper.paperId,
    title: input.paper.title,
    bucketId: bucket.id,
    score,
    decision,
    rationale:
      !hasDomainAnchor
        ? "Paper matches generic bucket wording but misses the required project-domain anchor."
        : decision === "keep"
        ? "Paper has enough topical overlap with the bucket and project idea."
        : decision === "maybe"
          ? "Paper has partial overlap; keep it visible but do not rely on it as strong bucket evidence."
          : "Paper is too weakly matched to this bucket.",
    matchedSignals,
    missingSignals
  };
}

export function judgePaperRelevance(input: {
  idea: ProjectIdeaInput;
  researchPlan: ResearchPlan;
  reviewedPapers: ReviewedPaper[];
  paperTextsById?: Record<string, string>;
}): PaperRelevanceJudgeResult {
  const judgments = input.reviewedPapers.flatMap((paper) =>
    paper.bucketIds.map((bucketId) =>
      scoreBucketAssignment({
        idea: input.idea,
        researchPlan: input.researchPlan,
        paper,
        bucketId,
        paperTextsById: input.paperTextsById
      })
    )
  );
  const keptByPaperId = new Map<string, Set<string>>();
  const maybeByPaperId = new Map<string, Set<string>>();

  for (const judgment of judgments) {
    if (judgment.decision === "reject") {
      continue;
    }

    if (judgment.decision === "keep") {
      const existing = keptByPaperId.get(judgment.paperId) ?? new Set<string>();
      existing.add(judgment.bucketId);
      keptByPaperId.set(judgment.paperId, existing);
    } else {
      const maybeExisting = maybeByPaperId.get(judgment.paperId) ?? new Set<string>();
      maybeExisting.add(judgment.bucketId);
      maybeByPaperId.set(judgment.paperId, maybeExisting);
    }
  }

  const filteredReviewedPapers = input.reviewedPapers
    .map((paper) => {
      const keptBucketIds = keptByPaperId.get(paper.paperId);
      const maybeBucketIds = maybeByPaperId.get(paper.paperId);

      if (!keptBucketIds?.size && !maybeBucketIds?.size) {
        return {
          ...paper,
          usefulForProject: false,
          limitations: [
            ...paper.limitations,
            "paper relevance judge rejected all bucket assignments for this paper"
          ]
        };
      }

      if (!keptBucketIds?.size) {
        return {
          ...paper,
          bucketIds: paper.bucketIds.filter((bucketId) => maybeBucketIds?.has(bucketId)),
          usefulForProject: false,
          limitations: [
            ...paper.limitations,
            `paper relevance judge marked these bucket assignments as maybe only; not used for readiness: ${[...(maybeBucketIds ?? new Set<string>())].join(", ")}`
          ]
        };
      }

      return {
        ...paper,
        bucketIds: paper.bucketIds.filter((bucketId) => keptBucketIds.has(bucketId)),
        limitations: maybeBucketIds?.size
          ? [
              ...paper.limitations,
              `paper relevance judge marked these bucket assignments as maybe and excluded them from readiness: ${[...maybeBucketIds].join(", ")}`
            ]
          : paper.limitations
      };
    });

  return {
    judgments,
    filteredReviewedPapers,
    keptPaperCount: filteredReviewedPapers.filter((paper) => paper.usefulForProject)
      .length,
    rejectedAssignmentCount: judgments.filter(
      (judgment) => judgment.decision === "reject"
    ).length,
    maybeAssignmentCount: judgments.filter((judgment) => judgment.decision === "maybe")
      .length
  };
}

export function paperRelevanceJudgmentToMarkdown(
  result: PaperRelevanceJudgeResult
) {
  return [
    "# Paper relevance judgement",
    "",
    `Kept papers: ${result.keptPaperCount}`,
    `Maybe assignments: ${result.maybeAssignmentCount}`,
    `Rejected assignments: ${result.rejectedAssignmentCount}`,
    "",
    "## Decisions",
    "",
    ...result.judgments.flatMap((judgment) => [
      `### ${judgment.paperId} -> ${judgment.bucketId}`,
      "",
      `- Title: ${judgment.title}`,
      `- Score: ${judgment.score}`,
      `- Decision: ${judgment.decision}`,
      `- Rationale: ${judgment.rationale}`,
      `- Matched: ${judgment.matchedSignals.join(" | ") || "none"}`,
      `- Missing: ${judgment.missingSignals.join(" | ") || "none"}`,
      ""
    ])
  ].join("\n");
}

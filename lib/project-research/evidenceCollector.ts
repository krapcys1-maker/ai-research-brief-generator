import { dedupePapers } from "@/lib/pipeline/dedupe";
import type { EvidenceBucket, ResearchPlan, ReviewedPaper } from "@/lib/project-research/types";
import type { NormalizedPaper } from "@/lib/sources/types";

const supportedEvidenceStrength: ReviewedPaper["evidenceStrength"][] = [
  "full_text_strong",
  "full_text_partial",
  "abstract_supported"
];

export type EvidenceCollectionBucketMetric = {
  bucketId: string;
  candidateCount: number;
  reviewedCount: number;
  usefulReviewedCount: number;
  parsedCount: number;
  topPaperIds: string[];
  coverageReady: boolean;
};

export type EvidenceCollectionResult = {
  reviewedPapers: ReviewedPaper[];
  bucketMetrics: EvidenceCollectionBucketMetric[];
  requiredReadyCount: number;
  requiredBucketCount: number;
  missingRequiredBuckets: string[];
  canBuildReadyBrief: boolean;
};

type CollectProjectEvidenceInput = {
  researchPlan: ResearchPlan;
  papers: NormalizedPaper[];
  maxPapersPerBucket?: number;
  minScore?: number;
};

const DEFAULT_MAX_PAPERS_PER_BUCKET = 4;
const DEFAULT_MIN_SCORE = 0.18;
const STRICT_KEYWORD_BUCKETS = new Set([
  "context_compression_fidelity",
  "token_budget_tradeoffs",
  "agent_task_success",
  "rag_evidence_loss"
]);
const REQUIRED_ANCHOR_TERMS_BY_BUCKET: Record<string, string[]> = {
  cli_observability: [
    "cli",
    "command line",
    "command-line",
    "terminal",
    "developer",
    "software",
    "bug report",
    "issue report",
    "logs",
    "telemetry"
  ],
  auth_proxy_failure_modes: [
    "authentication",
    "auth",
    "proxy",
    "routing",
    "api",
    "configuration",
    "developer",
    "software",
    "terminal",
    "command"
  ],
  sandbox_preflight_checks: [
    "agent",
    "llm agent",
    "sandbox",
    "sandboxed",
    "runtime",
    "tool call",
    "execution gate"
  ],
  tool_policy_safety: [
    "agent",
    "tool",
    "tool use",
    "sandbox",
    "permission",
    "capability",
    "policy"
  ],
  runtime_observability: [
    "agent",
    "container",
    "sandbox",
    "runtime",
    "tool",
    "logs",
    "telemetry"
  ],
  release_gate_replay: [
    "agent",
    "sandbox",
    "replay",
    "fixture",
    "release gate",
    "runtime"
  ],
  self_hosted_security_controls: [
    "self-hosted",
    "self hosted",
    "secrets",
    "workspace",
    "local data"
  ],
  ai_workspace_governance: [
    "workspace",
    "tool approval",
    "policy readiness",
    "privacy",
    "ai workspace",
    "governance"
  ],
  local_first_privacy: [
    "local-first",
    "local first",
    "self-hosted",
    "self hosted",
    "local data",
    "data boundary"
  ],
  deployment_readiness_audit: [
    "deployment readiness",
    "configuration audit",
    "remediation",
    "self-hosted",
    "workspace",
    "security"
  ],
  document_structure_preservation: [
    "document",
    "pdf",
    "markdown",
    "ocr"
  ],
  rag_ingestion_quality: [
    "rag",
    "retrieval augmented generation",
    "ingestion",
    "document ingestion",
    "grounding"
  ],
  conversion_regression_fixtures: [
    "document",
    "pdf",
    "ocr",
    "fixture",
    "regression test",
    "table"
  ],
  unsafe_document_inputs: [
    "document",
    "untrusted",
    "prompt injection",
    "rag",
    "ingestion",
    "llm"
  ]
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
  "review",
  "survey",
  "benchmark",
  "evaluation"
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

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function paperText(paper: NormalizedPaper) {
  return normalize(
    [paper.title, paper.abstract, paper.venue].filter(Boolean).join(" ")
  );
}

function phraseOrTokenMatch(text: string, keyword: string, strictMultiTerm = false) {
  const normalizedKeyword = normalize(keyword);
  const keywordTerms = tokenize(keyword);
  if (!keywordTerms.length) {
    return false;
  }

  if (keywordTerms.length === 1) {
    return new Set(tokenize(text)).has(keywordTerms[0]);
  }

  if (text.includes(normalizedKeyword)) {
    return true;
  }

  if (!strictMultiTerm) {
    return keywordTerms.some((term) => text.includes(term));
  }

  const hitCount = keywordTerms.filter((term) => text.includes(term)).length;
  return hitCount >= Math.min(keywordTerms.length, 2);
}

function hasRequiredAnchor(bucket: EvidenceBucket, text: string) {
  const anchors = REQUIRED_ANCHOR_TERMS_BY_BUCKET[bucket.id];

  if (!anchors?.length) {
    return true;
  }

  return anchors.some((anchor) => phraseOrTokenMatch(text, anchor, true));
}

function scorePaperForBucket(bucket: EvidenceBucket, paper: NormalizedPaper) {
  const text = paperText(paper);

  if (!hasRequiredAnchor(bucket, text)) {
    return 0;
  }

  const strictKeywordMatching = STRICT_KEYWORD_BUCKETS.has(bucket.id);
  const keywordHits = bucket.keywords.filter((keyword) =>
    phraseOrTokenMatch(text, keyword, strictKeywordMatching)
  ).length;
  const queryTerms = Array.from(new Set(tokenize(bucket.query))).slice(0, 18);
  const queryHits = queryTerms.filter((term) => text.includes(term)).length;
  const keywordScore = bucket.keywords.length
    ? keywordHits / bucket.keywords.length
    : 0;
  const queryScore = queryTerms.length ? queryHits / queryTerms.length : 0;

  if (STRICT_KEYWORD_BUCKETS.has(bucket.id) && keywordHits === 0) {
    return 0;
  }

  if (keywordHits === 0 && queryHits < 3) {
    return 0;
  }

  return clamp01(keywordScore * 0.7 + queryScore * 0.3);
}

function evidenceStrengthForPaper(paper: NormalizedPaper): ReviewedPaper["evidenceStrength"] {
  if (paper.fullTextStatus === "parsed") {
    return "full_text_partial";
  }

  if (paper.abstract) {
    return "abstract_supported";
  }

  if (paper.doi || paper.arxivId || paper.semanticScholarId || paper.openAlexId) {
    return "metadata_only";
  }

  return "weak_ai_hypothesis";
}

function fullTextStatusForPaper(paper: NormalizedPaper): ReviewedPaper["fullTextStatus"] {
  if (paper.fullTextStatus) {
    return paper.fullTextStatus;
  }

  if (paper.pdfUrl) {
    return "available";
  }

  return paper.abstract ? "not_checked" : "unavailable";
}

function reviewedPaperFromCandidate(input: {
  paper: NormalizedPaper;
  bucketIds: string[];
  primaryBucket: EvidenceBucket;
  score: number;
}): ReviewedPaper {
  const evidenceStrength = evidenceStrengthForPaper(input.paper);
  const usefulForProject =
    input.score >= DEFAULT_MIN_SCORE &&
    supportedEvidenceStrength.includes(evidenceStrength);

  return {
    paperId: input.paper.id,
    title: input.paper.title,
    year: input.paper.year,
    url: input.paper.sourceUrls[0] ?? input.paper.pdfUrl,
    doi: input.paper.doi,
    bucketIds: input.bucketIds,
    fullTextStatus: fullTextStatusForPaper(input.paper),
    usefulForProject,
    evidenceStrength,
    keyMethods: input.primaryBucket.keywords.slice(0, 4),
    limitations: [
      evidenceStrength === "metadata_only"
        ? "metadata-only paper; needs abstract or full-text review before strong synthesis"
        : "automatically mapped to project bucket; needs human or AI review before final claims"
    ],
    implementationImplications: [
      `Use this paper as evidence for ${input.primaryBucket.id} if its methods survive detailed review.`
    ],
    riskImplications: [
      `Weak or mismatched evidence in ${input.primaryBucket.id} can distort PRD and architecture decisions.`
    ]
  };
}

export function collectProjectEvidenceFromPapers(
  input: CollectProjectEvidenceInput
): EvidenceCollectionResult {
  const maxPapersPerBucket =
    input.maxPapersPerBucket ?? DEFAULT_MAX_PAPERS_PER_BUCKET;
  const minScore = input.minScore ?? DEFAULT_MIN_SCORE;
  const papers = dedupePapers(input.papers);
  const reviewedByPaperId = new Map<
    string,
    { paper: NormalizedPaper; bucketIds: Set<string>; primaryBucket: EvidenceBucket; score: number }
  >();
  const bucketMetrics: EvidenceCollectionBucketMetric[] = [];

  for (const bucket of input.researchPlan.evidenceBuckets) {
    const candidates = papers
      .map((paper) => ({
        paper,
        score: scorePaperForBucket(bucket, paper)
      }))
      .filter((candidate) => candidate.score >= minScore)
      .sort((left, right) => right.score - left.score)
      .slice(0, maxPapersPerBucket);

    for (const candidate of candidates) {
      const existing = reviewedByPaperId.get(candidate.paper.id);
      if (existing) {
        existing.bucketIds.add(bucket.id);
        existing.score = Math.max(existing.score, candidate.score);
        continue;
      }

      reviewedByPaperId.set(candidate.paper.id, {
        paper: candidate.paper,
        bucketIds: new Set([bucket.id]),
        primaryBucket: bucket,
        score: candidate.score
      });
    }

    const usefulReviewedCount = candidates.filter(
      (candidate) =>
        supportedEvidenceStrength.includes(evidenceStrengthForPaper(candidate.paper))
    ).length;
    const parsedCount = candidates.filter(
      (candidate) => fullTextStatusForPaper(candidate.paper) === "parsed"
    ).length;

    bucketMetrics.push({
      bucketId: bucket.id,
      candidateCount: candidates.length,
      reviewedCount: candidates.length,
      usefulReviewedCount,
      parsedCount,
      topPaperIds: candidates.map((candidate) => candidate.paper.id),
      coverageReady:
        usefulReviewedCount >= bucket.minParsedPapers ||
        parsedCount >= bucket.minParsedPapers
    });
  }

  const reviewedPapers = [...reviewedByPaperId.values()].map((candidate) =>
    reviewedPaperFromCandidate({
      paper: candidate.paper,
      bucketIds: [...candidate.bucketIds],
      primaryBucket: candidate.primaryBucket,
      score: candidate.score
    })
  );
  const requiredBuckets = input.researchPlan.evidenceBuckets.filter(
    (bucket) => bucket.required
  );
  const requiredReadyCount = bucketMetrics.filter((metric) => {
    const bucket = requiredBuckets.find((item) => item.id === metric.bucketId);
    return Boolean(bucket && metric.coverageReady);
  }).length;
  const missingRequiredBuckets = bucketMetrics
    .filter((metric) => {
      const bucket = requiredBuckets.find((item) => item.id === metric.bucketId);
      return Boolean(bucket && !metric.coverageReady);
    })
    .map((metric) => metric.bucketId);

  return {
    reviewedPapers,
    bucketMetrics,
    requiredReadyCount,
    requiredBucketCount: requiredBuckets.length,
    missingRequiredBuckets,
    canBuildReadyBrief:
      requiredBuckets.length > 0 &&
      requiredReadyCount === requiredBuckets.length
  };
}

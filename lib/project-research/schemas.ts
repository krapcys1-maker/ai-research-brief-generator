import { z } from "zod";

export const ProjectEvidenceStrengthSchema = z.enum([
  "full_text_strong",
  "full_text_partial",
  "abstract_supported",
  "metadata_only",
  "weak_ai_hypothesis"
]);

export const ProjectReadinessStatusSchema = z.enum([
  "ready",
  "needs_more_research",
  "blocked"
]);

export const ProjectIdeaInputSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(2000),
  constraints: z.array(z.string().trim().min(1)).default([]),
  preferredDomains: z.array(z.string().trim().min(1)).default([]),
  outputLanguage: z.string().trim().min(2).default("pl")
});

export const NormalizedProjectIdeaSchema = z.object({
  ideaId: z.string().trim().min(1),
  title: z.string().trim().min(3),
  oneSentence: z.string().trim().min(10),
  problem: z.string().trim().min(10),
  targetUsers: z.array(z.string().trim().min(1)).min(1),
  domains: z.array(z.string().trim().min(1)).min(1),
  assumptions: z.array(z.string().trim().min(1)).default([]),
  nonGoals: z.array(z.string().trim().min(1)).default([])
});

export const EvidenceBucketSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  query: z.string().trim().min(3),
  keywords: z.array(z.string().trim().min(1)).min(1),
  required: z.boolean(),
  minParsedPapers: z.number().int().min(0).default(1),
  targetQuestions: z.array(z.string().trim().min(1)).default([])
});

export const ResearchPlanSchema = z.object({
  ideaId: z.string().trim().min(1),
  researchGoals: z.array(z.string().trim().min(1)).min(1),
  evidenceBuckets: z.array(EvidenceBucketSchema).min(1),
  queryVariants: z.array(z.string().trim().min(1)).min(1),
  sources: z.array(z.enum(["arxiv", "semantic_scholar", "openalex", "mock"])).min(1)
});

export const EvidenceCoverageBucketSchema = z.object({
  bucketId: z.string().trim().min(1),
  status: z.enum(["covered", "partial", "missing"]),
  selectedCount: z.number().int().nonnegative(),
  parsedCount: z.number().int().nonnegative(),
  reviewedCount: z.number().int().nonnegative(),
  usefulReviewedCount: z.number().int().nonnegative(),
  paperIds: z.array(z.string().trim().min(1)).default([])
});

export const EvidenceCoverageSchema = z.object({
  requiredCoveredCount: z.number().int().nonnegative(),
  requiredBucketCount: z.number().int().nonnegative(),
  canSynthesizeProject: z.boolean(),
  missingRequiredBuckets: z.array(z.string().trim().min(1)).default([]),
  buckets: z.array(EvidenceCoverageBucketSchema).min(1)
});

export const ProjectEvidenceRefSchema = z.object({
  paperId: z.string().trim().min(1),
  bucketId: z.string().trim().min(1).optional(),
  chunkIds: z.array(z.string().trim().min(1)).default([]),
  claim: z.string().trim().min(1),
  supportLevel: z.enum(["direct", "indirect", "weak"]),
  evidenceStrength: ProjectEvidenceStrengthSchema
});

export const ReviewedPaperSchema = z.object({
  paperId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  year: z.number().int().nullable(),
  url: z.string().nullable(),
  doi: z.string().nullable(),
  bucketIds: z.array(z.string().trim().min(1)).min(1),
  fullTextStatus: z.enum([
    "not_checked",
    "unavailable",
    "available",
    "fetched",
    "parsed",
    "failed"
  ]),
  usefulForProject: z.boolean(),
  evidenceStrength: ProjectEvidenceStrengthSchema,
  keyMethods: z.array(z.string().trim().min(1)).default([]),
  limitations: z.array(z.string().trim().min(1)).default([]),
  implementationImplications: z.array(z.string().trim().min(1)).default([]),
  riskImplications: z.array(z.string().trim().min(1)).default([])
});

export const ProjectResearchInsightSchema = z
  .object({
    id: z.string().trim().min(1),
    claim: z.string().trim().min(1),
    explanation: z.string().trim().min(1),
    insightType: z.enum([
      "method",
      "architecture",
      "risk",
      "validation",
      "product",
      "implementation",
      "gap"
    ]),
    confidence: z.enum(["low", "medium", "high"]),
    evidenceStrength: ProjectEvidenceStrengthSchema,
    sourcePaperIds: z.array(z.string().trim().min(1)).default([]),
    evidence: z.array(ProjectEvidenceRefSchema).default([]),
    usableForPrd: z.boolean().default(true),
    usableForArchitecture: z.boolean().default(true)
  })
  .superRefine((value, ctx) => {
    if (
      value.evidenceStrength !== "weak_ai_hypothesis" &&
      value.sourcePaperIds.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Evidence-backed insights must include sourcePaperIds. Use weak_ai_hypothesis for unsupported AI hypotheses.",
        path: ["sourcePaperIds"]
      });
    }
  });

export const RecommendedTechnicalDirectionSchema = z.object({
  summary: z.string().trim().min(1),
  why: z.string().trim().min(1),
  approach: z.array(z.string().trim().min(1)).min(1),
  avoid: z.array(z.string().trim().min(1)).default([]),
  sourcePaperIds: z.array(z.string().trim().min(1)).default([]),
  evidenceStrength: ProjectEvidenceStrengthSchema
});

export const ProjectResearchRiskSchema = z.object({
  id: z.string().trim().min(1),
  risk: z.string().trim().min(1),
  severity: z.enum(["low", "medium", "high"]),
  mitigation: z.string().trim().min(1),
  sourcePaperIds: z.array(z.string().trim().min(1)).default([]),
  evidenceStrength: ProjectEvidenceStrengthSchema
});

export const ProjectResearchGapSchema = z.object({
  id: z.string().trim().min(1),
  gap: z.string().trim().min(1),
  whyItMatters: z.string().trim().min(1),
  suggestedNextResearch: z.array(z.string().trim().min(1)).default([]),
  sourcePaperIds: z.array(z.string().trim().min(1)).default([]),
  evidenceStrength: ProjectEvidenceStrengthSchema
});

export const ProjectResearchAuditSchema = z.object({
  score: z.number().min(0).max(100),
  strengths: z.array(z.string().trim().min(1)).default([]),
  weaknesses: z.array(z.string().trim().min(1)).default([]),
  mustFixBeforePrd: z.array(z.string().trim().min(1)).default([]),
  mustFixBeforeArchitecture: z.array(z.string().trim().min(1)).default([]),
  verdict: z.string().trim().min(1)
});

export const ProjectResearchBriefSchema = z
  .object({
    id: z.string().trim().min(1),
    generatedAt: z.string().trim().min(1),
    outputLanguage: z.string().trim().min(2),
    idea: ProjectIdeaInputSchema,
    normalizedIdea: NormalizedProjectIdeaSchema,
    researchPlan: ResearchPlanSchema,
    evidenceCoverage: EvidenceCoverageSchema,
    researchSummary: z.string().trim().min(1),
    reviewedPapers: z.array(ReviewedPaperSchema).min(1),
    projectInsights: z.array(ProjectResearchInsightSchema).min(1),
    recommendedTechnicalDirection: RecommendedTechnicalDirectionSchema,
    risks: z.array(ProjectResearchRiskSchema).default([]),
    gaps: z.array(ProjectResearchGapSchema).default([]),
    readyForPrd: z.boolean(),
    readyForArchitecture: z.boolean(),
    readiness: z.object({
      prd: ProjectReadinessStatusSchema,
      architecture: ProjectReadinessStatusSchema,
      reason: z.string().trim().min(1)
    }),
    audit: ProjectResearchAuditSchema
  })
  .superRefine((value, ctx) => {
    const reviewedPaperIds = new Set(
      value.reviewedPapers.map((paper) => paper.paperId)
    );
    const bucketIds = new Set(
      value.researchPlan.evidenceBuckets.map((bucket) => bucket.id)
    );

    function assertKnownPaperIds(
      ids: string[],
      path: (string | number)[],
      section: string
    ) {
      for (const id of ids) {
        if (!reviewedPaperIds.has(id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${section} cites unknown paperId: ${id}`,
            path
          });
        }
      }
    }

    function assertKnownBucketIds(
      ids: string[],
      path: (string | number)[],
      section: string
    ) {
      for (const id of ids) {
        if (!bucketIds.has(id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${section} references unknown bucketId: ${id}`,
            path
          });
        }
      }
    }

    value.reviewedPapers.forEach((paper, index) => {
      assertKnownBucketIds(
        paper.bucketIds,
        ["reviewedPapers", index, "bucketIds"],
        "reviewedPaper"
      );
    });

    value.projectInsights.forEach((insight, index) => {
      assertKnownPaperIds(
        insight.sourcePaperIds,
        ["projectInsights", index, "sourcePaperIds"],
        "projectInsight"
      );
      insight.evidence.forEach((evidence, evidenceIndex) => {
        assertKnownPaperIds(
          [evidence.paperId],
          ["projectInsights", index, "evidence", evidenceIndex, "paperId"],
          "projectInsight.evidence"
        );
        if (evidence.bucketId) {
          assertKnownBucketIds(
            [evidence.bucketId],
            ["projectInsights", index, "evidence", evidenceIndex, "bucketId"],
            "projectInsight.evidence"
          );
        }
      });
    });

    assertKnownPaperIds(
      value.recommendedTechnicalDirection.sourcePaperIds,
      ["recommendedTechnicalDirection", "sourcePaperIds"],
      "recommendedTechnicalDirection"
    );

    value.risks.forEach((risk, index) => {
      assertKnownPaperIds(
        risk.sourcePaperIds,
        ["risks", index, "sourcePaperIds"],
        "risk"
      );
    });

    value.gaps.forEach((gap, index) => {
      assertKnownPaperIds(
        gap.sourcePaperIds,
        ["gaps", index, "sourcePaperIds"],
        "gap"
      );
    });

    if (value.readyForPrd && value.readiness.prd !== "ready") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "readyForPrd=true requires readiness.prd=ready",
        path: ["readiness", "prd"]
      });
    }

    if (value.readyForArchitecture && value.readiness.architecture !== "ready") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "readyForArchitecture=true requires readiness.architecture=ready",
        path: ["readiness", "architecture"]
      });
    }
  });

export function validateProjectResearchBrief(value: unknown) {
  return ProjectResearchBriefSchema.parse(value);
}

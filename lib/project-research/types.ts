import type { z } from "zod";
import type {
  EvidenceBucketSchema,
  EvidenceCoverageSchema,
  HandoffFlagResolutionSchema,
  HandoffFlagResolutionStatusSchema,
  NormalizedProjectIdeaSchema,
  ProjectEvidenceRefSchema,
  ProjectEvidenceStrengthSchema,
  ProjectIdeaHandoffContextSchema,
  ProjectIdeaInputSchema,
  ProjectReadinessStatusSchema,
  ProjectResearchAuditSchema,
  ProjectResearchBriefSchema,
  ProjectResearchGapSchema,
  ProjectResearchInsightSchema,
  ProjectResearchRiskSchema,
  RecommendedTechnicalDirectionSchema,
  ResearchPlanSchema,
  ReviewedPaperSchema
} from "@/lib/project-research/schemas";

export type ProjectEvidenceStrength = z.infer<
  typeof ProjectEvidenceStrengthSchema
>;

export type ProjectReadinessStatus = z.infer<
  typeof ProjectReadinessStatusSchema
>;

export type ProjectIdeaInput = z.infer<typeof ProjectIdeaInputSchema>;

export type ProjectIdeaHandoffContext = z.infer<
  typeof ProjectIdeaHandoffContextSchema
>;

export type HandoffFlagResolutionStatus = z.infer<
  typeof HandoffFlagResolutionStatusSchema
>;

export type HandoffFlagResolution = z.infer<
  typeof HandoffFlagResolutionSchema
>;

export type NormalizedProjectIdea = z.infer<
  typeof NormalizedProjectIdeaSchema
>;

export type EvidenceBucket = z.infer<typeof EvidenceBucketSchema>;

export type ResearchPlan = z.infer<typeof ResearchPlanSchema>;

export type EvidenceCoverage = z.infer<typeof EvidenceCoverageSchema>;

export type ProjectEvidenceRef = z.infer<typeof ProjectEvidenceRefSchema>;

export type ReviewedPaper = z.infer<typeof ReviewedPaperSchema>;

export type ProjectResearchInsight = z.infer<
  typeof ProjectResearchInsightSchema
>;

export type RecommendedTechnicalDirection = z.infer<
  typeof RecommendedTechnicalDirectionSchema
>;

export type ProjectResearchRisk = z.infer<typeof ProjectResearchRiskSchema>;

export type ProjectResearchGap = z.infer<typeof ProjectResearchGapSchema>;

export type ProjectResearchAudit = z.infer<typeof ProjectResearchAuditSchema>;

export type ProjectResearchBrief = z.infer<typeof ProjectResearchBriefSchema>;

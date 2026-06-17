import { z } from "zod";

export const ProjectPrdStatusSchema = z.enum(["ready", "blocked"]);

export const ProjectPrdRequirementSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  priority: z.enum(["must", "should", "could"]),
  requirementType: z.enum(["functional", "non_functional", "validation", "risk_control"]),
  acceptanceCriteria: z.array(z.string().trim().min(1)).min(1),
  sourceInsightIds: z.array(z.string().trim().min(1)).default([]),
  sourcePaperIds: z.array(z.string().trim().min(1)).default([]),
  evidenceStrength: z.enum([
    "full_text_strong",
    "full_text_partial",
    "abstract_supported",
    "metadata_only",
    "weak_ai_hypothesis"
  ])
});

export const ProjectPrdRiskSchema = z.object({
  id: z.string().trim().min(1),
  risk: z.string().trim().min(1),
  mitigation: z.string().trim().min(1),
  severity: z.enum(["low", "medium", "high"]),
  sourcePaperIds: z.array(z.string().trim().min(1)).default([])
});

export const ProjectPrdSchema = z
  .object({
    id: z.string().trim().min(1),
    generatedAt: z.string().trim().min(1),
    sourceBriefId: z.string().trim().min(1),
    status: ProjectPrdStatusSchema,
    productName: z.string().trim().min(1),
    problem: z.string().trim().min(1),
    targetUsers: z.array(z.string().trim().min(1)).min(1),
    goals: z.array(z.string().trim().min(1)).default([]),
    nonGoals: z.array(z.string().trim().min(1)).default([]),
    evidenceSummary: z.string().trim().min(1),
    requirements: z.array(ProjectPrdRequirementSchema).default([]),
    risks: z.array(ProjectPrdRiskSchema).default([]),
    openQuestions: z.array(z.string().trim().min(1)).default([]),
    blockers: z.array(z.string().trim().min(1)).default([]),
    traceability: z.object({
      requirementCount: z.number().int().nonnegative(),
      requirementsWithPaperSources: z.number().int().nonnegative(),
      sourcePaperIds: z.array(z.string().trim().min(1)).default([]),
      sourceInsightIds: z.array(z.string().trim().min(1)).default([])
    }),
    audit: z.object({
      score: z.number().min(0).max(100),
      verdict: z.string().trim().min(1),
      strengths: z.array(z.string().trim().min(1)).default([]),
      weaknesses: z.array(z.string().trim().min(1)).default([])
    })
  })
  .superRefine((value, ctx) => {
    if (value.status === "ready" && value.requirements.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ready PRD requires at least one requirement.",
        path: ["requirements"]
      });
    }

    if (value.status === "ready" && value.blockers.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ready PRD cannot contain blockers.",
        path: ["blockers"]
      });
    }

    value.requirements.forEach((requirement, index) => {
      if (
        value.status === "ready" &&
        requirement.evidenceStrength !== "weak_ai_hypothesis" &&
        requirement.sourcePaperIds.length === 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Requirement ${requirement.id} needs sourcePaperIds.`,
          path: ["requirements", index, "sourcePaperIds"]
        });
      }
    });

    if (
      value.traceability.requirementCount !== value.requirements.length ||
      value.traceability.requirementsWithPaperSources !==
        value.requirements.filter((requirement) => requirement.sourcePaperIds.length > 0)
          .length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Traceability counts must match requirements.",
        path: ["traceability"]
      });
    }
  });

export function validateProjectPrd(value: unknown) {
  return ProjectPrdSchema.parse(value);
}

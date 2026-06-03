import { z } from "zod";

export const ProjectArchitectureStatusSchema = z.enum(["ready", "blocked"]);

export const ProjectArchitectureComponentSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  responsibility: z.string().trim().min(1),
  componentType: z.enum(["frontend", "backend", "data", "ai", "integration", "ops"]),
  inputs: z.array(z.string().trim().min(1)).default([]),
  outputs: z.array(z.string().trim().min(1)).default([]),
  sourceRequirementIds: z.array(z.string().trim().min(1)).default([]),
  sourcePaperIds: z.array(z.string().trim().min(1)).default([])
});

export const ProjectArchitectureDecisionSchema = z.object({
  id: z.string().trim().min(1),
  decision: z.string().trim().min(1),
  rationale: z.string().trim().min(1),
  tradeoffs: z.array(z.string().trim().min(1)).default([]),
  sourceRequirementIds: z.array(z.string().trim().min(1)).default([]),
  sourcePaperIds: z.array(z.string().trim().min(1)).default([])
});

export const ProjectArchitectureRiskSchema = z.object({
  id: z.string().trim().min(1),
  risk: z.string().trim().min(1),
  mitigation: z.string().trim().min(1),
  sourceRequirementIds: z.array(z.string().trim().min(1)).default([]),
  sourcePaperIds: z.array(z.string().trim().min(1)).default([])
});

export const ProjectArchitectureJudgeVerdictSchema = z.enum([
  "pass",
  "needs_review",
  "fail"
]);

export const ProjectArchitectureJudgeSchema = z.object({
  architectureId: z.string().trim().min(1),
  sourcePrdId: z.string().trim().min(1),
  sourceBriefId: z.string().trim().min(1),
  score: z.number().min(0).max(100),
  verdict: ProjectArchitectureJudgeVerdictSchema,
  requirementCoverage: z.number().min(0).max(1),
  componentTraceabilityCoverage: z.number().min(0).max(1),
  decisionPaperCoverage: z.number().min(0).max(1),
  componentTypeDiversity: z.number().int().nonnegative(),
  genericComponentCount: z.number().int().nonnegative(),
  paperEvidenceCoverage: z.number().min(0).max(1),
  riskCoverage: z.number().min(0).max(1),
  specificTermCoverage: z.number().min(0).max(1),
  strengths: z.array(z.string().trim().min(1)).default([]),
  weaknesses: z.array(z.string().trim().min(1)).default([]),
  requiredFixes: z.array(z.string().trim().min(1)).default([])
});

export const ProjectArchitectureSchema = z
  .object({
    id: z.string().trim().min(1),
    generatedAt: z.string().trim().min(1),
    sourcePrdId: z.string().trim().min(1),
    sourceBriefId: z.string().trim().min(1),
    status: ProjectArchitectureStatusSchema,
    systemName: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    components: z.array(ProjectArchitectureComponentSchema).default([]),
    decisions: z.array(ProjectArchitectureDecisionSchema).default([]),
    risks: z.array(ProjectArchitectureRiskSchema).default([]),
    testStrategy: z.array(z.string().trim().min(1)).default([]),
    blockers: z.array(z.string().trim().min(1)).default([]),
    traceability: z.object({
      componentCount: z.number().int().nonnegative(),
      componentsWithRequirements: z.number().int().nonnegative(),
      decisionCount: z.number().int().nonnegative(),
      decisionsWithPaperSources: z.number().int().nonnegative(),
      sourceRequirementIds: z.array(z.string().trim().min(1)).default([]),
      sourcePaperIds: z.array(z.string().trim().min(1)).default([])
    }),
    audit: z.object({
      score: z.number().min(0).max(100),
      verdict: z.string().trim().min(1),
      strengths: z.array(z.string().trim().min(1)).default([]),
      weaknesses: z.array(z.string().trim().min(1)).default([])
    })
  })
  .superRefine((value, ctx) => {
    if (value.status === "ready" && value.components.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ready architecture requires components.",
        path: ["components"]
      });
    }

    if (value.status === "ready" && value.blockers.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ready architecture cannot contain blockers.",
        path: ["blockers"]
      });
    }

    if (
      value.traceability.componentCount !== value.components.length ||
      value.traceability.componentsWithRequirements !==
        value.components.filter((component) => component.sourceRequirementIds.length > 0)
          .length ||
      value.traceability.decisionCount !== value.decisions.length ||
      value.traceability.decisionsWithPaperSources !==
        value.decisions.filter((decision) => decision.sourcePaperIds.length > 0).length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Traceability counts must match architecture artifacts.",
        path: ["traceability"]
      });
    }
  });

export function validateProjectArchitecture(value: unknown) {
  return ProjectArchitectureSchema.parse(value);
}

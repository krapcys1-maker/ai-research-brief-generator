import type { z } from "zod";
import type {
  ProjectArchitectureComponentSchema,
  ProjectArchitectureDecisionSchema,
  ProjectArchitectureJudgeSchema,
  ProjectArchitectureJudgeVerdictSchema,
  ProjectArchitectureRiskSchema,
  ProjectArchitectureSchema,
  ProjectArchitectureStatusSchema
} from "@/lib/project-architecture/schemas";

export type ProjectArchitectureStatus = z.infer<
  typeof ProjectArchitectureStatusSchema
>;
export type ProjectArchitectureComponent = z.infer<
  typeof ProjectArchitectureComponentSchema
>;
export type ProjectArchitectureDecision = z.infer<
  typeof ProjectArchitectureDecisionSchema
>;
export type ProjectArchitectureRisk = z.infer<typeof ProjectArchitectureRiskSchema>;
export type ProjectArchitectureJudgeVerdict = z.infer<
  typeof ProjectArchitectureJudgeVerdictSchema
>;
export type ProjectArchitectureJudge = z.infer<
  typeof ProjectArchitectureJudgeSchema
>;
export type ProjectArchitecture = z.infer<typeof ProjectArchitectureSchema>;

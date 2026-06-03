import type { z } from "zod";
import type {
  ProjectPrdRequirementSchema,
  ProjectPrdRiskSchema,
  ProjectPrdSchema,
  ProjectPrdStatusSchema
} from "@/lib/project-prd/schemas";

export type ProjectPrdStatus = z.infer<typeof ProjectPrdStatusSchema>;
export type ProjectPrdRequirement = z.infer<typeof ProjectPrdRequirementSchema>;
export type ProjectPrdRisk = z.infer<typeof ProjectPrdRiskSchema>;
export type ProjectPrd = z.infer<typeof ProjectPrdSchema>;

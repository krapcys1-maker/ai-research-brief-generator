import { z } from "zod";

export const CreateResearchProjectRequestSchema = z.object({
  title: z.string().trim().min(3).max(140),
  query: z.string().trim().min(3).max(500),
  description: z.string().trim().max(1000).optional().nullable(),
  sources: z
    .array(z.enum(["mock", "arxiv", "semantic_scholar", "openalex"]))
    .max(4)
    .default([])
});

export type CreateResearchProjectRequest = z.infer<
  typeof CreateResearchProjectRequestSchema
>;

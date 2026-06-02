import { z } from "zod";

export const CreateBriefCollectionRequestSchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().max(1000).optional().nullable(),
  briefIds: z.array(z.string().min(1)).min(1).max(50)
});

export type CreateBriefCollectionRequest = z.infer<
  typeof CreateBriefCollectionRequestSchema
>;

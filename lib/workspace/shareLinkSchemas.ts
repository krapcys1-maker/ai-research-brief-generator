import { z } from "zod";

export const ShareLinkVisibilitySchema = z.enum([
  "private",
  "workspace",
  "public"
]);

export const CreateShareLinkRequestSchema = z.object({
  resourceType: z.literal("brief"),
  resourceId: z.string().trim().min(1),
  visibility: ShareLinkVisibilitySchema
});

export type CreateShareLinkRequest = z.infer<
  typeof CreateShareLinkRequestSchema
>;

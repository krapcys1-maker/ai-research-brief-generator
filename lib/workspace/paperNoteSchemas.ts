import { z } from "zod";

export const CreatePaperNoteRequestSchema = z.object({
  paperId: z.string().trim().min(1),
  note: z.string().trim().min(3).max(2000)
});

export type CreatePaperNoteRequest = z.infer<
  typeof CreatePaperNoteRequestSchema
>;

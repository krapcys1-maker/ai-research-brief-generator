import { z } from "zod";

export const DocumentStatusSchema = z.enum([
  "uploaded",
  "extracting",
  "parsed",
  "failed",
  "deleted"
]);

export const DocumentPrivacyScopeSchema = z.enum(["session", "user"]);

export const DocumentSourceSchema = z.object({
  ownerId: z.string().nullable().default(null),
  workspaceId: z.string().nullable().default(null),
  sessionId: z.string().nullable().default(null)
});

export const UserDocumentSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().nullable(),
  workspaceId: z.string().nullable().default(null),
  sessionId: z.string().nullable(),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  status: DocumentStatusSchema,
  textHash: z.string().nullable(),
  createdAt: z.string().min(1),
  deletedAt: z.string().nullable(),
  privacyScope: DocumentPrivacyScopeSchema,
  errorMessage: z.string().nullable().default(null)
});

export const UserDocumentChunkSchema = z.object({
  id: z.string().min(1),
  documentId: z.string().min(1),
  ownerId: z.string().nullable(),
  workspaceId: z.string().nullable().default(null),
  sessionId: z.string().nullable(),
  sectionTitle: z.string().nullable(),
  chunkIndex: z.number().int().nonnegative(),
  text: z.string().min(1),
  tokenEstimate: z.number().int().positive(),
  pageStart: z.number().int().positive().nullable(),
  pageEnd: z.number().int().positive().nullable(),
  embedding: z.array(z.number()).nullable().default(null),
  embeddingModel: z.string().nullable().default(null),
  evidenceLevel: z.literal("uploaded_document_supported")
});

export const UploadedDocumentEvidenceSnippetSchema = z.object({
  id: z.string().min(1),
  sourceType: z.literal("user_document"),
  sourceId: z.string().min(1),
  documentId: z.string().min(1),
  chunkId: z.string().min(1),
  text: z.string().min(1),
  sectionTitle: z.string().nullable(),
  evidenceLevel: z.literal("uploaded_document_supported"),
  supportRelation: z.enum([
    "supports",
    "partially_supports",
    "contradicts",
    "contextual",
    "weak"
  ])
});

export const AskDocumentsRequestSchema = z.object({
  question: z.string().trim().min(3).max(500),
  documentIds: z.array(z.string().min(1)).optional(),
  topK: z.coerce.number().int().min(1).max(12).default(6)
});

export const AskDocumentsAnswerSchema = z
  .object({
    question: z.string().min(1),
    answer: z.string().min(1),
    confidence: z.enum(["low", "medium", "high"]),
    notAnswerableFromDocuments: z.boolean(),
    evidenceSnippets: z.array(UploadedDocumentEvidenceSnippetSchema).default([]),
    citedDocumentIds: z.array(z.string().min(1)).default([]),
    limitations: z.array(z.string()).default([]),
    followUpQuestions: z.array(z.string()).default([])
  })
  .superRefine((value, ctx) => {
    if (!value.notAnswerableFromDocuments && value.evidenceSnippets.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Answerable document answers must include evidence snippets.",
        path: ["evidenceSnippets"]
      });
    }

    if (value.notAnswerableFromDocuments && value.evidenceSnippets.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Unsupported document answers must not include evidence snippets.",
        path: ["evidenceSnippets"]
      });
    }
  });

export type UserDocument = z.infer<typeof UserDocumentSchema>;
export type UserDocumentChunk = z.infer<typeof UserDocumentChunkSchema>;
export type DocumentSource = z.infer<typeof DocumentSourceSchema>;
export type AskDocumentsRequest = z.infer<typeof AskDocumentsRequestSchema>;
export type AskDocumentsAnswer = z.infer<typeof AskDocumentsAnswerSchema>;
export type UploadedDocumentEvidenceSnippet = z.infer<
  typeof UploadedDocumentEvidenceSnippetSchema
>;

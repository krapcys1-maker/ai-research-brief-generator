import { z } from "zod";
import { ResearchSourceSchema } from "@/lib/ai/schemas";

export const ClaimClassificationSchema = z.enum([
  "supported",
  "partially_supported",
  "contradicted",
  "insufficient_evidence",
  "too_broad",
  "not_scientific_claim",
  "already_known_or_done",
  "possible_dead_end"
]);

export const ClaimEvidenceBoundarySchema = z.enum([
  "metadata_only",
  "abstract_supported",
  "full_text_supported",
  "uploaded_document_supported",
  "mixed_evidence",
  "insufficient_evidence"
]);

export const ClaimSupportRelationSchema = z.enum([
  "supports",
  "partially_supports",
  "contradicts",
  "contextual",
  "weak"
]);

export const ClaimEvidenceSnippetSchema = z.object({
  id: z.string().min(1),
  sourceType: z.enum([
    "paper_metadata",
    "paper_abstract",
    "paper_full_text",
    "user_document"
  ]),
  sourceId: z.string().min(1),
  paperId: z.string().optional(),
  documentId: z.string().optional(),
  chunkId: z.string().optional(),
  text: z.string().min(1),
  sectionTitle: z.string().nullable().optional(),
  evidenceLevel: ClaimEvidenceBoundarySchema,
  supportRelation: ClaimSupportRelationSchema
});

export const RelatedPaperSchema = z.object({
  paperId: z.string().min(1),
  title: z.string().min(1),
  authors: z.array(z.string()),
  year: z.number().int().nullable(),
  url: z.string().nullable(),
  doi: z.string().nullable(),
  evidenceBoundary: ClaimEvidenceBoundarySchema
});

export const SimilarWorkItemSchema = z.object({
  paperId: z.string().min(1),
  title: z.string().min(1),
  authors: z.array(z.string()),
  year: z.number().int().nullable(),
  reasonRelevant: z.string().min(1),
  similarityType: z.enum([
    "same_problem",
    "similar_method",
    "same_domain",
    "prior_system",
    "contradictory_approach"
  ]),
  noveltyImplication: z.enum([
    "already_done",
    "incremental",
    "unclear",
    "potentially_novel"
  ])
});

export const ClaimCheckItemSchema = z
  .object({
    claimText: z.string().min(1),
    classification: ClaimClassificationSchema,
    confidence: z.enum(["low", "medium", "high"]),
    explanation: z.string().min(1),
    whatMatchesScience: z.array(z.string()).default([]),
    whatDoesNotMatchScience: z.array(z.string()).default([]),
    caveats: z.array(z.string()).default([]),
    suggestedRevision: z.string().nullable(),
    evidenceSnippets: z.array(ClaimEvidenceSnippetSchema).default([]),
    relatedPapers: z.array(RelatedPaperSchema).default([]),
    evidenceBoundary: ClaimEvidenceBoundarySchema
  })
  .superRefine((value, ctx) => {
    if (
      value.classification !== "insufficient_evidence" &&
      value.classification !== "not_scientific_claim" &&
      value.classification !== "too_broad" &&
      value.evidenceSnippets.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Evidence-backed classifications must include evidence snippets.",
        path: ["evidenceSnippets"]
      });
    }

    if (
      value.classification === "already_known_or_done" &&
      value.relatedPapers.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "already_known_or_done requires related paper evidence.",
        path: ["relatedPapers"]
      });
    }

    if (
      value.classification === "possible_dead_end" &&
      value.caveats.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "possible_dead_end requires caveats.",
        path: ["caveats"]
      });
    }
  });

export const ClaimCheckReportSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sourceDocumentId: z.string().optional(),
  createdAt: z.string().min(1),
  summary: z.string().min(1),
  items: z.array(ClaimCheckItemSchema).min(1),
  similarWork: z.array(SimilarWorkItemSchema).default([]),
  overallCaveats: z.array(z.string()).default([]),
  recommendedNextSteps: z.array(z.string()).default([])
});

export const ExtractedClaimSchema = z.object({
  id: z.string().min(1),
  claimText: z.string().min(1),
  checkable: z.boolean(),
  suggestedSearchQuery: z.string().min(1),
  reason: z.string().min(1)
});

export const ClaimExtractionResultSchema = z.object({
  sourceDocumentId: z.string().optional(),
  sourceTextPreview: z.string().optional(),
  claims: z.array(ExtractedClaimSchema).default([])
});

export const ClaimCheckRequestSchema = z.object({
  claims: z.array(z.string().trim().min(3)).min(1).max(15),
  sourceDocumentId: z.string().optional(),
  queryContext: z.string().trim().max(300).optional(),
  sources: z.array(ResearchSourceSchema).default([
    "arxiv",
    "semantic_scholar",
    "openalex"
  ]),
  maxPapers: z.coerce.number().int().min(3).max(12).default(8)
});

export type ClaimClassification = z.infer<typeof ClaimClassificationSchema>;
export type ClaimEvidenceBoundary = z.infer<typeof ClaimEvidenceBoundarySchema>;
export type ClaimEvidenceSnippet = z.infer<typeof ClaimEvidenceSnippetSchema>;
export type ClaimCheckItem = z.infer<typeof ClaimCheckItemSchema>;
export type ClaimCheckReport = z.infer<typeof ClaimCheckReportSchema>;
export type ExtractedClaim = z.infer<typeof ExtractedClaimSchema>;
export type ClaimExtractionResult = z.infer<typeof ClaimExtractionResultSchema>;
export type ClaimCheckRequest = z.infer<typeof ClaimCheckRequestSchema>;
export type RelatedPaper = z.infer<typeof RelatedPaperSchema>;
export type SimilarWorkItem = z.infer<typeof SimilarWorkItemSchema>;

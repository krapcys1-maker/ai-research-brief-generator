import { z } from "zod";

export const ResearchSourceSchema = z.enum([
  "mock",
  "arxiv",
  "semantic_scholar",
  "openalex"
]);

export const SourceSearchDiagnosticSchema = z.object({
  source: ResearchSourceSchema,
  query: z.string().min(1),
  status: z.enum(["success", "empty", "failed"]),
  resultCount: z.number().int().nonnegative(),
  cached: z.boolean(),
  message: z.string().optional()
});

export const BriefRequestSchema = z
  .object({
    query: z.string().trim().min(3).max(300),
    maxPapers: z.coerce.number().int().min(5).max(50).default(10),
    fromYear: z.coerce.number().int().min(1900).max(2100).optional(),
    toYear: z.coerce.number().int().min(1900).max(2100).optional(),
    sources: z.array(ResearchSourceSchema).min(1).default(["mock"])
  })
  .refine(
    (value) =>
      !value.fromYear || !value.toYear || value.fromYear <= value.toYear,
    {
      message: "fromYear must be less than or equal to toYear",
      path: ["fromYear"]
    }
  );

export type BriefRequest = z.infer<typeof BriefRequestSchema>;

export const NormalizedPaperSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  abstract: z.string().nullable(),
  authors: z.array(z.string()),
  year: z.number().int().nullable(),
  publishedAt: z.string().nullable(),
  doi: z.string().nullable(),
  arxivId: z.string().nullable(),
  semanticScholarId: z.string().nullable(),
  openAlexId: z.string().nullable(),
  sourceUrls: z.array(z.string()),
  pdfUrl: z.string().nullable(),
  venue: z.string().nullable(),
  citationCount: z.number().int().nullable(),
  influentialCitationCount: z.number().int().nullable(),
  source: z.union([ResearchSourceSchema, z.literal("merged")]),
  relevanceScore: z.number().optional(),
  citationScore: z.number().optional(),
  recencyScore: z.number().optional(),
  completenessScore: z.number().optional(),
  sourceQualityScore: z.number().optional(),
  identifierScore: z.number().optional(),
  qualityScore: z.number().optional(),
  finalScore: z.number().optional()
});

export type NormalizedPaper = z.infer<typeof NormalizedPaperSchema>;

export const EvidenceLinkSchema = z.object({
  paperId: z.string().min(1),
  evidenceText: z.string().min(1),
  supportLevel: z.enum(["direct", "indirect", "weak"])
});

export type EvidenceLink = z.infer<typeof EvidenceLinkSchema>;

export const BriefQuestionRequestSchema = z.object({
  question: z.string().trim().min(3).max(500)
});

export type BriefQuestionRequest = z.infer<typeof BriefQuestionRequestSchema>;

export const BriefAnswerClaimSchema = z.object({
  claim: z.string().min(1),
  explanation: z.string().min(1),
  sourcePaperIds: z.array(z.string().min(1)).min(1),
  evidence: z.array(EvidenceLinkSchema).min(1)
});

export type BriefAnswerClaim = z.infer<typeof BriefAnswerClaimSchema>;

export const BriefAnswerSchema = z
  .object({
    question: z.string().min(1),
    outputLanguage: z.string().min(2),
    answer: z.string().min(1),
    confidence: z.enum(["low", "medium", "high"]),
    notAnswerableFromSources: z.boolean(),
    claims: z.array(BriefAnswerClaimSchema).default([]),
    suggestedFollowUpQuestions: z.array(z.string().min(1)).default([])
  })
  .superRefine((value, ctx) => {
    if (!value.notAnswerableFromSources && value.claims.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Answerable responses must include at least one sourced claim.",
        path: ["claims"]
      });
    }
  });

export type BriefAnswer = z.infer<typeof BriefAnswerSchema>;

export const KeyFindingSchema = z.object({
  finding: z.string().min(1),
  explanation: z.string().min(1),
  confidence: z.enum(["low", "medium", "high"]),
  sourcePaperIds: z.array(z.string().min(1)).min(1),
  evidence: z.array(EvidenceLinkSchema).default([]),
  caveats: z.array(z.string()).default([])
});

export type KeyFinding = z.infer<typeof KeyFindingSchema>;

export const MajorThemeSchema = z.object({
  theme: z.string().min(1),
  description: z.string().min(1),
  sourcePaperIds: z.array(z.string().min(1)).min(1),
  evidence: z.array(EvidenceLinkSchema).default([])
});

export type MajorTheme = z.infer<typeof MajorThemeSchema>;

export const ResearchGapSchema = z.object({
  gap: z.string().min(1),
  whyItMatters: z.string().min(1),
  sourcePaperIds: z.array(z.string().min(1)).min(1),
  evidence: z.array(EvidenceLinkSchema).default([])
});

export type ResearchGap = z.infer<typeof ResearchGapSchema>;

export const ControversyOrUncertaintySchema = z.object({
  issue: z.string().min(1),
  explanation: z.string().min(1),
  sourcePaperIds: z.array(z.string().min(1)).min(1),
  evidence: z.array(EvidenceLinkSchema).default([])
});

export type ControversyOrUncertainty = z.infer<
  typeof ControversyOrUncertaintySchema
>;

export const BibliographyItemSchema = z.object({
  paperId: z.string().min(1),
  title: z.string().min(1),
  authors: z.array(z.string()),
  year: z.number().int().nullable(),
  url: z.string().nullable(),
  doi: z.string().nullable()
});

export type BibliographyItem = z.infer<typeof BibliographyItemSchema>;

export const ResearchBriefSchema = z.object({
  id: z.string().min(1),
  query: z.string().min(1),
  outputLanguage: z.string().min(2),
  generatedAt: z.string().min(1),
  title: z.string().min(1),
  tldr: z.string().min(1),
  executiveSummary: z.object({
    paragraph: z.string().min(1),
    sourcePaperIds: z.array(z.string().min(1)).min(1),
    evidence: z.array(EvidenceLinkSchema).default([])
  }),
  keyFindings: z.array(KeyFindingSchema).min(1),
  majorThemes: z.array(MajorThemeSchema).min(1),
  influentialPapers: z
    .array(
      z.object({
        paperId: z.string().min(1),
        reason: z.string().min(1)
      })
    )
    .default([]),
  researchGaps: z.array(ResearchGapSchema).min(1),
  controversiesOrUncertainties: z
    .array(ControversyOrUncertaintySchema)
    .min(1),
  suggestedNextQuestions: z.array(z.string().min(1)).min(1),
  searchSummary: z.object({
    requestedSources: z.array(ResearchSourceSchema),
    sourcesUsed: z.array(z.string()),
    totalFound: z.number().int().nonnegative(),
    totalAfterDeduplication: z.number().int().nonnegative(),
    totalUsedInBrief: z.number().int().nonnegative(),
    queryVariants: z.array(z.string()),
    sourceDiagnostics: z.array(SourceSearchDiagnosticSchema).default([]),
    warnings: z.array(z.string()).default([])
  }),
  bibliography: z.array(BibliographyItemSchema).min(1)
});

export type ResearchBrief = z.infer<typeof ResearchBriefSchema>;

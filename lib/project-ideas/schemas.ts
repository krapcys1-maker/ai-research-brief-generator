import { ProjectIdeaInputSchema } from "@/lib/project-research/schemas";
import { z } from "zod";

export const RepoIssueSignalSchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().trim().min(1).default(""),
  labels: z.array(z.string().trim().min(1)).default([])
});

export const IdeaSourceRepoSchema = z.object({
  repoId: z.string().trim().min(1),
  name: z.string().trim().min(1),
  owner: z.string().trim().min(1),
  url: z.string().url(),
  description: z.string().trim().min(1),
  topics: z.array(z.string().trim().min(1)).default([]),
  primaryLanguage: z.string().trim().min(1).nullable(),
  stars: z.number().int().nonnegative(),
  forks: z.number().int().nonnegative(),
  openIssues: z.number().int().nonnegative().nullable(),
  createdAt: z.string().trim().min(1),
  pushedAt: z.string().trim().min(1),
  readmeText: z.string().trim().min(1),
  issueSignals: z.array(RepoIssueSignalSchema).default([])
});

export const CloneRiskSchema = z.enum(["low", "medium", "high"]);

export const RepoInsightSchema = z.object({
  repoId: z.string().trim().min(1),
  problemSolved: z.string().trim().min(1),
  targetUsers: z.array(z.string().trim().min(1)).min(1),
  coreWorkflow: z.string().trim().min(1),
  technicalMechanisms: z.array(z.string().trim().min(1)).min(1),
  marketSignals: z.array(z.string().trim().min(1)).default([]),
  painSignals: z.array(z.string().trim().min(1)).default([]),
  missingCapabilities: z.array(z.string().trim().min(1)).default([]),
  cloneRisk: CloneRiskSchema
});

export const DiscoveredIdeaSchema = z.object({
  ideaId: z.string().trim().min(1),
  title: z.string().trim().min(3),
  oneSentence: z.string().trim().min(10),
  problem: z.string().trim().min(10),
  targetUsers: z.array(z.string().trim().min(1)).min(1),
  mvpScope: z.array(z.string().trim().min(1)).min(1),
  nonGoals: z.array(z.string().trim().min(1)).default([]),
  sourceRepos: z.array(z.string().trim().min(1)).min(1),
  originalInspiration: z.string().trim().min(1),
  differentiation: z.array(z.string().trim().min(1)).min(1),
  aiLeverage: z.array(z.string().trim().min(1)).min(1),
  researchQuestions: z.array(z.string().trim().min(1)).min(1),
  risks: z.array(z.string().trim().min(1)).default([]),
  domains: z.array(z.string().trim().min(1)).min(1)
});

export const IdeaVerdictSchema = z.enum([
  "reject",
  "needs_research",
  "promising"
]);

export const IdeaScoreSchema = z.object({
  ideaId: z.string().trim().min(1),
  total: z.number().min(0).max(100),
  problemClarity: z.number().min(0).max(1),
  userSpecificity: z.number().min(0).max(1),
  githubSignalStrength: z.number().min(0).max(1),
  novelty: z.number().min(0).max(1),
  mvpFeasibility: z.number().min(0).max(1),
  researchLeverage: z.number().min(0).max(1),
  businessPotential: z.number().min(0).max(1),
  riskPenalty: z.number().min(0).max(0.3),
  verdict: IdeaVerdictSchema,
  reasons: z.array(z.string().trim().min(1)).default([])
});

export const IdeaDiscoveryInputSchema = z.object({
  domain: z.string().trim().min(2),
  constraints: z.array(z.string().trim().min(1)).default([]),
  maxIdeas: z.number().int().min(1).max(25).default(5),
  sourceRepos: z.array(IdeaSourceRepoSchema).min(1),
  outputLanguage: z.string().trim().min(2).default("pl")
});

export const IdeaDiscoveryReportSchema = z.object({
  id: z.string().trim().min(1),
  generatedAt: z.string().trim().min(1),
  input: IdeaDiscoveryInputSchema,
  sourceRepos: z.array(IdeaSourceRepoSchema).min(1),
  repoInsights: z.array(RepoInsightSchema).min(1),
  discoveredIdeas: z.array(DiscoveredIdeaSchema).min(1),
  ideaScores: z.array(IdeaScoreSchema).min(1),
  rejectedIdeas: z.array(DiscoveredIdeaSchema).default([]),
  shortlist: z.array(DiscoveredIdeaSchema).default([]),
  projectIdeaInputs: z.array(ProjectIdeaInputSchema).default([]),
  metrics: z.object({
    ideaCount: z.number().int().nonnegative(),
    promisingCount: z.number().int().nonnegative(),
    cloneRejectedCount: z.number().int().nonnegative(),
    averageNovelty: z.number().min(0).max(1),
    averageMvpFeasibility: z.number().min(0).max(1),
    averageGithubSignalStrength: z.number().min(0).max(1),
    researchReadyCount: z.number().int().nonnegative(),
    pipelineInputValidCount: z.number().int().nonnegative()
  })
});

export const GithubIdeaCollectorDiagnosticsSchema = z.object({
  source: z.literal("github"),
  query: z.string().trim().min(1),
  searchUrl: z.string().url(),
  cached: z.boolean(),
  fetchedRepoCount: z.number().int().nonnegative(),
  returnedRepoCount: z.number().int().nonnegative(),
  readmeFetchedCount: z.number().int().nonnegative(),
  issuesFetchedCount: z.number().int().nonnegative(),
  rateLimit: z
    .object({
      limit: z.number().int().nonnegative().nullable(),
      remaining: z.number().int().nonnegative().nullable(),
      resetAt: z.string().nullable()
    })
    .nullable(),
  warnings: z.array(z.string().trim().min(1)).default([])
});

export const GithubIdeaCollectorResultSchema = z.object({
  sourceRepos: z.array(IdeaSourceRepoSchema).default([]),
  diagnostics: GithubIdeaCollectorDiagnosticsSchema
});

export const GhArchiveTrendRepoSchema = z.object({
  repoFullName: z.string().trim().min(1),
  stars: z.number().int().nonnegative(),
  forks: z.number().int().nonnegative(),
  pushes: z.number().int().nonnegative(),
  issues: z.number().int().nonnegative(),
  trendScore: z.number().nonnegative()
});

export const GhArchiveTrendDiagnosticsSchema = z.object({
  source: z.literal("gh_archive_bigquery"),
  startDate: z.string().trim().min(10),
  endDate: z.string().trim().min(10),
  dayCount: z.number().int().min(1),
  maxRepos: z.number().int().min(1),
  maxBytesBilled: z.number().int().positive(),
  dryRun: z.boolean(),
  estimatedBytesProcessed: z.number().int().nonnegative().nullable(),
  query: z.string().trim().min(1),
  warnings: z.array(z.string().trim().min(1)).default([])
});

export const GhArchiveTrendResultSchema = z.object({
  repos: z.array(GhArchiveTrendRepoSchema).default([]),
  diagnostics: GhArchiveTrendDiagnosticsSchema
});

export const TrendRadarRepoSignalSchema = z.object({
  repoId: z.string().trim().min(1),
  repoFullName: z.string().trim().min(1),
  category: z.string().trim().min(1),
  heatScore: z.number().min(0).max(100),
  sexinessScore: z.number().min(0).max(100),
  feasibilityScore: z.number().min(0).max(100),
  trendScore: z.number().nonnegative(),
  evidence: z.array(z.string().trim().min(1)).min(1)
});

export const TrendRadarCategorySchema = z.object({
  category: z.string().trim().min(1),
  repoCount: z.number().int().min(1),
  heatScore: z.number().min(0).max(100),
  sexinessScore: z.number().min(0).max(100),
  feasibilityScore: z.number().min(0).max(100),
  representativeRepos: z.array(z.string().trim().min(1)).min(1),
  whyHot: z.array(z.string().trim().min(1)).min(1),
  opportunityAngles: z.array(z.string().trim().min(1)).min(1)
});

export const TrendRadarOpportunitySchema = z.object({
  category: z.string().trim().min(1),
  title: z.string().trim().min(3),
  rationale: z.string().trim().min(10),
  suggestedConstraints: z.array(z.string().trim().min(1)).min(1)
});

export const TrendRadarReportSchema = z.object({
  generatedAt: z.string().trim().min(1),
  repoSignals: z.array(TrendRadarRepoSignalSchema).default([]),
  categories: z.array(TrendRadarCategorySchema).default([]),
  topOpportunities: z.array(TrendRadarOpportunitySchema).default([])
});

export const ProjectIdeaAuditFindingSchema = z.object({
  severity: z.enum(["info", "warning", "critical"]),
  area: z.string().trim().min(1),
  message: z.string().trim().min(1),
  evidence: z.array(z.string().trim().min(1)).default([]),
  action: z.string().trim().min(1)
});

export const ProjectIdeaAuditSchema = z.object({
  generatedAt: z.string().trim().min(1),
  reportId: z.string().trim().min(1),
  score: z.number().min(0).max(100),
  readiness: z.enum(["ready", "needs_review", "blocked"]),
  strengths: z.array(z.string().trim().min(1)).default([]),
  weaknesses: z.array(ProjectIdeaAuditFindingSchema).default([]),
  promotionMoves: z.array(z.string().trim().min(1)).default([]),
  mitigationMoves: z.array(z.string().trim().min(1)).default([]),
  metrics: z.object({
    sourceRepoCount: z.number().int().nonnegative(),
    shortlistCount: z.number().int().nonnegative(),
    rejectedCount: z.number().int().nonnegative(),
    cloneRejectionRatio: z.number().min(0).max(1),
    averageShortlistScore: z.number().min(0).max(100),
    averageNovelty: z.number().min(0).max(1),
    averageMvpFeasibility: z.number().min(0).max(1),
    averageGithubSignalStrength: z.number().min(0).max(1),
    researchReadyRatio: z.number().min(0).max(1),
    domainDiversity: z.number().int().nonnegative(),
    targetUserDiversity: z.number().int().nonnegative(),
    maxSourceDominance: z.number().min(0).max(1),
    trendRadarCategoryCount: z.number().int().nonnegative(),
    trendRadarOpportunityCount: z.number().int().nonnegative(),
    genericTitleCount: z.number().int().nonnegative()
  })
});

export function validateIdeaDiscoveryReport(value: unknown) {
  return IdeaDiscoveryReportSchema.parse(value);
}

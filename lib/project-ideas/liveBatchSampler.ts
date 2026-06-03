import { auditIdeaDiscoveryReport } from "@/lib/project-ideas/audit";
import { collectGhArchiveTrends } from "@/lib/project-ideas/ghArchiveTrendCollector";
import { collectGithubIdeaSourceReposByFullName } from "@/lib/project-ideas/githubCollector";
import { discoverProjectIdeas } from "@/lib/project-ideas/runner";
import { buildTrendRadar } from "@/lib/project-ideas/trendRadar";
import type { BqExecutor } from "@/lib/project-ideas/ghArchiveTrendCollector";
import type { FetchLike } from "@/lib/project-ideas/githubCollector";
import type {
  DiscoveredIdea,
  GhArchiveTrendRepo,
  GithubIdeaCollectorResult,
  IdeaDiscoveryReport,
  IdeaScore
} from "@/lib/project-ideas/types";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

export const ProjectIdeaLiveBatchWindowInputSchema = z.object({
  id: z.string().trim().min(1).optional(),
  startDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export const ProjectIdeaLiveBatchSamplerInputSchema = z.object({
  domain: z.string().trim().min(2),
  constraints: z.array(z.string().trim().min(1)).default([]),
  outputLanguage: z.string().trim().min(2).default("pl"),
  windows: z.array(ProjectIdeaLiveBatchWindowInputSchema).min(1).max(5),
  mode: z.enum(["dry_run", "live"]).default("dry_run"),
  allowLiveSpend: z.boolean().default(false),
  maxReposPerWindow: z.number().int().min(1).max(25).default(10),
  maxDaysPerWindow: z.number().int().min(1).max(3).default(1),
  maxBytesBilledPerWindow: z
    .number()
    .int()
    .positive()
    .max(500_000_000)
    .default(200_000_000),
  includeReadme: z.boolean().default(true),
  includeIssues: z.boolean().default(true),
  timeoutMs: z.number().int().min(100).max(60_000).default(10_000),
  maxIdeas: z.number().int().min(1).max(10).default(5),
  maxIdeasPerSource: z.number().int().min(1).max(3).default(1),
  minSourceReposForPass: z.number().int().min(1).max(50).default(5),
  minReadyIdeasForPass: z.number().int().min(1).max(10).default(3),
  token: z.string().trim().min(1).optional()
});

export type ProjectIdeaLiveBatchSamplerInput = z.infer<
  typeof ProjectIdeaLiveBatchSamplerInputSchema
>;

type WindowSummary = {
  id: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  dryRun: boolean;
  maxRepos: number;
  maxBytesBilled: number;
  estimatedBytesProcessed: number | null;
  trendRepoCount: number;
  warningCount: number;
  warnings: string[];
  topTrendRepos: GhArchiveTrendRepo[];
};

export type ProjectIdeaLiveBatchSummary = {
  generatedAt: string;
  domain: string;
  mode: "dry_run" | "live";
  outputDir: string;
  budget: {
    windowCount: number;
    maxDaysPerWindow: number;
    maxReposPerWindow: number;
    maxBytesBilledPerWindow: number;
    totalMaxBytesBilled: number;
    totalEstimatedBytesProcessed: number | null;
    noAutoEscalation: true;
  };
  windows: WindowSummary[];
  githubEnrichment: {
    used: boolean;
    cached: boolean;
    fetchedRepoCount: number;
    returnedRepoCount: number;
    readmeFetchedCount: number;
    issuesFetchedCount: number;
    warningCount: number;
    rateLimitRemaining: number | null;
  };
  aggregate: {
    trendRepoCount: number;
    uniqueTrendRepoCount: number;
    sourceRepoCount: number;
    ideaCount: number;
    promisingCount: number;
    handoffReadyCount: number;
    averageHandoffQualityScore: number;
    auditScore: number | null;
    auditReadiness: string | null;
    trendRadarCategoryCount: number;
    trendRadarOpportunityCount: number;
  };
  quality: {
    passed: boolean;
    verdict: "ready_for_live" | "ready" | "needs_review" | "blocked";
    reasons: string[];
    blockers: string[];
    warnings: string[];
  };
  topTrendRepos: GhArchiveTrendRepo[];
  shortlist: Array<{
    ideaId: string;
    title: string;
    sourceRepos: string[];
    score: number;
    oneSentence: string;
  }>;
};

type RunControlledLiveBatchSamplingInput = ProjectIdeaLiveBatchSamplerInput & {
  outputDir: string;
  bqExecutor?: BqExecutor;
  fetchFn?: FetchLike;
};

const artifactFiles = {
  summaryJson: "controlled_live_batch_summary.json",
  summaryMarkdown: "controlled_live_batch_summary.md"
} as const;

function scoreFor(idea: DiscoveredIdea, scores: IdeaScore[]) {
  return scores.find((score) => score.ideaId === idea.ideaId)?.total ?? 0;
}

function uniqueTrendRepos(repos: GhArchiveTrendRepo[]) {
  const seen = new Set<string>();
  const unique: GhArchiveTrendRepo[] = [];

  for (const repo of repos) {
    const key = repo.repoFullName.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(repo);
    }
  }

  return unique.sort((left, right) => right.trendScore - left.trendScore);
}

function totalEstimatedBytes(windows: WindowSummary[]) {
  const estimates = windows.map((window) => window.estimatedBytesProcessed);
  if (estimates.some((estimate) => estimate === null)) {
    return null;
  }

  return estimates.reduce((sum, estimate) => sum + (estimate ?? 0), 0);
}

function summarizeGithubCollection(
  collection: GithubIdeaCollectorResult | null
): ProjectIdeaLiveBatchSummary["githubEnrichment"] {
  const diagnostics = collection?.diagnostics;

  return {
    used: Boolean(collection),
    cached: diagnostics?.cached ?? false,
    fetchedRepoCount: diagnostics?.fetchedRepoCount ?? 0,
    returnedRepoCount: diagnostics?.returnedRepoCount ?? 0,
    readmeFetchedCount: diagnostics?.readmeFetchedCount ?? 0,
    issuesFetchedCount: diagnostics?.issuesFetchedCount ?? 0,
    warningCount: diagnostics?.warnings.length ?? 0,
    rateLimitRemaining: diagnostics?.rateLimit?.remaining ?? null
  };
}

function summarizeShortlist(report: IdeaDiscoveryReport | null) {
  if (!report) {
    return [];
  }

  return report.shortlist.slice(0, 10).map((idea) => ({
    ideaId: idea.ideaId,
    title: idea.title,
    sourceRepos: idea.sourceRepos,
    score: scoreFor(idea, report.ideaScores),
    oneSentence: idea.oneSentence
  }));
}

function buildQuality(input: {
  mode: "dry_run" | "live";
  windows: WindowSummary[];
  githubCollection: GithubIdeaCollectorResult | null;
  report: IdeaDiscoveryReport | null;
  auditScore: number | null;
  auditReadiness: string | null;
  trendRadarCategoryCount: number;
  trendRadarOpportunityCount: number;
  minSourceReposForPass: number;
  minReadyIdeasForPass: number;
}) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const reasons: string[] = [];

  for (const window of input.windows) {
    if (window.warningCount > 0) {
      blockers.push(
        `Window ${window.id} has ${window.warningCount} GH Archive warnings.`
      );
    }

    if (
      window.estimatedBytesProcessed !== null &&
      window.estimatedBytesProcessed > window.maxBytesBilled
    ) {
      blockers.push(
        `Window ${window.id} estimated ${window.estimatedBytesProcessed} bytes above cap ${window.maxBytesBilled}.`
      );
    }
  }

  if (input.mode === "dry_run") {
    if (blockers.length === 0) {
      reasons.push("All windows passed dry-run budget checks.");
    }

    return {
      passed: blockers.length === 0,
      verdict: blockers.length === 0 ? "ready_for_live" : "blocked",
      reasons,
      blockers,
      warnings
    } as const;
  }

  const sourceRepoCount = input.report?.sourceRepos.length ?? 0;
  const handoffReadyCount = input.report?.metrics.handoffReadyCount ?? 0;
  const averageHandoffQualityScore =
    input.report?.metrics.averageHandoffQualityScore ?? 0;

  if (sourceRepoCount < input.minSourceReposForPass) {
    blockers.push(
      `Only ${sourceRepoCount} enriched repos; required ${input.minSourceReposForPass}.`
    );
  }

  if (handoffReadyCount < input.minReadyIdeasForPass) {
    blockers.push(
      `Only ${handoffReadyCount} handoff-ready ideas; required ${input.minReadyIdeasForPass}.`
    );
  }

  if (averageHandoffQualityScore < 82) {
    blockers.push(
      `Average handoff quality ${averageHandoffQualityScore}; required at least 82.`
    );
  }

  if ((input.auditScore ?? 0) < 70) {
    blockers.push(`Audit score ${input.auditScore ?? 0}; required at least 70.`);
  }

  if (input.trendRadarCategoryCount === 0 || input.trendRadarOpportunityCount === 0) {
    blockers.push("Trend radar did not produce categories and opportunities.");
  }

  if (input.githubCollection?.diagnostics.warnings.length) {
    warnings.push(...input.githubCollection.diagnostics.warnings);
  }

  if (blockers.length === 0) {
    reasons.push("Live sample produced enough enriched repos and handoff-ready ideas.");
    reasons.push("Trend radar and audit both produced usable quality signals.");
  }

  return {
    passed: blockers.length === 0,
    verdict: blockers.length === 0 ? "ready" : "needs_review",
    reasons,
    blockers,
    warnings
  } as const;
}

export function projectIdeaLiveBatchSummaryToMarkdown(
  summary: ProjectIdeaLiveBatchSummary
) {
  const lines = [
    "# Controlled Live Idea Batch Summary",
    "",
    `Generated at: ${summary.generatedAt}`,
    `Domain: ${summary.domain}`,
    `Mode: ${summary.mode}`,
    `Verdict: ${summary.quality.verdict}`,
    `Passed: ${summary.quality.passed ? "yes" : "no"}`,
    "",
    "## Budget",
    "",
    `- Windows: ${summary.budget.windowCount}`,
    `- Max days per window: ${summary.budget.maxDaysPerWindow}`,
    `- Max repos per window: ${summary.budget.maxReposPerWindow}`,
    `- Max bytes billed per window: ${summary.budget.maxBytesBilledPerWindow}`,
    `- Total estimated bytes: ${
      summary.budget.totalEstimatedBytesProcessed ?? "unknown"
    }`,
    `- No auto escalation: ${summary.budget.noAutoEscalation ? "yes" : "no"}`,
    "",
    "## Aggregate",
    "",
    `- Trend repos: ${summary.aggregate.trendRepoCount}`,
    `- Unique trend repos: ${summary.aggregate.uniqueTrendRepoCount}`,
    `- Enriched source repos: ${summary.aggregate.sourceRepoCount}`,
    `- Ideas: ${summary.aggregate.ideaCount}`,
    `- Promising ideas: ${summary.aggregate.promisingCount}`,
    `- Handoff-ready ideas: ${summary.aggregate.handoffReadyCount}`,
    `- Average handoff quality: ${summary.aggregate.averageHandoffQualityScore}`,
    `- Audit score: ${summary.aggregate.auditScore ?? "n/a"}`,
    `- Trend radar categories: ${summary.aggregate.trendRadarCategoryCount}`,
    `- Trend radar opportunities: ${summary.aggregate.trendRadarOpportunityCount}`,
    "",
    "## Top Trend Repos",
    ""
  ];

  for (const repo of summary.topTrendRepos.slice(0, 10)) {
    lines.push(
      `- ${repo.repoFullName}: score ${repo.trendScore}, stars ${repo.stars}, forks ${repo.forks}`
    );
  }

  lines.push("", "## Shortlist", "");

  for (const idea of summary.shortlist) {
    lines.push(`- ${idea.title} (${idea.score}): ${idea.oneSentence}`);
  }

  lines.push("", "## Quality", "");

  for (const reason of summary.quality.reasons) {
    lines.push(`- ${reason}`);
  }

  for (const blocker of summary.quality.blockers) {
    lines.push(`- BLOCKER: ${blocker}`);
  }

  for (const warning of summary.quality.warnings) {
    lines.push(`- WARNING: ${warning}`);
  }

  return `${lines.join("\n")}\n`;
}

export async function runControlledLiveBatchSampling(
  input: RunControlledLiveBatchSamplingInput
): Promise<ProjectIdeaLiveBatchSummary> {
  const parsed = ProjectIdeaLiveBatchSamplerInputSchema.parse(input);

  if (parsed.mode === "live" && !parsed.allowLiveSpend) {
    throw new Error(
      "Live GH Archive sampling requires allowLiveSpend=true. Run dry_run first and inspect controlled_live_batch_summary.md before enabling live mode."
    );
  }

  const generatedAt = new Date().toISOString();
  const windowResults = await Promise.all(
    parsed.windows.map(async (window, index) => {
      const result = await collectGhArchiveTrends({
        startDate: window.startDate,
        endDate: window.endDate,
        maxRepos: parsed.maxReposPerWindow,
        maxDays: parsed.maxDaysPerWindow,
        maxBytesBilled: parsed.maxBytesBilledPerWindow,
        dryRun: parsed.mode === "dry_run",
        bqExecutor: input.bqExecutor
      });

      return {
        result,
        summary: {
          id: window.id ?? `window_${index + 1}`,
          startDate: result.diagnostics.startDate,
          endDate: result.diagnostics.endDate,
          dayCount: result.diagnostics.dayCount,
          dryRun: result.diagnostics.dryRun,
          maxRepos: result.diagnostics.maxRepos,
          maxBytesBilled: result.diagnostics.maxBytesBilled,
          estimatedBytesProcessed: result.diagnostics.estimatedBytesProcessed,
          trendRepoCount: result.repos.length,
          warningCount: result.diagnostics.warnings.length,
          warnings: result.diagnostics.warnings,
          topTrendRepos: result.repos.slice(0, 10)
        } satisfies WindowSummary
      };
    })
  );
  const windows = windowResults.map((window) => window.summary);
  const allTrendRepos = uniqueTrendRepos(
    windowResults.flatMap((window) => window.result.repos)
  );
  const githubCollection =
    parsed.mode === "live" && allTrendRepos.length > 0
      ? await collectGithubIdeaSourceReposByFullName({
          repoFullNames: allTrendRepos.map((repo) => repo.repoFullName),
          includeReadme: parsed.includeReadme,
          includeIssues: parsed.includeIssues,
          timeoutMs: parsed.timeoutMs,
          token: parsed.token,
          fetchFn: input.fetchFn
        })
      : null;
  const report =
    githubCollection?.sourceRepos.length
      ? discoverProjectIdeas({
          domain: parsed.domain,
          constraints: parsed.constraints,
          maxIdeas: parsed.maxIdeas,
          maxIdeasPerSource: parsed.maxIdeasPerSource,
          outputLanguage: parsed.outputLanguage,
          sourceRepos: githubCollection.sourceRepos
        })
      : null;
  const trendRadar = report
    ? buildTrendRadar({
        sourceRepos: report.sourceRepos,
        repoInsights: report.repoInsights,
        ghArchiveTrendRepos: allTrendRepos,
        generatedAt
      })
    : null;
  const audit =
    report && trendRadar
      ? auditIdeaDiscoveryReport({ report, trendRadar })
      : null;
  const quality = buildQuality({
    mode: parsed.mode,
    windows,
    githubCollection,
    report,
    auditScore: audit?.score ?? null,
    auditReadiness: audit?.readiness ?? null,
    trendRadarCategoryCount: trendRadar?.categories.length ?? 0,
    trendRadarOpportunityCount: trendRadar?.topOpportunities.length ?? 0,
    minSourceReposForPass: parsed.minSourceReposForPass,
    minReadyIdeasForPass: parsed.minReadyIdeasForPass
  });
  const summary: ProjectIdeaLiveBatchSummary = {
    generatedAt,
    domain: parsed.domain,
    mode: parsed.mode,
    outputDir: input.outputDir,
    budget: {
      windowCount: parsed.windows.length,
      maxDaysPerWindow: parsed.maxDaysPerWindow,
      maxReposPerWindow: parsed.maxReposPerWindow,
      maxBytesBilledPerWindow: parsed.maxBytesBilledPerWindow,
      totalMaxBytesBilled:
        parsed.windows.length * parsed.maxBytesBilledPerWindow,
      totalEstimatedBytesProcessed: totalEstimatedBytes(windows),
      noAutoEscalation: true
    },
    windows,
    githubEnrichment: summarizeGithubCollection(githubCollection),
    aggregate: {
      trendRepoCount: windowResults.reduce(
        (sum, window) => sum + window.result.repos.length,
        0
      ),
      uniqueTrendRepoCount: allTrendRepos.length,
      sourceRepoCount: report?.sourceRepos.length ?? 0,
      ideaCount: report?.metrics.ideaCount ?? 0,
      promisingCount: report?.metrics.promisingCount ?? 0,
      handoffReadyCount: report?.metrics.handoffReadyCount ?? 0,
      averageHandoffQualityScore:
        report?.metrics.averageHandoffQualityScore ?? 0,
      auditScore: audit?.score ?? null,
      auditReadiness: audit?.readiness ?? null,
      trendRadarCategoryCount: trendRadar?.categories.length ?? 0,
      trendRadarOpportunityCount: trendRadar?.topOpportunities.length ?? 0
    },
    quality,
    topTrendRepos: allTrendRepos.slice(0, 20),
    shortlist: summarizeShortlist(report)
  };

  await mkdir(input.outputDir, { recursive: true });
  await Promise.all([
    writeFile(
      join(input.outputDir, artifactFiles.summaryJson),
      `${JSON.stringify(summary, null, 2)}\n`,
      "utf8"
    ),
    writeFile(
      join(input.outputDir, artifactFiles.summaryMarkdown),
      projectIdeaLiveBatchSummaryToMarkdown(summary),
      "utf8"
    )
  ]);

  return summary;
}

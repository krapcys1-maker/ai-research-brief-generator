import { ProjectIdeaInputSchema } from "@/lib/project-research/schemas";
import {
  GithubIdeaCollectorResultSchema,
  GhArchiveTrendResultSchema,
  IdeaDiscoveryInputSchema,
  IdeaDiscoveryReportSchema,
  IdeaSourceRepoSchema,
  TrendRadarReportSchema
} from "@/lib/project-ideas/schemas";
import { analyzeIdeaSourceRepos } from "@/lib/project-ideas/repoAnalyzer";
import { generateIdeasFromRepos } from "@/lib/project-ideas/ideaGenerator";
import { scoreIdeas } from "@/lib/project-ideas/ranker";
import { scoreProjectIdeaHandoffs } from "@/lib/project-ideas/handoffQuality";
import {
  collectGithubIdeaSourceRepos,
  collectGithubIdeaSourceReposByFullName
} from "@/lib/project-ideas/githubCollector";
import { collectGhArchiveTrends } from "@/lib/project-ideas/ghArchiveTrendCollector";
import {
  ideaDiscoveryReportToMarkdown,
  projectIdeaHandoffQualityToMarkdown,
  trendRadarToMarkdown
} from "@/lib/project-ideas/markdown";
import { buildTrendRadar } from "@/lib/project-ideas/trendRadar";
import {
  auditIdeaDiscoveryReport,
  projectIdeaAuditToMarkdown
} from "@/lib/project-ideas/audit";
import type { BqExecutor } from "@/lib/project-ideas/ghArchiveTrendCollector";
import type { FetchLike } from "@/lib/project-ideas/githubCollector";
import type {
  DiscoveredIdea,
  GhArchiveTrendResult,
  GithubIdeaCollectorResult,
  IdeaDiscoveryReport,
  IdeaScore,
  IdeaSourceRepo
} from "@/lib/project-ideas/types";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadEnvFile } from "node:process";
import { z } from "zod";

const GithubSearchRunnerSchema = z.object({
  query: z.string().trim().min(1),
  maxRepos: z.number().int().min(1).max(100).default(10),
  includeReadme: z.boolean().default(true),
  includeIssues: z.boolean().default(true),
  timeoutMs: z.number().int().min(100).max(60_000).default(10_000),
  tokenEnv: z.string().trim().min(1).optional()
});

const GhArchiveTrendsRunnerSchema = z.object({
  startDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  maxRepos: z.number().int().min(1).max(100).default(25),
  maxDays: z.number().int().min(1).max(7).default(3),
  maxBytesBilled: z.number().int().positive().default(200_000_000),
  dryRun: z.boolean().default(true),
  includeReadme: z.boolean().default(true),
  includeIssues: z.boolean().default(true),
  timeoutMs: z.number().int().min(100).max(60_000).default(10_000),
  tokenEnv: z.string().trim().min(1).optional()
});

export const ProjectIdeaDiscoveryRunnerInputSchema = z
  .object({
    domain: z.string().trim().min(2),
    constraints: z.array(z.string().trim().min(1)).default([]),
    maxIdeas: z.number().int().min(1).max(25).default(5),
    maxIdeasPerSource: z.number().int().min(1).max(5).default(1),
    outputLanguage: z.string().trim().min(2).default("pl"),
    sourceRepos: z.array(IdeaSourceRepoSchema).min(1).optional(),
    githubSearch: GithubSearchRunnerSchema.optional(),
    ghArchiveTrends: GhArchiveTrendsRunnerSchema.optional()
  })
  .superRefine((value, ctx) => {
    if (!value.sourceRepos?.length && !value.githubSearch && !value.ghArchiveTrends) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide sourceRepos, githubSearch, or ghArchiveTrends.",
        path: ["sourceRepos"]
      });
    }
  });

export type ProjectIdeaDiscoveryRunnerInput = z.infer<
  typeof ProjectIdeaDiscoveryRunnerInputSchema
>;

export type ProjectIdeaDiscoveryRunManifest = {
  runId: string;
  generatedAt: string;
  domain: string;
  outputDir: string;
  sourceRepoCount: number;
  ideaCount: number;
  promisingCount: number;
  maxIdeasPerSource: number;
  cloneRejectedCount: number;
  projectIdeaInputCount: number;
  handoffReadyCount: number;
  averageHandoffQualityScore: number;
  githubMode: "not_used" | "used";
  ghArchiveMode: "not_used" | "dry_run" | "used";
  ghArchiveTrendRepoCount: number;
  trendRadarCategoryCount: number;
  trendRadarTopOpportunityCount: number;
  warnings: string[];
  files: typeof artifactFiles;
};

type RunProjectIdeaDiscoveryInput = ProjectIdeaDiscoveryRunnerInput & {
  outputDir: string;
  bqExecutor?: BqExecutor;
  fetchFn?: FetchLike;
};

const artifactFiles = {
  manifest: "manifest.json",
  sourceRepos: "source_repos.json",
  githubCollection: "github_collection.json",
  ghArchiveTrends: "gh_archive_trends.json",
  trendRadarJson: "trend_radar.json",
  trendRadarMarkdown: "trend_radar.md",
  projectIdeasAuditJson: "project_ideas_audit.json",
  projectIdeasAuditMarkdown: "project_ideas_audit.md",
  repoInsights: "repo_insights.json",
  discoveredIdeas: "discovered_ideas.json",
  ideaScores: "idea_scores.json",
  rejectedIdeas: "rejected_ideas.json",
  shortlist: "shortlist.json",
  projectIdeaInputs: "project_idea_inputs.json",
  projectIdeaHandoffQualityJson: "project_idea_handoff_quality.json",
  projectIdeaHandoffQualityMarkdown: "project_idea_handoff_quality.md",
  ideaDiscoveryReportJson: "idea_discovery_report.json",
  ideaDiscoveryReportMarkdown: "idea_discovery_report.md"
} as const;

let envLoaded = false;

export function findBareGithubTokenInEnvText(content: string) {
  return (
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(
        (line) =>
          !line.startsWith("#") &&
          !line.includes("=") &&
          /^(github_pat_|gh[pousr]_)[A-Za-z0-9_]+$/.test(line)
      ) ?? null
  );
}

function loadBareGithubTokenFromEnvFile(path = ".env") {
  if (process.env.GITHUB_TOKEN || !existsSync(path)) {
    return;
  }

  const token = findBareGithubTokenInEnvText(readFileSync(path, "utf8"));
  if (token) {
    process.env.GITHUB_TOKEN = token;
  }
}

function ensureEnvLoaded() {
  if (envLoaded) {
    return;
  }

  envLoaded = true;

  try {
    loadEnvFile();
  } catch {
    // .env is optional; callers can still provide process.env directly.
  }

  loadBareGithubTokenFromEnvFile();
}

function githubToken(tokenEnv?: string) {
  ensureEnvLoaded();
  return tokenEnv ? process.env[tokenEnv] : process.env.GITHUB_TOKEN;
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function scoreFor(idea: DiscoveredIdea, scores: IdeaScore[]) {
  const score = scores.find((candidate) => candidate.ideaId === idea.ideaId);
  if (!score) {
    throw new Error(`Missing score for ${idea.ideaId}`);
  }

  return score;
}

function toProjectIdeaInput(idea: DiscoveredIdea, outputLanguage: string) {
  return ProjectIdeaInputSchema.parse({
    title: idea.title,
    description: `${idea.oneSentence} Problem: ${idea.problem}`,
    constraints: [...idea.nonGoals, ...idea.mvpScope.map((scope) => `MVP: ${scope}`)],
    preferredDomains: idea.domains,
    outputLanguage
  });
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function uniqueRepos(repos: IdeaSourceRepo[]) {
  const seen = new Set<string>();
  const unique: IdeaSourceRepo[] = [];

  for (const repo of repos) {
    const key = `${repo.owner}/${repo.name}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(repo);
    }
  }

  return unique;
}

function uniqueIdeasByTitle(ideas: DiscoveredIdea[]) {
  const seen = new Set<string>();
  const unique: DiscoveredIdea[] = [];

  for (const idea of ideas) {
    const key = idea.title.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(idea);
    }
  }

  return unique;
}

function sourceDominance(ideas: DiscoveredIdea[]) {
  if (ideas.length === 0) {
    return 0;
  }

  const counts = new Map<string, number>();

  for (const idea of ideas) {
    const source = idea.sourceRepos[0] ?? "unknown";
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }

  return Math.max(...counts.values()) / ideas.length;
}

export function selectShortlistIdeas(input: {
  discoveredIdeas: DiscoveredIdea[];
  ideaScores: IdeaScore[];
  maxIdeas: number;
  maxIdeasPerSource: number;
}) {
  const perSourceCounts = new Map<string, number>();
  const candidates = input.discoveredIdeas
    .filter((idea) => scoreFor(idea, input.ideaScores).verdict === "promising")
    .sort(
      (left, right) =>
        scoreFor(right, input.ideaScores).total -
        scoreFor(left, input.ideaScores).total
    )
    .reduce<DiscoveredIdea[]>(
      (unique, idea) => uniqueIdeasByTitle([...unique, idea]),
      []
    );
  const selected: DiscoveredIdea[] = [];

  for (const idea of candidates) {
    const source = idea.sourceRepos[0] ?? "unknown";
    const sourceCount = perSourceCounts.get(source) ?? 0;
    if (sourceCount >= input.maxIdeasPerSource) {
      continue;
    }

    selected.push(idea);
    perSourceCounts.set(source, sourceCount + 1);

    if (selected.length >= input.maxIdeas) {
      break;
    }
  }

  return selected;
}

export function discoverProjectIdeas(value: unknown): IdeaDiscoveryReport {
  const input = IdeaDiscoveryInputSchema.parse(value);
  const repoInsights = analyzeIdeaSourceRepos(input.sourceRepos);
  const discoveredIdeas = generateIdeasFromRepos({
    repos: input.sourceRepos,
    insights: repoInsights,
    constraints: input.constraints
  });
  const ideaScores = scoreIdeas({
    ideas: discoveredIdeas,
    repos: input.sourceRepos,
    insights: repoInsights
  });
  const rejectedIdeas = discoveredIdeas.filter(
    (idea) => scoreFor(idea, ideaScores).verdict === "reject"
  );
  const shortlist = selectShortlistIdeas({
    discoveredIdeas,
    ideaScores,
    maxIdeas: input.maxIdeas,
    maxIdeasPerSource: input.maxIdeasPerSource
  });
  const projectIdeaInputs = shortlist.map((idea) =>
    toProjectIdeaInput(idea, input.outputLanguage)
  );
  const projectIdeaHandoffQuality = scoreProjectIdeaHandoffs({
    ideas: shortlist,
    projectIdeaInputs
  });
  const shortlistedScores = shortlist.map((idea) => scoreFor(idea, ideaScores));
  const metrics = {
    ideaCount: discoveredIdeas.length,
    promisingCount: shortlist.length,
    cloneRejectedCount: ideaScores.filter(
      (score) =>
        score.verdict === "reject" &&
        (score.novelty < 0.55 ||
          score.reasons.some((reason) => reason.toLowerCase().includes("core workflow")))
    ).length,
    averageNovelty: Number(average(shortlistedScores.map((score) => score.novelty)).toFixed(3)),
    averageMvpFeasibility: Number(
      average(shortlistedScores.map((score) => score.mvpFeasibility)).toFixed(3)
    ),
    averageGithubSignalStrength: Number(
      average(shortlistedScores.map((score) => score.githubSignalStrength)).toFixed(3)
    ),
    shortlistSourceDominance: Number(sourceDominance(shortlist).toFixed(3)),
    maxIdeasPerSource: input.maxIdeasPerSource,
    researchReadyCount: shortlist.filter((idea) => idea.researchQuestions.length >= 2).length,
    pipelineInputValidCount: projectIdeaInputs.length,
    averageHandoffQualityScore: Number(
      average(projectIdeaHandoffQuality.map((quality) => quality.score)).toFixed(1)
    ),
    handoffReadyCount: projectIdeaHandoffQuality.filter(
      (quality) => quality.readiness === "ready"
    ).length
  };
  const report: IdeaDiscoveryReport = {
    id: `idea_discovery_${slug(input.domain)}`,
    generatedAt: new Date().toISOString(),
    input,
    sourceRepos: input.sourceRepos,
    repoInsights,
    discoveredIdeas,
    ideaScores,
    rejectedIdeas,
    shortlist,
    projectIdeaInputs,
    projectIdeaHandoffQuality,
    metrics
  };

  return IdeaDiscoveryReportSchema.parse(report);
}

export function parseProjectIdeaDiscoveryRunnerInput(
  value: unknown
): ProjectIdeaDiscoveryRunnerInput {
  return ProjectIdeaDiscoveryRunnerInputSchema.parse(value);
}

function createManifest(input: {
  report: IdeaDiscoveryReport;
  outputDir: string;
  githubMode: "not_used" | "used";
  ghArchiveMode: "not_used" | "dry_run" | "used";
  ghArchiveTrendRepoCount: number;
  trendRadarCategoryCount: number;
  trendRadarTopOpportunityCount: number;
  warnings: string[];
}): ProjectIdeaDiscoveryRunManifest {
  return {
    runId: input.report.id,
    generatedAt: input.report.generatedAt,
    domain: input.report.input.domain,
    outputDir: input.outputDir,
    sourceRepoCount: input.report.sourceRepos.length,
    ideaCount: input.report.metrics.ideaCount,
    promisingCount: input.report.metrics.promisingCount,
    maxIdeasPerSource: input.report.metrics.maxIdeasPerSource,
    cloneRejectedCount: input.report.metrics.cloneRejectedCount,
    projectIdeaInputCount: input.report.projectIdeaInputs.length,
    handoffReadyCount: input.report.metrics.handoffReadyCount,
    averageHandoffQualityScore: input.report.metrics.averageHandoffQualityScore,
    githubMode: input.githubMode,
    ghArchiveMode: input.ghArchiveMode,
    ghArchiveTrendRepoCount: input.ghArchiveTrendRepoCount,
    trendRadarCategoryCount: input.trendRadarCategoryCount,
    trendRadarTopOpportunityCount: input.trendRadarTopOpportunityCount,
    warnings: input.warnings,
    files: artifactFiles
  };
}

export async function runProjectIdeaDiscovery(
  input: RunProjectIdeaDiscoveryInput
): Promise<ProjectIdeaDiscoveryRunManifest> {
  const parsed = parseProjectIdeaDiscoveryRunnerInput(input);
  const outputDir = input.outputDir;
  const githubCollection = parsed.githubSearch
    ? await collectGithubIdeaSourceRepos({
        query: parsed.githubSearch.query,
        maxRepos: parsed.githubSearch.maxRepos,
        includeReadme: parsed.githubSearch.includeReadme,
        includeIssues: parsed.githubSearch.includeIssues,
        timeoutMs: parsed.githubSearch.timeoutMs,
        token: githubToken(parsed.githubSearch.tokenEnv)
      })
    : null;
  const ghArchiveTrendResult: GhArchiveTrendResult | null = parsed.ghArchiveTrends
    ? await collectGhArchiveTrends({
        startDate: parsed.ghArchiveTrends.startDate,
        endDate: parsed.ghArchiveTrends.endDate,
        maxRepos: parsed.ghArchiveTrends.maxRepos,
        maxDays: parsed.ghArchiveTrends.maxDays,
        maxBytesBilled: parsed.ghArchiveTrends.maxBytesBilled,
        dryRun: parsed.ghArchiveTrends.dryRun,
        bqExecutor: input.bqExecutor
      })
    : null;
  const ghArchiveGithubCollection: GithubIdeaCollectorResult | null =
    parsed.ghArchiveTrends && ghArchiveTrendResult?.repos.length
      ? await collectGithubIdeaSourceReposByFullName({
          repoFullNames: ghArchiveTrendResult.repos.map((repo) => repo.repoFullName),
          includeReadme: parsed.ghArchiveTrends.includeReadme,
          includeIssues: parsed.ghArchiveTrends.includeIssues,
          timeoutMs: parsed.ghArchiveTrends.timeoutMs,
          token: githubToken(parsed.ghArchiveTrends.tokenEnv),
          fetchFn: input.fetchFn
        })
      : null;
  const sourceRepos: IdeaSourceRepo[] = uniqueRepos([
    ...(parsed.sourceRepos ?? []),
    ...(githubCollection?.sourceRepos ?? []),
    ...(ghArchiveGithubCollection?.sourceRepos ?? [])
  ]);

  if (sourceRepos.length === 0) {
    const dryRunOnly =
      ghArchiveTrendResult?.diagnostics.dryRun && ghArchiveTrendResult.repos.length === 0;
    throw new Error(
      dryRunOnly
        ? "Idea discovery needs source repos. ghArchiveTrends dryRun only returns diagnostics; set dryRun false with maxBytesBilled to enrich trend repos."
        : "Idea discovery needs at least one source repo."
    );
  }

  const report = discoverProjectIdeas({
    domain: parsed.domain,
    constraints: parsed.constraints,
    maxIdeas: parsed.maxIdeas,
    maxIdeasPerSource: parsed.maxIdeasPerSource,
    outputLanguage: parsed.outputLanguage,
    sourceRepos
  });
  const trendRadar = buildTrendRadar({
    sourceRepos: report.sourceRepos,
    repoInsights: report.repoInsights,
    ghArchiveTrendRepos: ghArchiveTrendResult?.repos,
    generatedAt: report.generatedAt
  });
  const githubCollectionArtifact = githubCollection
    ? GithubIdeaCollectorResultSchema.parse(githubCollection)
    : { mode: "not_used" };
  const ghArchiveTrendsArtifact = ghArchiveTrendResult
    ? GhArchiveTrendResultSchema.parse(ghArchiveTrendResult)
    : { mode: "not_used" };
  const trendRadarArtifact = TrendRadarReportSchema.parse(trendRadar);
  const projectIdeasAudit = auditIdeaDiscoveryReport({
    report,
    trendRadar: trendRadarArtifact
  });
  const warnings = [
    ...(githubCollection?.diagnostics.warnings ?? []),
    ...(ghArchiveTrendResult?.diagnostics.warnings ?? []),
    ...(ghArchiveGithubCollection?.diagnostics.warnings ?? [])
  ];
  const manifest = createManifest({
    report,
    outputDir,
    githubMode: githubCollection ? "used" : "not_used",
    ghArchiveMode: ghArchiveTrendResult
      ? ghArchiveTrendResult.diagnostics.dryRun
        ? "dry_run"
        : "used"
      : "not_used",
    ghArchiveTrendRepoCount: ghArchiveTrendResult?.repos.length ?? 0,
    trendRadarCategoryCount: trendRadar.categories.length,
    trendRadarTopOpportunityCount: trendRadar.topOpportunities.length,
    warnings
  });

  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(join(outputDir, artifactFiles.sourceRepos), toJson(report.sourceRepos), "utf8"),
    writeFile(
      join(outputDir, artifactFiles.githubCollection),
      toJson(githubCollectionArtifact),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.ghArchiveTrends),
      toJson(ghArchiveTrendsArtifact),
      "utf8"
    ),
    writeFile(join(outputDir, artifactFiles.trendRadarJson), toJson(trendRadarArtifact), "utf8"),
    writeFile(
      join(outputDir, artifactFiles.trendRadarMarkdown),
      trendRadarToMarkdown(trendRadarArtifact),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.projectIdeasAuditJson),
      toJson(projectIdeasAudit),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.projectIdeasAuditMarkdown),
      projectIdeaAuditToMarkdown(projectIdeasAudit),
      "utf8"
    ),
    writeFile(join(outputDir, artifactFiles.repoInsights), toJson(report.repoInsights), "utf8"),
    writeFile(
      join(outputDir, artifactFiles.discoveredIdeas),
      toJson(report.discoveredIdeas),
      "utf8"
    ),
    writeFile(join(outputDir, artifactFiles.ideaScores), toJson(report.ideaScores), "utf8"),
    writeFile(
      join(outputDir, artifactFiles.rejectedIdeas),
      toJson(report.rejectedIdeas),
      "utf8"
    ),
    writeFile(join(outputDir, artifactFiles.shortlist), toJson(report.shortlist), "utf8"),
    writeFile(
      join(outputDir, artifactFiles.projectIdeaInputs),
      toJson(report.projectIdeaInputs),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.projectIdeaHandoffQualityJson),
      toJson(report.projectIdeaHandoffQuality),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.projectIdeaHandoffQualityMarkdown),
      projectIdeaHandoffQualityToMarkdown(report.projectIdeaHandoffQuality),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.ideaDiscoveryReportJson),
      toJson(report),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.ideaDiscoveryReportMarkdown),
      ideaDiscoveryReportToMarkdown(report),
      "utf8"
    )
  ]);
  await writeFile(join(outputDir, artifactFiles.manifest), toJson(manifest), "utf8");

  return manifest;
}

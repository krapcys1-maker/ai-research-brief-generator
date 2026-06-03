import { ProjectIdeaInputSchema } from "@/lib/project-research/schemas";
import {
  GithubIdeaCollectorResultSchema,
  IdeaDiscoveryInputSchema,
  IdeaDiscoveryReportSchema,
  IdeaSourceRepoSchema
} from "@/lib/project-ideas/schemas";
import { analyzeIdeaSourceRepos } from "@/lib/project-ideas/repoAnalyzer";
import { generateIdeasFromRepos } from "@/lib/project-ideas/ideaGenerator";
import { scoreIdeas } from "@/lib/project-ideas/ranker";
import { collectGithubIdeaSourceRepos } from "@/lib/project-ideas/githubCollector";
import { ideaDiscoveryReportToMarkdown } from "@/lib/project-ideas/markdown";
import type {
  DiscoveredIdea,
  IdeaDiscoveryReport,
  IdeaScore,
  IdeaSourceRepo
} from "@/lib/project-ideas/types";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

const GithubSearchRunnerSchema = z.object({
  query: z.string().trim().min(1),
  maxRepos: z.number().int().min(1).max(100).default(10),
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
    outputLanguage: z.string().trim().min(2).default("pl"),
    sourceRepos: z.array(IdeaSourceRepoSchema).min(1).optional(),
    githubSearch: GithubSearchRunnerSchema.optional()
  })
  .superRefine((value, ctx) => {
    if (!value.sourceRepos?.length && !value.githubSearch) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide sourceRepos or githubSearch.",
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
  cloneRejectedCount: number;
  projectIdeaInputCount: number;
  githubMode: "not_used" | "used";
  warnings: string[];
  files: typeof artifactFiles;
};

type RunProjectIdeaDiscoveryInput = ProjectIdeaDiscoveryRunnerInput & {
  outputDir: string;
};

const artifactFiles = {
  manifest: "manifest.json",
  sourceRepos: "source_repos.json",
  githubCollection: "github_collection.json",
  repoInsights: "repo_insights.json",
  discoveredIdeas: "discovered_ideas.json",
  ideaScores: "idea_scores.json",
  rejectedIdeas: "rejected_ideas.json",
  shortlist: "shortlist.json",
  projectIdeaInputs: "project_idea_inputs.json",
  ideaDiscoveryReportJson: "idea_discovery_report.json",
  ideaDiscoveryReportMarkdown: "idea_discovery_report.md"
} as const;

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
  const shortlist = discoveredIdeas
    .filter((idea) => scoreFor(idea, ideaScores).verdict === "promising")
    .sort((left, right) => scoreFor(right, ideaScores).total - scoreFor(left, ideaScores).total)
    .slice(0, input.maxIdeas);
  const projectIdeaInputs = shortlist.map((idea) =>
    toProjectIdeaInput(idea, input.outputLanguage)
  );
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
    researchReadyCount: shortlist.filter((idea) => idea.researchQuestions.length >= 2).length,
    pipelineInputValidCount: projectIdeaInputs.length
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
    cloneRejectedCount: input.report.metrics.cloneRejectedCount,
    projectIdeaInputCount: input.report.projectIdeaInputs.length,
    githubMode: input.githubMode,
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
        token: parsed.githubSearch.tokenEnv
          ? process.env[parsed.githubSearch.tokenEnv]
          : process.env.GITHUB_TOKEN
      })
    : null;
  const sourceRepos: IdeaSourceRepo[] = [
    ...(parsed.sourceRepos ?? []),
    ...(githubCollection?.sourceRepos ?? [])
  ];

  if (sourceRepos.length === 0) {
    throw new Error("Idea discovery needs at least one source repo.");
  }

  const report = discoverProjectIdeas({
    domain: parsed.domain,
    constraints: parsed.constraints,
    maxIdeas: parsed.maxIdeas,
    outputLanguage: parsed.outputLanguage,
    sourceRepos
  });
  const githubCollectionArtifact = githubCollection
    ? GithubIdeaCollectorResultSchema.parse(githubCollection)
    : { mode: "not_used" };
  const warnings = githubCollection?.diagnostics.warnings ?? [];
  const manifest = createManifest({
    report,
    outputDir,
    githubMode: githubCollection ? "used" : "not_used",
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

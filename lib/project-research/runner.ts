import {
  generateProjectArchitecture,
  judgeProjectArchitecture,
  projectArchitectureJudgeToMarkdown,
  projectArchitectureToMarkdown
} from "@/lib/project-architecture";
import {
  generateProjectPrd,
  projectPrdToMarkdown
} from "@/lib/project-prd";
import { projectResearchBriefToMarkdown } from "@/lib/project-research/markdown";
import { buildProjectResearchBrief } from "@/lib/project-research/briefBuilder";
import { generateProjectPack } from "@/lib/project-pack";
import {
  collectProjectEvidenceFromPapers,
  type EvidenceCollectionResult
} from "@/lib/project-research/evidenceCollector";
import { buildProjectResearchPlan } from "@/lib/project-research/researchPlan";
import {
  HandoffFlagResolutionSchema,
  ProjectIdeaInputSchema,
  ProjectIdeaHandoffContextSchema,
  ReviewedPaperSchema
} from "@/lib/project-research/schemas";
import { searchAllSources } from "@/lib/sources";
import type { ProjectResearchBrief } from "@/lib/project-research/types";
import type { NormalizedPaper, ResearchSource } from "@/lib/sources/types";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";

const NormalizedPaperRunnerSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  abstract: z.string().nullable(),
  authors: z.array(z.string()).default([]),
  year: z.number().int().nullable(),
  publishedAt: z.string().nullable(),
  doi: z.string().nullable(),
  arxivId: z.string().nullable(),
  semanticScholarId: z.string().nullable(),
  openAlexId: z.string().nullable(),
  sourceUrls: z.array(z.string()).default([]),
  pdfUrl: z.string().nullable(),
  venue: z.string().nullable(),
  citationCount: z.number().int().nullable(),
  influentialCitationCount: z.number().int().nullable(),
  source: z.enum(["mock", "arxiv", "semantic_scholar", "openalex", "merged"]),
  fullTextStatus: z
    .enum(["not_checked", "unavailable", "available", "fetched", "parsed", "failed"])
    .optional()
});

const ResearchSourceRunnerSchema = z.enum([
  "mock",
  "arxiv",
  "semantic_scholar",
  "openalex"
]);

const SourceSearchRunnerSchema = z.object({
  sources: z.array(ResearchSourceRunnerSchema).min(1).default(["mock"]),
  maxResults: z.number().int().min(1).max(100).default(20),
  fromYear: z.number().int().min(1900).max(2100).optional(),
  toYear: z.number().int().min(1900).max(2100).optional()
});

export const ProjectResearchRunnerInputSchema = z
  .object({
    idea: ProjectIdeaInputSchema,
    handoffContext: ProjectIdeaHandoffContextSchema.optional(),
    handoffFlagResolutions: z.array(HandoffFlagResolutionSchema).default([]),
    reviewedPapers: z.array(ReviewedPaperSchema).min(1).optional(),
    papers: z.array(NormalizedPaperRunnerSchema).min(1).optional(),
    sourceSearch: SourceSearchRunnerSchema.optional(),
    generatedAt: z.string().trim().min(1).optional()
  })
  .superRefine((value, ctx) => {
    if (!value.reviewedPapers?.length && !value.papers?.length && !value.sourceSearch) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide reviewedPapers, papers, or sourceSearch.",
        path: ["reviewedPapers"]
      });
    }
  });

export type ProjectResearchRunnerInput = z.infer<
  typeof ProjectResearchRunnerInputSchema
>;

export type ProjectResearchRunManifest = {
  runId: string;
  generatedAt: string;
  ideaId: string;
  title: string;
  outputDir: string;
  readyForPrd: boolean;
  readyForArchitecture: boolean;
  prdStatus: "ready" | "blocked";
  architectureStatus: "ready" | "blocked";
  architectureJudgeScore: number;
  architectureJudgeVerdict: "pass" | "needs_review" | "fail";
  handoffReadiness: "ready" | "needs_review" | "blocked" | null;
  handoffReviewFlagCount: number;
  handoffResolvedFlagCount: number;
  handoffUnresolvedFlagCount: number;
  handoffSourceEvidenceQuality: number | null;
  requiredCoveredCount: number;
  requiredBucketCount: number;
  missingRequiredBuckets: string[];
  reviewedPaperCount: number;
  auditScore: number;
  files: {
    manifest: string;
    normalizedIdea: string;
    researchPlan: string;
    coverage: string;
    sourceSearch: string;
    handoffContextJson: string;
    handoffContextMarkdown: string;
    handoffFlagResolutionJson: string;
    handoffFlagResolutionMarkdown: string;
    sourcePapers: string;
    evidenceCollection: string;
    reviewedPapers: string;
    projectResearchBriefJson: string;
    projectResearchBriefMarkdown: string;
    projectPrdJson: string;
    projectPrdMarkdown: string;
    projectArchitectureJson: string;
    projectArchitectureMarkdown: string;
    projectArchitectureJudgeJson: string;
    projectArchitectureJudgeMarkdown: string;
    projectPlanJudgeJson: string;
    projectPlanJudgeMarkdown: string;
    projectPackReadinessJson: string;
    projectPackReadinessMarkdown: string;
  };
};

type RunProjectResearchInput = ProjectResearchRunnerInput & {
  outputDir: string;
};

const artifactFiles = {
  manifest: "manifest.json",
  normalizedIdea: "normalized_idea.json",
  researchPlan: "research_plan.json",
  coverage: "coverage.json",
  sourceSearch: "source_search.json",
  handoffContextJson: "handoff_context.json",
  handoffContextMarkdown: "handoff_context.md",
  handoffFlagResolutionJson: "handoff_flag_resolution.json",
  handoffFlagResolutionMarkdown: "handoff_flag_resolution.md",
  sourcePapers: "source_papers.json",
  evidenceCollection: "evidence_collection.json",
  reviewedPapers: "reviewed_papers.json",
  projectResearchBriefJson: "project_research_brief.json",
  projectResearchBriefMarkdown: "project_research_brief.md",
  projectPrdJson: "project_prd.json",
  projectPrdMarkdown: "project_prd.md",
  projectArchitectureJson: "project_architecture.json",
  projectArchitectureMarkdown: "project_architecture.md",
  projectArchitectureJudgeJson: "project_architecture_judge.json",
  projectArchitectureJudgeMarkdown: "project_architecture_judge.md",
  projectPlanJudgeJson: "project_plan_judge.json",
  projectPlanJudgeMarkdown: "project_plan_judge.md",
  projectPackReadinessJson: "project_pack_readiness.json",
  projectPackReadinessMarkdown: "project_pack_readiness.md"
} as const;

function toJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function handoffContextToMarkdown(
  handoffContext: ProjectResearchRunnerInput["handoffContext"] | undefined
) {
  if (!handoffContext) {
    return [
      "# Idea Handoff Context",
      "",
      "No idea handoff context was provided for this research run."
    ].join("\n");
  }

  return [
    "# Idea Handoff Context",
    "",
    `Idea: ${handoffContext.title}`,
    `Readiness: ${handoffContext.readiness}`,
    `Score: ${handoffContext.score}`,
    `Source evidence quality: ${handoffContext.sourceEvidenceQuality ?? "n/a"}`,
    "",
    "## Review Flags",
    "",
    ...(handoffContext.reviewFlags.length
      ? handoffContext.reviewFlags.map((flag) => `- ${flag}`)
      : ["- none"]),
    "",
    "## Strengths",
    "",
    ...(handoffContext.strengths.length
      ? handoffContext.strengths.map((item) => `- ${item}`)
      : ["- none"]),
    "",
    "## Weaknesses",
    "",
    ...(handoffContext.weaknesses.length
      ? handoffContext.weaknesses.map((item) => `- ${item}`)
      : ["- none"]),
    "",
    "## Required Fixes",
    "",
    ...(handoffContext.requiredFixes.length
      ? handoffContext.requiredFixes.map((item) => `- ${item}`)
      : ["- none"]),
    "",
    "## Research Instruction",
    "",
    handoffContext.readiness === "needs_review"
      ? "Treat the review flags as explicit hypotheses to confirm or reject before relying on this idea in PRD or architecture."
      : handoffContext.readiness === "blocked"
        ? "Do not continue to expensive research until the required fixes are resolved."
        : "Use the context as provenance for why this idea was allowed into research."
  ].join("\n");
}

function normalizeHandoffFlagResolutions(
  handoffContext: ProjectResearchRunnerInput["handoffContext"] | undefined,
  resolutions: ProjectResearchRunnerInput["handoffFlagResolutions"]
) {
  const byFlag = new Map(
    resolutions.map((resolution) => [resolution.reviewFlag, resolution])
  );

  return (handoffContext?.reviewFlags ?? []).map((flag) => {
    const resolution = byFlag.get(flag);

    return {
      reviewFlag: flag,
      status: resolution?.status ?? "unresolved",
      rationale:
        resolution?.rationale ??
        "No explicit research resolution was provided for this handoff review flag.",
      evidenceIds: resolution?.evidenceIds ?? []
    };
  });
}

function handoffFlagResolutionToMarkdown(
  resolutions: ReturnType<typeof normalizeHandoffFlagResolutions>
) {
  return [
    "# Handoff flag resolution",
    "",
    resolutions.length
      ? "Every review flag from idea discovery must be confirmed, rejected, replaced by stronger evidence, or left explicitly unresolved."
      : "No handoff review flags were provided for this research run.",
    "",
    "## Decisions",
    "",
    ...(resolutions.length
      ? resolutions.flatMap((resolution) => [
          `### ${resolution.reviewFlag}`,
          "",
          `- Status: ${resolution.status}`,
          `- Rationale: ${resolution.rationale}`,
          `- Evidence IDs: ${resolution.evidenceIds.join(", ") || "none"}`,
          ""
        ])
      : ["- none"])
  ].join("\n");
}

function createManifest(
  brief: ProjectResearchBrief,
  prdStatus: "ready" | "blocked",
  architectureStatus: "ready" | "blocked",
  architectureJudgeScore: number,
  architectureJudgeVerdict: "pass" | "needs_review" | "fail",
  outputDir: string,
  handoffContext: ProjectResearchRunnerInput["handoffContext"] | undefined,
  handoffFlagResolutions: ReturnType<typeof normalizeHandoffFlagResolutions>
): ProjectResearchRunManifest {
  const resolvedStatuses = new Set([
    "confirmed",
    "rejected",
    "replaced_by_stronger_evidence"
  ]);

  return {
    runId: brief.id,
    generatedAt: brief.generatedAt,
    ideaId: brief.normalizedIdea.ideaId,
    title: brief.normalizedIdea.title,
    outputDir,
    readyForPrd: brief.readyForPrd,
    readyForArchitecture: brief.readyForArchitecture,
    prdStatus,
    architectureStatus,
    architectureJudgeScore,
    architectureJudgeVerdict,
    handoffReadiness: handoffContext?.readiness ?? null,
    handoffReviewFlagCount: handoffContext?.reviewFlags.length ?? 0,
    handoffResolvedFlagCount: handoffFlagResolutions.filter((resolution) =>
      resolvedStatuses.has(resolution.status)
    ).length,
    handoffUnresolvedFlagCount: handoffFlagResolutions.filter(
      (resolution) => resolution.status === "unresolved"
    ).length,
    handoffSourceEvidenceQuality: handoffContext?.sourceEvidenceQuality ?? null,
    requiredCoveredCount: brief.evidenceCoverage.requiredCoveredCount,
    requiredBucketCount: brief.evidenceCoverage.requiredBucketCount,
    missingRequiredBuckets: brief.evidenceCoverage.missingRequiredBuckets,
    reviewedPaperCount: brief.reviewedPapers.length,
    auditScore: brief.audit.score,
    files: artifactFiles
  };
}

function projectPackReadinessToMarkdown(readiness: ReturnType<typeof generateProjectPack>["readiness"]) {
  return [
    "# Project Pack Readiness",
    "",
    `Score: ${readiness.score}/100`,
    `Verdict: ${readiness.verdict}`,
    `Project Plan Judge: ${readiness.planJudge.score}/100 (${readiness.planJudge.verdict})`,
    `GPT baseline status: ${readiness.planJudge.gptBaselineComparison.status}`,
    `Artifacts: ${readiness.artifactCount}`,
    `Required artifact coverage: ${(readiness.requiredArtifactCoverage * 100).toFixed(1)}%`,
    `Cursor ready: ${readiness.cursorReady ? "yes" : "no"}`,
    `Starter code ready: ${readiness.starterCodeReady ? "yes" : "no"}`,
    "",
    "## Strengths",
    "",
    ...readiness.strengths.map((strength) => `- ${strength}`),
    "",
    "## Weaknesses",
    "",
    ...(readiness.weaknesses.length
      ? readiness.weaknesses.map((weakness) => `- ${weakness}`)
      : ["- none"]),
    "",
    "## Required Fixes",
    "",
    ...(readiness.requiredFixes.length
      ? readiness.requiredFixes.map((fix) => `- ${fix}`)
      : ["- none"])
  ].join("\n");
}

function projectPlanJudgeToMarkdown(readiness: ReturnType<typeof generateProjectPack>["readiness"]) {
  const judge = readiness.planJudge;

  return [
    "# Project Plan Judge",
    "",
    `Score: ${judge.score}/100`,
    `Verdict: ${judge.verdict}`,
    `GPT baseline status: ${judge.gptBaselineComparison.status}`,
    "",
    "## Dimension Scores",
    "",
    ...Object.entries(judge.dimensionScores).map(
      ([name, score]) => `- ${name}: ${score}/100`
    ),
    "",
    "## Strengths",
    "",
    ...(judge.strengths.length ? judge.strengths.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Weaknesses",
    "",
    ...(judge.weaknesses.length ? judge.weaknesses.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Required Fixes",
    "",
    ...(judge.requiredFixes.length
      ? judge.requiredFixes.map((item) => `- ${item}`)
      : ["- none"]),
    "",
    "## Better Than GPT Baseline",
    "",
    ...judge.gptBaselineComparison.betterThanGpt.map((item) => `- ${item}`),
    "",
    "## Still Behind GPT Baseline",
    "",
    ...judge.gptBaselineComparison.stillBehindGpt.map((item) => `- ${item}`)
  ].join("\n");
}

async function writeProjectPackArtifacts(
  outputDir: string,
  pack: ReturnType<typeof generateProjectPack>
) {
  const packDir = join(outputDir, "project_pack");
  await Promise.all(
    pack.artifacts.map(async (artifact) => {
      const artifactPath = join(packDir, artifact.path);
      await mkdir(dirname(artifactPath), { recursive: true });
      await writeFile(artifactPath, artifact.content, "utf8");
    })
  );
}

export function parseProjectResearchRunnerInput(
  value: unknown
): ProjectResearchRunnerInput {
  return ProjectResearchRunnerInputSchema.parse(value);
}

export async function runProjectResearch(
  input: RunProjectResearchInput
): Promise<ProjectResearchRunManifest> {
  const parsed = parseProjectResearchRunnerInput(input);
  const outputDir = input.outputDir;
  const planResult = buildProjectResearchPlan(parsed.idea);
  const sourceSearchResult = parsed.sourceSearch
    ? await searchAllSources({
        query: parsed.idea.title,
        queryVariants: planResult.researchPlan.queryVariants,
        maxResults: parsed.sourceSearch.maxResults,
        fromYear: parsed.sourceSearch.fromYear,
        toYear: parsed.sourceSearch.toYear,
        sources: parsed.sourceSearch.sources as ResearchSource[]
      })
    : null;
  const sourcePapers = sourceSearchResult?.papers ?? null;
  const evidenceCollection = parsed.reviewedPapers
    ? {
        mode: "manual_reviewed_papers" as const,
        reviewedPaperCount: parsed.reviewedPapers.length
      }
    : {
        mode: sourcePapers ? "collected_from_source_search" as const : "collected_from_papers" as const,
        ...collectProjectEvidenceFromPapers({
          researchPlan: planResult.researchPlan,
          papers: (parsed.papers ?? sourcePapers) as NormalizedPaper[]
        })
      };
  const reviewedPapers = parsed.reviewedPapers ?? (
    evidenceCollection as EvidenceCollectionResult & {
      mode: "collected_from_papers";
    }
  ).reviewedPapers;
  const brief = buildProjectResearchBrief({
    idea: parsed.idea,
    reviewedPapers,
    generatedAt: parsed.generatedAt
  });
  const prd = generateProjectPrd({
    brief,
    generatedAt: parsed.generatedAt
  });
  const architecture = generateProjectArchitecture({
    prd,
    brief,
    generatedAt: parsed.generatedAt
  });
  const architectureJudge = judgeProjectArchitecture({
    architecture,
    prd,
    brief
  });
  const handoffFlagResolutions = normalizeHandoffFlagResolutions(
    parsed.handoffContext,
    parsed.handoffFlagResolutions
  );
  const projectPack = generateProjectPack({
    brief,
    prd,
    architecture,
    architectureJudge,
    handoffContext: parsed.handoffContext,
    handoffFlagResolutions
  });
  const manifest = createManifest(
    brief,
    prd.status,
    architecture.status,
    architectureJudge.score,
    architectureJudge.verdict,
    outputDir,
    parsed.handoffContext,
    handoffFlagResolutions
  );

  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(join(outputDir, artifactFiles.normalizedIdea), toJson(brief.normalizedIdea), "utf8"),
    writeFile(join(outputDir, artifactFiles.researchPlan), toJson(brief.researchPlan), "utf8"),
    writeFile(join(outputDir, artifactFiles.coverage), toJson(brief.evidenceCoverage), "utf8"),
    writeFile(
      join(outputDir, artifactFiles.sourceSearch),
      toJson(
        sourceSearchResult
          ? {
              mode: "source_search",
              sourcesUsed: sourceSearchResult.sourcesUsed,
              warnings: sourceSearchResult.warnings,
              sourceDiagnostics: sourceSearchResult.sourceDiagnostics,
              queryVariants: planResult.researchPlan.queryVariants,
              totalFound: sourceSearchResult.papers.length
            }
          : { mode: "not_used" }
      ),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.handoffContextJson),
      toJson(parsed.handoffContext ?? null),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.handoffContextMarkdown),
      handoffContextToMarkdown(parsed.handoffContext),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.handoffFlagResolutionJson),
      toJson(handoffFlagResolutions),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.handoffFlagResolutionMarkdown),
      handoffFlagResolutionToMarkdown(handoffFlagResolutions),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.sourcePapers),
      toJson(sourcePapers ?? []),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.evidenceCollection),
      toJson(evidenceCollection),
      "utf8"
    ),
    writeFile(join(outputDir, artifactFiles.reviewedPapers), toJson(brief.reviewedPapers), "utf8"),
    writeFile(
      join(outputDir, artifactFiles.projectResearchBriefJson),
      toJson(brief),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.projectResearchBriefMarkdown),
      projectResearchBriefToMarkdown(brief),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.projectPrdJson),
      toJson(prd),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.projectPrdMarkdown),
      projectPrdToMarkdown(prd),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.projectArchitectureJson),
      toJson(architecture),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.projectArchitectureMarkdown),
      projectArchitectureToMarkdown(architecture),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.projectArchitectureJudgeJson),
      toJson(architectureJudge),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.projectArchitectureJudgeMarkdown),
      projectArchitectureJudgeToMarkdown(architectureJudge),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.projectPlanJudgeJson),
      toJson(projectPack.readiness.planJudge),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.projectPlanJudgeMarkdown),
      projectPlanJudgeToMarkdown(projectPack.readiness),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.projectPackReadinessJson),
      toJson(projectPack.readiness),
      "utf8"
    ),
    writeFile(
      join(outputDir, artifactFiles.projectPackReadinessMarkdown),
      projectPackReadinessToMarkdown(projectPack.readiness),
      "utf8"
    )
  ]);
  await writeProjectPackArtifacts(outputDir, projectPack);
  await writeFile(join(outputDir, artifactFiles.manifest), toJson(manifest), "utf8");

  return manifest;
}

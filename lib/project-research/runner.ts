import {
  generateProjectArchitecture,
  projectArchitectureToMarkdown
} from "@/lib/project-architecture";
import {
  generateProjectPrd,
  projectPrdToMarkdown
} from "@/lib/project-prd";
import { projectResearchBriefToMarkdown } from "@/lib/project-research/markdown";
import { buildProjectResearchBrief } from "@/lib/project-research/briefBuilder";
import {
  collectProjectEvidenceFromPapers,
  type EvidenceCollectionResult
} from "@/lib/project-research/evidenceCollector";
import { buildProjectResearchPlan } from "@/lib/project-research/researchPlan";
import {
  ProjectIdeaInputSchema,
  ReviewedPaperSchema
} from "@/lib/project-research/schemas";
import { searchAllSources } from "@/lib/sources";
import type { ProjectResearchBrief } from "@/lib/project-research/types";
import type { NormalizedPaper, ResearchSource } from "@/lib/sources/types";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
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
    sourcePapers: string;
    evidenceCollection: string;
    reviewedPapers: string;
    projectResearchBriefJson: string;
    projectResearchBriefMarkdown: string;
    projectPrdJson: string;
    projectPrdMarkdown: string;
    projectArchitectureJson: string;
    projectArchitectureMarkdown: string;
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
  sourcePapers: "source_papers.json",
  evidenceCollection: "evidence_collection.json",
  reviewedPapers: "reviewed_papers.json",
  projectResearchBriefJson: "project_research_brief.json",
  projectResearchBriefMarkdown: "project_research_brief.md",
  projectPrdJson: "project_prd.json",
  projectPrdMarkdown: "project_prd.md",
  projectArchitectureJson: "project_architecture.json",
  projectArchitectureMarkdown: "project_architecture.md"
} as const;

function toJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function createManifest(
  brief: ProjectResearchBrief,
  prdStatus: "ready" | "blocked",
  architectureStatus: "ready" | "blocked",
  outputDir: string
): ProjectResearchRunManifest {
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
    requiredCoveredCount: brief.evidenceCoverage.requiredCoveredCount,
    requiredBucketCount: brief.evidenceCoverage.requiredBucketCount,
    missingRequiredBuckets: brief.evidenceCoverage.missingRequiredBuckets,
    reviewedPaperCount: brief.reviewedPapers.length,
    auditScore: brief.audit.score,
    files: artifactFiles
  };
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
  const manifest = createManifest(
    brief,
    prd.status,
    architecture.status,
    outputDir
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
    )
  ]);
  await writeFile(join(outputDir, artifactFiles.manifest), toJson(manifest), "utf8");

  return manifest;
}

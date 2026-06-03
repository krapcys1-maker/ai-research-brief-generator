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
import type { ProjectResearchBrief } from "@/lib/project-research/types";
import type { NormalizedPaper } from "@/lib/sources/types";
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

export const ProjectResearchRunnerInputSchema = z
  .object({
    idea: ProjectIdeaInputSchema,
    reviewedPapers: z.array(ReviewedPaperSchema).min(1).optional(),
    papers: z.array(NormalizedPaperRunnerSchema).min(1).optional(),
    generatedAt: z.string().trim().min(1).optional()
  })
  .superRefine((value, ctx) => {
    if (!value.reviewedPapers?.length && !value.papers?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide reviewedPapers or papers.",
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
    evidenceCollection: string;
    reviewedPapers: string;
    projectResearchBriefJson: string;
    projectResearchBriefMarkdown: string;
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
  evidenceCollection: "evidence_collection.json",
  reviewedPapers: "reviewed_papers.json",
  projectResearchBriefJson: "project_research_brief.json",
  projectResearchBriefMarkdown: "project_research_brief.md"
} as const;

function toJson(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function createManifest(
  brief: ProjectResearchBrief,
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
  const evidenceCollection = parsed.reviewedPapers
    ? {
        mode: "manual_reviewed_papers" as const,
        reviewedPaperCount: parsed.reviewedPapers.length
      }
    : {
        mode: "collected_from_papers" as const,
        ...collectProjectEvidenceFromPapers({
          researchPlan: buildProjectResearchPlan(parsed.idea).researchPlan,
          papers: parsed.papers as NormalizedPaper[]
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
  const manifest = createManifest(brief, outputDir);

  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(join(outputDir, artifactFiles.normalizedIdea), toJson(brief.normalizedIdea), "utf8"),
    writeFile(join(outputDir, artifactFiles.researchPlan), toJson(brief.researchPlan), "utf8"),
    writeFile(join(outputDir, artifactFiles.coverage), toJson(brief.evidenceCoverage), "utf8"),
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
    )
  ]);
  await writeFile(join(outputDir, artifactFiles.manifest), toJson(manifest), "utf8");

  return manifest;
}

import { projectResearchBriefToMarkdown } from "@/lib/project-research/markdown";
import { buildProjectResearchBrief } from "@/lib/project-research/briefBuilder";
import {
  ProjectIdeaInputSchema,
  ReviewedPaperSchema
} from "@/lib/project-research/schemas";
import type {
  ProjectResearchBrief
} from "@/lib/project-research/types";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

export const ProjectResearchRunnerInputSchema = z.object({
  idea: ProjectIdeaInputSchema,
  reviewedPapers: z.array(ReviewedPaperSchema).min(1),
  generatedAt: z.string().trim().min(1).optional()
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
  const brief = buildProjectResearchBrief({
    idea: parsed.idea,
    reviewedPapers: parsed.reviewedPapers,
    generatedAt: parsed.generatedAt
  });
  const manifest = createManifest(brief, outputDir);

  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(join(outputDir, artifactFiles.normalizedIdea), toJson(brief.normalizedIdea), "utf8"),
    writeFile(join(outputDir, artifactFiles.researchPlan), toJson(brief.researchPlan), "utf8"),
    writeFile(join(outputDir, artifactFiles.coverage), toJson(brief.evidenceCoverage), "utf8"),
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

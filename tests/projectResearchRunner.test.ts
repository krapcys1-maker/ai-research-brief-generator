import { describe, expect, it } from "vitest";
import {
  buildProjectResearchPlan,
  runProjectResearch
} from "@/lib/project-research";
import { ProjectResearchBriefSchema } from "@/lib/project-research/schemas";
import type {
  ProjectIdeaInput,
  ProjectResearchRunManifest,
  ReviewedPaper
} from "@/lib/project-research";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

function paperForBucket(bucketId: string, index: number): ReviewedPaper {
  return {
    paperId: `runner_${bucketId}_${index}`,
    title: `Runner evidence for ${bucketId} ${index}`,
    year: 2025,
    url: `https://example.com/runner/${bucketId}/${index}`,
    doi: null,
    bucketIds: [bucketId],
    fullTextStatus: "parsed",
    usefulForProject: true,
    evidenceStrength: "full_text_partial",
    keyMethods: [`method for ${bucketId}`],
    limitations: [`limitation for ${bucketId}`],
    implementationImplications: [`use ${bucketId} as project evidence`],
    riskImplications: [`risk from ${bucketId}`]
  };
}

function papersForRequiredBuckets(idea: ProjectIdeaInput) {
  const { researchPlan } = buildProjectResearchPlan(idea);
  return researchPlan.evidenceBuckets.flatMap((bucket) => [
    paperForBucket(bucket.id, 1),
    paperForBucket(bucket.id, 2)
  ]);
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

const tradingIdea: ProjectIdeaInput = {
  title: "AI Trading Bot",
  description:
    "Bot tradingowy na gieldzie uzywajacy AI, backtestow i kontroli ryzyka.",
  constraints: ["najpierw paper trading"],
  preferredDomains: ["algorithmic trading"],
  outputLanguage: "pl"
};

describe("runProjectResearch", () => {
  it("writes a complete ready project research artifact set", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "project-research-ready-"));

    const manifest = await runProjectResearch({
      idea: tradingIdea,
      reviewedPapers: papersForRequiredBuckets(tradingIdea),
      generatedAt: "2026-06-03T13:00:00.000Z",
      outputDir
    });

    const manifestFromDisk = await readJson<ProjectResearchRunManifest>(
      join(outputDir, "manifest.json")
    );
    const brief = await readJson<unknown>(
      join(outputDir, "project_research_brief.json")
    );
    const markdown = await readFile(
      join(outputDir, "project_research_brief.md"),
      "utf8"
    );

    expect(manifestFromDisk).toEqual(manifest);
    expect(ProjectResearchBriefSchema.parse(brief).readyForArchitecture).toBe(
      true
    );
    expect(manifest.files).toEqual({
      manifest: "manifest.json",
      normalizedIdea: "normalized_idea.json",
      researchPlan: "research_plan.json",
      coverage: "coverage.json",
      reviewedPapers: "reviewed_papers.json",
      projectResearchBriefJson: "project_research_brief.json",
      projectResearchBriefMarkdown: "project_research_brief.md"
    });
    expect(manifest.requiredCoveredCount).toBe(manifest.requiredBucketCount);
    expect(markdown).toContain("## Research Plan");
    expect(markdown).toContain("## Audit");
  });

  it("writes blocked artifacts when required evidence is missing", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "project-research-blocked-"));
    const { researchPlan } = buildProjectResearchPlan(tradingIdea);

    const manifest = await runProjectResearch({
      idea: tradingIdea,
      reviewedPapers: [
        paperForBucket(researchPlan.evidenceBuckets[0].id, 1),
        paperForBucket(researchPlan.evidenceBuckets[0].id, 2)
      ],
      generatedAt: "2026-06-03T13:00:00.000Z",
      outputDir
    });

    const coverage = await readJson<{
      canSynthesizeProject: boolean;
      missingRequiredBuckets: string[];
    }>(join(outputDir, "coverage.json"));

    expect(manifest.readyForArchitecture).toBe(false);
    expect(coverage.canSynthesizeProject).toBe(false);
    expect(coverage.missingRequiredBuckets.length).toBeGreaterThan(0);
  });
});

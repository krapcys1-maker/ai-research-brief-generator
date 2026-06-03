import { describe, expect, it } from "vitest";
import {
  ProjectArchitectureSchema
} from "@/lib/project-architecture";
import {
  ProjectPrdSchema
} from "@/lib/project-prd";
import {
  buildProjectResearchPlan,
  runProjectResearch
} from "@/lib/project-research";
import { ProjectResearchBriefSchema } from "@/lib/project-research/schemas";
import type {
  EvidenceBucket,
  ProjectIdeaInput,
  ProjectResearchRunManifest,
  ReviewedPaper
} from "@/lib/project-research";
import type { NormalizedPaper } from "@/lib/sources/types";
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
    implementationImplications: [
      `use ${bucketId} as trading risk and backtest architecture evidence`
    ],
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

function normalizedPaperForBucket(
  bucket: EvidenceBucket,
  index: number
): NormalizedPaper {
  return {
    id: `runner_source_${bucket.id}_${index}`,
    title: `${bucket.label} ${bucket.keywords.join(" ")} source ${index}`,
    abstract: `${bucket.query}. ${bucket.targetQuestions.join(" ")}`,
    authors: ["Runner Source Author"],
    year: 2025,
    publishedAt: "2025-01-01",
    doi: `10.1000/runner.${bucket.id}.${index}`,
    arxivId: null,
    semanticScholarId: `runner-${bucket.id}-${index}`,
    openAlexId: null,
    sourceUrls: [`https://example.com/source/${bucket.id}/${index}`],
    pdfUrl: `https://example.com/source/${bucket.id}/${index}.pdf`,
    venue: "Runner Source Venue",
    citationCount: 100,
    influentialCitationCount: 12,
    source: "semantic_scholar",
    fullTextStatus: "parsed"
  };
}

function normalizedPapersForRequiredBuckets(idea: ProjectIdeaInput) {
  const { researchPlan } = buildProjectResearchPlan(idea);
  return researchPlan.evidenceBuckets.flatMap((bucket) => [
    normalizedPaperForBucket(bucket, 1),
    normalizedPaperForBucket(bucket, 2)
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
      sourceSearch: "source_search.json",
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
      projectArchitectureJudgeMarkdown: "project_architecture_judge.md"
    });
    expect(manifest.requiredCoveredCount).toBe(manifest.requiredBucketCount);
    expect(manifest.prdStatus).toBe("ready");
    expect(manifest.architectureStatus).toBe("ready");
    expect(manifest.architectureJudgeVerdict).toBe("pass");
    expect(manifest.architectureJudgeScore).toBeGreaterThanOrEqual(90);
    expect(markdown).toContain("## Research Plan");
    expect(markdown).toContain("## Audit");

    const prd = await readJson<unknown>(join(outputDir, "project_prd.json"));
    const architecture = await readJson<unknown>(
      join(outputDir, "project_architecture.json")
    );
    const architectureJudge = await readJson<{ verdict: string; score: number }>(
      join(outputDir, "project_architecture_judge.json")
    );

    expect(ProjectPrdSchema.parse(prd).status).toBe("ready");
    expect(ProjectArchitectureSchema.parse(architecture).status).toBe("ready");
    expect(architectureJudge.verdict).toBe("pass");
    expect(architectureJudge.score).toBeGreaterThanOrEqual(90);
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
    expect(manifest.prdStatus).toBe("blocked");
    expect(manifest.architectureStatus).toBe("blocked");
    expect(manifest.architectureJudgeVerdict).toBe("needs_review");
    expect(coverage.canSynthesizeProject).toBe(false);
    expect(coverage.missingRequiredBuckets.length).toBeGreaterThan(0);

    const prd = await readJson<unknown>(join(outputDir, "project_prd.json"));
    const architecture = await readJson<unknown>(
      join(outputDir, "project_architecture.json")
    );

    expect(ProjectPrdSchema.parse(prd).status).toBe("blocked");
    expect(ProjectArchitectureSchema.parse(architecture).status).toBe("blocked");
  });

  it("collects evidence from normalized papers before writing artifacts", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "project-research-papers-"));

    const manifest = await runProjectResearch({
      idea: tradingIdea,
      papers: normalizedPapersForRequiredBuckets(tradingIdea),
      generatedAt: "2026-06-03T13:00:00.000Z",
      outputDir
    });

    const evidenceCollection = await readJson<{
      mode: string;
      canBuildReadyBrief: boolean;
      bucketMetrics: unknown[];
    }>(join(outputDir, "evidence_collection.json"));
    const reviewedPapers = await readJson<ReviewedPaper[]>(
      join(outputDir, "reviewed_papers.json")
    );

    expect(manifest.readyForArchitecture).toBe(true);
    expect(evidenceCollection.mode).toBe("collected_from_papers");
    expect(evidenceCollection.canBuildReadyBrief).toBe(true);
    expect(evidenceCollection.bucketMetrics.length).toBe(
      manifest.requiredBucketCount
    );
    expect(reviewedPapers.length).toBeGreaterThanOrEqual(
      manifest.requiredBucketCount
    );
  });

  it("searches configured sources before collecting evidence", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "project-research-search-"));

    const manifest = await runProjectResearch({
      idea: {
        title: "Medical RAG Assistant",
        description:
          "Healthcare AI assistant that retrieves clinical documents and supports diagnostic review.",
        constraints: ["nie stawia samodzielnej diagnozy"],
        preferredDomains: [],
        outputLanguage: "pl"
      },
      sourceSearch: {
        sources: ["mock"],
        maxResults: 20
      },
      generatedAt: "2026-06-03T13:00:00.000Z",
      outputDir
    });

    const sourceSearch = await readJson<{
      mode: string;
      totalFound: number;
      queryVariants: string[];
      sourcesUsed: string[];
    }>(join(outputDir, "source_search.json"));
    const sourcePapers = await readJson<NormalizedPaper[]>(
      join(outputDir, "source_papers.json")
    );
    const evidenceCollection = await readJson<{
      mode: string;
      bucketMetrics: unknown[];
    }>(join(outputDir, "evidence_collection.json"));

    expect(sourceSearch.mode).toBe("source_search");
    expect(sourceSearch.sourcesUsed).toContain("mock");
    expect(sourceSearch.totalFound).toBeGreaterThan(0);
    expect(sourceSearch.queryVariants.length).toBeGreaterThan(1);
    expect(sourcePapers.length).toBe(sourceSearch.totalFound);
    expect(evidenceCollection.mode).toBe("collected_from_source_search");
    expect(evidenceCollection.bucketMetrics.length).toBe(
      manifest.requiredBucketCount
    );
  });
});

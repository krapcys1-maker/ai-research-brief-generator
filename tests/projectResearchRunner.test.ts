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

const repoMriIdea: ProjectIdeaInput = {
  title: "Repo MRI",
  description:
    "Developer tool that turns a repository into an explainable code map with files, symbols, imports, calls, tests and a Bug Path mode from issue or stacktrace to likely files, symbols, tests and hypotheses.",
  constraints: [
    "do not build a generic chat with repo",
    "deterministic index and code knowledge graph before LLM summaries",
    "MVP must show evidence, line ranges, confidence and unknowns"
  ],
  preferredDomains: ["software engineering", "static analysis", "code intelligence"],
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
      handoffContextJson: "handoff_context.json",
      handoffContextMarkdown: "handoff_context.md",
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

    const projectPackReadiness = await readJson<{
      verdict: string;
      score: number;
      cursorReady: boolean;
      requiredArtifactCoverage: number;
      planJudge: {
        verdict: string;
        score: number;
        gptBaselineComparison: {
          status: string;
        };
      };
    }>(join(outputDir, "project_pack_readiness.json"));
    const projectPlanJudge = await readJson<{
      verdict: string;
      score: number;
    }>(join(outputDir, "project_plan_judge.json"));
    const projectPackReadme = await readFile(
      join(outputDir, "project_pack", "README.md"),
      "utf8"
    );
    const cursorRule = await readFile(
      join(
        outputDir,
        "project_pack",
        ".cursor",
        "rules",
        "000-project-core.mdc"
      ),
      "utf8"
    );

    expect(projectPackReadiness.verdict).toBe("needs_review");
    expect(projectPackReadiness.score).toBeGreaterThanOrEqual(90);
    expect(projectPackReadiness.cursorReady).toBe(true);
    expect(projectPackReadiness.requiredArtifactCoverage).toBe(1);
    expect(projectPackReadiness.planJudge.verdict).toBe("pass");
    expect(projectPackReadiness.planJudge.score).toBeGreaterThanOrEqual(90);
    expect(projectPackReadiness.planJudge.gptBaselineComparison.status).toBe(
      "beats_plan_floor"
    );
    expect(projectPlanJudge.verdict).toBe("pass");
    expect(projectPackReadme).toContain("Cursor-ready");
    expect(cursorRule).toContain("Non-negotiables");
  });

  it("writes idea handoff review context into research artifacts", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "project-research-handoff-"));

    const manifest = await runProjectResearch({
      idea: repoMriIdea,
      handoffContext: {
        ideaId: "idea_repo_mri",
        title: repoMriIdea.title,
        readiness: "needs_review",
        score: 93,
        sourceEvidenceQuality: 0.48,
        reviewFlags: [
          "Manual review: single-source idea has weak issue-level evidence."
        ],
        strengths: ["ProjectIdeaInput schema is valid."],
        weaknesses: ["Source evidence quality is weak; verify source fit before research."],
        requiredFixes: []
      },
      reviewedPapers: papersForRequiredBuckets(repoMriIdea),
      generatedAt: "2026-06-03T13:30:00.000Z",
      outputDir
    });

    const handoffJson = await readJson<{
      readiness: string;
      reviewFlags: string[];
      sourceEvidenceQuality: number;
    }>(join(outputDir, "handoff_context.json"));
    const handoffMarkdown = await readFile(
      join(outputDir, "handoff_context.md"),
      "utf8"
    );
    const manifestFromDisk = await readJson<ProjectResearchRunManifest>(
      join(outputDir, "manifest.json")
    );

    expect(manifest.handoffReadiness).toBe("needs_review");
    expect(manifest.handoffReviewFlagCount).toBe(1);
    expect(manifest.handoffSourceEvidenceQuality).toBe(0.48);
    expect(manifestFromDisk).toEqual(manifest);
    expect(handoffJson.readiness).toBe("needs_review");
    expect(handoffJson.reviewFlags).toContain(
      "Manual review: single-source idea has weak issue-level evidence."
    );
    expect(handoffMarkdown).toContain("Treat the review flags as explicit hypotheses");
    expect(handoffMarkdown).toContain("Source evidence quality: 0.48");
  });

  it("generates runnable Repo MRI starter code artifacts", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "project-research-repo-mri-"));

    await runProjectResearch({
      idea: repoMriIdea,
      reviewedPapers: papersForRequiredBuckets(repoMriIdea),
      generatedAt: "2026-06-03T13:00:00.000Z",
      outputDir
    });

    const projectPackReadiness = await readJson<{
      verdict: string;
      score: number;
      starterCodeReady: boolean;
      planJudge: {
        verdict: string;
        score: number;
      };
    }>(join(outputDir, "project_pack_readiness.json"));
    const makefile = await readFile(
      join(outputDir, "project_pack", "Makefile"),
      "utf8"
    );
    const indexerTest = await readFile(
      join(
        outputDir,
        "project_pack",
        "services",
        "indexer",
        "tests",
        "test_indexer.py"
      ),
      "utf8"
    );
    const bugPath = await readFile(
      join(
        outputDir,
        "project_pack",
        "services",
        "indexer",
        "repo_mri_indexer",
        "bug_path.py"
      ),
      "utf8"
    );

    expect(projectPackReadiness.verdict).toBe("pass");
    expect(projectPackReadiness.score).toBe(100);
    expect(projectPackReadiness.starterCodeReady).toBe(true);
    expect(projectPackReadiness.planJudge.verdict).toBe("pass");
    expect(projectPackReadiness.planJudge.score).toBe(100);
    expect(makefile).toContain("bug-path-fixture");
    expect(indexerTest).toContain("test_index_search_and_bug_path");
    expect(indexerTest).toContain("test_scanner_ignores_secret_files");
    expect(bugPath).toContain("confidence");
    expect(bugPath).toContain("next_actions");
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

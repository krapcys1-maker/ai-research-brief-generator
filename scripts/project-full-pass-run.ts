import {
  ProjectIdeaLiveBatchSamplerInputSchema,
  runControlledLiveBatchSampling
} from "@/lib/project-ideas";
import { runProjectIdeaDiscovery } from "@/lib/project-ideas/runner";
import type { IdeaDiscoveryReport } from "@/lib/project-ideas/types";
import { buildProjectResearchPlan, runProjectResearch } from "@/lib/project-research";
import type { ProjectIdeaInput } from "@/lib/project-research";
import { collectProjectEvidenceFromPapers } from "@/lib/project-research/evidenceCollector";
import { ingestFullTextForPapers } from "@/lib/fulltext/ingest";
import { dedupePapers } from "@/lib/pipeline/dedupe";
import { searchAllSources } from "@/lib/sources";
import type { NormalizedPaper, ResearchSource } from "@/lib/sources/types";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { loadEnvFile } from "node:process";

type CliArgs = {
  outputDir: string;
  startDate: string;
  endDate?: string;
  maxRepos: number;
  maxBytesBilled: number;
  maxPapers: number;
  fullTextLimit: number;
  minParsedPapers: number;
  iterations: number;
};

type ResearchIteration = {
  iteration: number;
  queryVariantCount: number;
  rawPaperCount: number;
  dedupedPaperCount: number;
  candidatePaperCount: number;
  attemptedFullTextCount: number;
  parsedFullTextCount: number;
  savedPdfCount: number;
  requiredCoveredCount: number;
  requiredBucketCount: number;
  missingRequiredBuckets: string[];
  requiredBucketsWithoutParsedFullText: string[];
  architectureJudgeScore: number;
  architectureJudgeVerdict: string;
  notes: string[];
};

type CoverageArtifact = {
  buckets: Array<{
    bucketId: string;
    status: "covered" | "partial" | "missing";
    parsedCount: number;
  }>;
};

const DEFAULT_OUTPUT_DIR = join(
  "D:",
  "projekty moje",
  "pipline pomysl plus archiotektura",
  "testy",
  "uczciwy_pelny_przelot_2026-06-04"
);

const RESEARCH_SOURCES: ResearchSource[] = ["arxiv", "semantic_scholar", "openalex"];

function parseArgs(argv: string[]): CliArgs {
  const get = (name: string) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  return {
    outputDir: resolve(get("--out") ?? DEFAULT_OUTPUT_DIR),
    startDate: get("--start-date") ?? "2026-06-01",
    endDate: get("--end-date"),
    maxRepos: Number(get("--max-repos") ?? 10),
    maxBytesBilled: Number(get("--max-bytes-billed") ?? 500_000_000),
    maxPapers: Number(get("--max-papers") ?? 72),
    fullTextLimit: Number(get("--fulltext-limit") ?? 12),
    minParsedPapers: Number(get("--min-parsed-papers") ?? 3),
    iterations: Number(get("--iterations") ?? 3)
  };
}

function findBareGithubTokenInEnvText(content: string) {
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

function loadEnv() {
  try {
    loadEnvFile();
  } catch {
    // Optional in dry runs and tests.
  }

  if (!process.env.GITHUB_TOKEN && existsSync(".env")) {
    const token = findBareGithubTokenInEnvText(readFileSync(".env", "utf8"));
    if (token) {
      process.env.GITHUB_TOKEN = token;
    }
  }
}

async function writeJson(path: string, value: unknown) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function safeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function paperText(paper: NormalizedPaper) {
  return [paper.title, paper.abstract, paper.venue].filter(Boolean).join(" ");
}

function addFocusedQueries(input: {
  baseQueries: string[];
  idea: ProjectIdeaInput;
  missingBuckets: string[];
}) {
  const plan = buildProjectResearchPlan(input.idea).researchPlan;
  const missingQueries = plan.evidenceBuckets
    .filter((bucket) => input.missingBuckets.includes(bucket.id))
    .flatMap((bucket) => [
      bucket.query,
      `${input.idea.title} ${bucket.keywords.slice(0, 5).join(" ")}`
    ]);

  return Array.from(new Set([...input.baseQueries, ...missingQueries]));
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

function chooseIdea(report: IdeaDiscoveryReport) {
  const scoreById = new Map(report.ideaScores.map((score) => [score.ideaId, score]));
  const handoffById = new Map(
    report.projectIdeaHandoffQuality.map((quality) => [quality.ideaId, quality])
  );

  return report.shortlist
    .map((idea, index) => ({
      idea,
      projectIdeaInput: report.projectIdeaInputs[index],
      score: scoreById.get(idea.ideaId),
      handoff: handoffById.get(idea.ideaId)
    }))
    .filter((candidate) => candidate.projectIdeaInput)
    .sort((left, right) => {
      const leftReady = left.handoff?.readiness === "ready" ? 1 : 0;
      const rightReady = right.handoff?.readiness === "ready" ? 1 : 0;
      return (
        rightReady - leftReady ||
        (right.handoff?.score ?? 0) - (left.handoff?.score ?? 0) ||
        (right.score?.total ?? 0) - (left.score?.total ?? 0)
      );
    })[0];
}

async function searchAndIngestIteration(input: {
  idea: ProjectIdeaInput;
  outputDir: string;
  iteration: number;
  queryVariants: string[];
  maxPapers: number;
  fullTextLimit: number;
  generatedAt: string;
}) {
  const iterationDir = join(input.outputDir, `04_research_iteration_${input.iteration}`);
  const pdfDir = join(iterationDir, "pdfs");
  await mkdir(pdfDir, { recursive: true });

  const plan = buildProjectResearchPlan(input.idea).researchPlan;
  const sourceSearch = await searchAllSources({
    query: input.idea.title,
    queryVariants: input.queryVariants,
    maxResults: Math.max(8, Math.ceil(input.maxPapers / input.queryVariants.length)),
    sources: RESEARCH_SOURCES
  });
  const dedupedPapers = dedupePapers(sourceSearch.papers).slice(0, input.maxPapers);
  const preEvidence = collectProjectEvidenceFromPapers({
    researchPlan: plan,
    papers: dedupedPapers,
    maxPapersPerBucket: 4
  });
  const candidateIds = new Set(
    preEvidence.bucketMetrics.flatMap((bucket) => bucket.topPaperIds)
  );
  const candidatePapers = dedupedPapers.filter((paper) => candidateIds.has(paper.id));
  const savedPdfFiles = new Map<string, string>();
  const ingestion = await ingestFullTextForPapers(candidatePapers, {
    limit: input.fullTextLimit,
    timeoutMs: 15_000,
    maxBytes: 20_000_000,
    onPdfFetched: async ({ paper, fetched }) => {
      const relativePath = join("pdfs", `${safeSlug(paper.id)}.pdf`);
      await writeFile(join(iterationDir, relativePath), fetched.bytes);
      savedPdfFiles.set(paper.id, relativePath);
    }
  });
  const ingestedById = new Map(ingestion.papers.map((paper) => [paper.id, paper]));
  const papersForResearch = dedupedPapers.map(
    (paper) => ingestedById.get(paper.id) ?? paper
  );

  const sourcePaperAudit = papersForResearch.map((paper) => ({
    id: paper.id,
    title: paper.title,
    year: paper.year,
    source: paper.source,
    doi: paper.doi,
    pdfUrl: paper.pdfUrl,
    sourceUrls: paper.sourceUrls,
    fullTextStatus: paper.fullTextStatus ?? "not_checked",
    fullTextChunkCount: paper.fullTextChunkCount ?? 0,
    fullTextQualityScore: paper.fullTextQualityScore ?? null,
    savedPdfFile: savedPdfFiles.get(paper.id) ?? null,
    abstractCharacters: paper.abstract?.length ?? 0,
    textPreview: paperText(paper).replace(/\s+/g, " ").slice(0, 600)
  }));

  await Promise.all([
    writeJson(join(iterationDir, "01_query_variants.json"), input.queryVariants),
    writeJson(join(iterationDir, "02_source_search.json"), {
      sourcesUsed: sourceSearch.sourcesUsed,
      warnings: sourceSearch.warnings,
      sourceDiagnostics: sourceSearch.sourceDiagnostics,
      rawPaperCount: sourceSearch.papers.length,
      dedupedPaperCount: dedupedPapers.length
    }),
    writeJson(join(iterationDir, "03_candidate_papers_before_fulltext.json"), candidatePapers),
    writeJson(join(iterationDir, "04_fulltext_ingestion_results.json"), {
      attempted: ingestion.results.map((result) => ({
        paperId: result.paper.id,
        title: result.paper.title,
        status: result.fullText.status,
        sourceType: result.fullText.sourceType,
        sourceUrl: result.fullText.sourceUrl,
        chunkCount: result.chunks.length,
        qualityScore: result.fullText.qualityScore,
        errorMessage: result.fullText.errorMessage,
        savedPdfFile: savedPdfFiles.get(result.paper.id) ?? null
      }))
    }),
    writeJson(join(iterationDir, "05_source_papers_after_fulltext.json"), sourcePaperAudit)
  ]);

  const researchDir = join(iterationDir, "06_project_research");
  const manifest = await runProjectResearch({
    idea: input.idea,
    papers: papersForResearch,
    generatedAt: input.generatedAt,
    outputDir: researchDir
  });
  const coverage = await readJson<CoverageArtifact>(join(researchDir, "coverage.json"));
  const parsedFullTextCount = ingestion.results.filter(
    (result) => result.fullText.status === "parsed"
  ).length;

  return {
    iterationDir,
    researchDir,
    manifest,
    parsedFullTextCount,
    savedPdfCount: savedPdfFiles.size,
    rawPaperCount: sourceSearch.papers.length,
    dedupedPaperCount: dedupedPapers.length,
    candidatePaperCount: candidatePapers.length,
    attemptedFullTextCount: ingestion.results.length,
    requiredBucketsWithoutParsedFullText: coverage.buckets
      .filter((bucket) => bucket.status === "covered" && bucket.parsedCount === 0)
      .map((bucket) => bucket.bucketId)
  };
}

function renderStart(input: {
  generatedAt: string;
  selectedIdeaTitle: string;
  finalVerdict: string;
  iterations: ResearchIteration[];
}) {
  const best = input.iterations.at(-1);
  return [
    "# Uczciwy pelny przelot: GitHub -> pomysly -> research -> full-text -> PRD -> architektura",
    "",
    `Generated at: ${input.generatedAt}`,
    `Selected idea: ${input.selectedIdeaTitle}`,
    `Final verdict: ${input.finalVerdict}`,
    "",
    "## Co ten test robi naprawde",
    "",
    "- robi kontrolowany dry-run BigQuery przed live GH Archive",
    "- pobiera trendujace repo z GH Archive z limitem kosztu",
    "- wzbogaca repo przez GitHub API README/issues",
    "- generuje shortlist pomyslow i wybiera najlepszy handoff",
    "- szuka publikacji w arXiv, Semantic Scholar i OpenAlex",
    "- probuje pobrac i sparsowac PDF/full-text dla kandydatow evidence",
    "- uruchamia research -> PRD -> architektura -> judge",
    "- robi iteracje zapytan, jesli sa braki coverage",
    "",
    "## Czego ten test nie udaje",
    "",
    "- nie twierdzi, ze kazdy znaleziony rekord to pelna publikacja, jesli PDF nie zostal sparsowany",
    "- nie twierdzi, ze architekture wygenerowal kreatywny LLM; obecny modul uzywa deterministycznego generatora blueprintow i judge'a",
    "- nie omija kosztow: live GH Archive dziala tylko po dry-run i z hard capem bytes billed",
    "",
    "## Wynik ostatniej iteracji",
    "",
    best
      ? [
          `- Papers raw/deduped: ${best.rawPaperCount}/${best.dedupedPaperCount}`,
          `- Full-text parsed/saved PDFs: ${best.parsedFullTextCount}/${best.savedPdfCount}`,
          `- Coverage: ${best.requiredCoveredCount}/${best.requiredBucketCount}`,
          `- Required buckets without parsed full-text: ${best.requiredBucketsWithoutParsedFullText.join(", ") || "none"}`,
          `- Architecture judge: ${best.architectureJudgeScore}/${best.architectureJudgeVerdict}`,
          `- Missing buckets: ${best.missingRequiredBuckets.join(", ") || "none"}`
        ].join("\n")
      : "- No iteration result.",
    "",
    "## Iteracje",
    "",
    ...input.iterations.flatMap((iteration) => [
      `### Iteration ${iteration.iteration}`,
      "",
      `- Query variants: ${iteration.queryVariantCount}`,
      `- Raw papers: ${iteration.rawPaperCount}`,
      `- Deduped papers: ${iteration.dedupedPaperCount}`,
      `- Candidate papers: ${iteration.candidatePaperCount}`,
      `- Attempted full-text: ${iteration.attemptedFullTextCount}`,
      `- Parsed full-text: ${iteration.parsedFullTextCount}`,
      `- Saved PDFs: ${iteration.savedPdfCount}`,
      `- Coverage: ${iteration.requiredCoveredCount}/${iteration.requiredBucketCount}`,
      `- Required buckets without parsed full-text: ${iteration.requiredBucketsWithoutParsedFullText.join(", ") || "none"}`,
      `- Architecture judge: ${iteration.architectureJudgeScore}/${iteration.architectureJudgeVerdict}`,
      `- Missing buckets: ${iteration.missingRequiredBuckets.join(", ") || "none"}`,
      `- Notes: ${iteration.notes.join(" | ") || "none"}`,
      ""
    ])
  ].join("\n");
}

async function main() {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();
  await mkdir(args.outputDir, { recursive: true });

  const liveInput = ProjectIdeaLiveBatchSamplerInputSchema.parse({
    domain: "AI developer tools, data quality, automation, agent workflows",
    constraints: [
      "nie klonowac repozytoriow z GitHuba",
      "MVP ma byc waskim produktem diagnostycznym, QA, audit, readiness albo reliability",
      "pomysl musi przejsc przez research, PRD, architekture i judge"
    ],
    outputLanguage: "pl",
    windows: [
      {
        startDate: args.startDate,
        endDate: args.endDate
      }
    ],
    mode: "dry_run",
    maxReposPerWindow: args.maxRepos,
    maxDaysPerWindow: 1,
    maxBytesBilledPerWindow: args.maxBytesBilled,
    includeReadme: true,
    includeIssues: true,
    timeoutMs: 15_000,
    maxIdeas: 5,
    maxIdeasPerSource: 1,
    minSourceReposForPass: Math.min(5, args.maxRepos),
    minReadyIdeasForPass: 3,
    token: process.env.GITHUB_TOKEN
  });

  const dryRunDir = join(args.outputDir, "01_gh_archive_dry_run");
  const dryRunSummary = await runControlledLiveBatchSampling({
    ...liveInput,
    outputDir: dryRunDir
  });

  if (!dryRunSummary.quality.passed) {
    await writeFile(
      join(args.outputDir, "00_START_TUTAJ.md"),
      renderStart({
        generatedAt,
        selectedIdeaTitle: "blocked before live GitHub trend run",
        finalVerdict: "BLOCKED - dry-run BigQuery nie przeszedl budget gate",
        iterations: []
      }),
      "utf8"
    );
    throw new Error("Dry-run BigQuery budget gate failed. Inspect 01_gh_archive_dry_run.");
  }

  const ideasDir = join(args.outputDir, "02_live_idea_discovery");
  await runProjectIdeaDiscovery({
    domain: liveInput.domain,
    constraints: liveInput.constraints,
    maxIdeas: liveInput.maxIdeas,
    maxIdeasPerSource: liveInput.maxIdeasPerSource,
    outputLanguage: liveInput.outputLanguage,
    ghArchiveTrends: {
      startDate: args.startDate,
      endDate: args.endDate,
      maxRepos: args.maxRepos,
      maxDays: 1,
      maxBytesBilled: args.maxBytesBilled,
      dryRun: false,
      includeReadme: true,
      includeIssues: true,
      timeoutMs: 15_000
    },
    outputDir: ideasDir
  });

  const ideaReport = await readJson<IdeaDiscoveryReport>(
    join(ideasDir, "idea_discovery_report.json")
  );
  const selected = chooseIdea(ideaReport);

  if (!selected?.projectIdeaInput) {
    throw new Error("No valid shortlisted ProjectIdeaInput to research.");
  }

  const selectedIdeaDir = join(args.outputDir, "03_selected_idea");
  await mkdir(selectedIdeaDir, { recursive: true });
  await Promise.all([
    writeJson(join(selectedIdeaDir, "selected_idea.json"), selected.idea),
    writeJson(join(selectedIdeaDir, "selected_project_idea_input.json"), selected.projectIdeaInput),
    writeFile(
      join(selectedIdeaDir, "selected_idea.md"),
      [
        "# Wybrany pomysl",
        "",
        `Title: ${selected.idea.title}`,
        `Score: ${selected.score?.total ?? "n/a"}`,
        `Handoff: ${selected.handoff?.score ?? "n/a"} / ${selected.handoff?.readiness ?? "n/a"}`,
        `Source repos: ${selected.idea.sourceRepos.join(", ")}`,
        "",
        "## Dlaczego ten",
        "",
        "- najwyzszy sensowny ranking z shortlisty",
        "- gotowy handoff do researchu",
        "- nie jest prostym klonem repo z GitHuba",
        "",
        "## Problem",
        "",
        selected.idea.problem,
        "",
        "## MVP",
        "",
        ...selected.idea.mvpScope.map((scope) => `- ${scope}`),
        "",
        "## Roznicowanie",
        "",
        ...selected.idea.differentiation.map((item) => `- ${item}`)
      ].join("\n"),
      "utf8"
    )
  ]);

  let queryVariants = buildProjectResearchPlan(selected.projectIdeaInput).researchPlan
    .queryVariants;
  const iterations: ResearchIteration[] = [];

  for (let iteration = 1; iteration <= args.iterations; iteration += 1) {
    const result = await searchAndIngestIteration({
      idea: selected.projectIdeaInput,
      outputDir: args.outputDir,
      iteration,
      queryVariants,
      maxPapers: args.maxPapers,
      fullTextLimit: args.fullTextLimit,
      generatedAt
    });
    const notes = [
      result.parsedFullTextCount < args.minParsedPapers
        ? `parsed full-text below target ${args.minParsedPapers}`
        : "parsed full-text target met",
      result.requiredBucketsWithoutParsedFullText.length > 0
        ? `required buckets without parsed full-text: ${result.requiredBucketsWithoutParsedFullText.join(", ")}`
        : "every covered required bucket has parsed full-text",
      result.manifest.requiredCoveredCount < result.manifest.requiredBucketCount
        ? "coverage still missing required buckets"
        : "required evidence buckets covered",
      result.manifest.architectureJudgeVerdict === "pass"
        ? "architecture judge passed"
        : "architecture judge needs improvement"
    ];
    const iterationSummary: ResearchIteration = {
      iteration,
      queryVariantCount: queryVariants.length,
      rawPaperCount: result.rawPaperCount,
      dedupedPaperCount: result.dedupedPaperCount,
      candidatePaperCount: result.candidatePaperCount,
      attemptedFullTextCount: result.attemptedFullTextCount,
      parsedFullTextCount: result.parsedFullTextCount,
      savedPdfCount: result.savedPdfCount,
      requiredCoveredCount: result.manifest.requiredCoveredCount,
      requiredBucketCount: result.manifest.requiredBucketCount,
      missingRequiredBuckets: result.manifest.missingRequiredBuckets,
      requiredBucketsWithoutParsedFullText:
        result.requiredBucketsWithoutParsedFullText,
      architectureJudgeScore: result.manifest.architectureJudgeScore,
      architectureJudgeVerdict: result.manifest.architectureJudgeVerdict,
      notes
    };
    iterations.push(iterationSummary);

    if (
      result.parsedFullTextCount >= args.minParsedPapers &&
      result.requiredBucketsWithoutParsedFullText.length === 0 &&
      result.manifest.requiredCoveredCount === result.manifest.requiredBucketCount &&
      result.manifest.architectureJudgeVerdict === "pass"
    ) {
      break;
    }

    queryVariants = addFocusedQueries({
      baseQueries: queryVariants,
      idea: selected.projectIdeaInput,
      missingBuckets: [
        ...result.manifest.missingRequiredBuckets,
        ...result.requiredBucketsWithoutParsedFullText
      ]
    });
  }

  const finalIteration = iterations.at(-1);
  const finalVerdict =
    finalIteration &&
    finalIteration.parsedFullTextCount >= args.minParsedPapers &&
    finalIteration.requiredBucketsWithoutParsedFullText.length === 0 &&
    finalIteration.requiredCoveredCount === finalIteration.requiredBucketCount &&
    finalIteration.architectureJudgeVerdict === "pass"
      ? "PASS - pelny przelot ma trend GitHub, realne source search, PDF/full-text gate i architekture do porownania"
      : "NEEDS_REVIEW - system wygenerowal artefakty, ale nie spelnil wszystkich bramek full-text/coverage/judge";

  await Promise.all([
    writeJson(join(args.outputDir, "09_full_pass_metrics.json"), {
      generatedAt,
      selectedIdeaTitle: selected.idea.title,
      finalVerdict,
      dryRunBudget: dryRunSummary.budget,
      iterations
    }),
    writeFile(
      join(args.outputDir, "00_START_TUTAJ.md"),
      renderStart({
        generatedAt,
        selectedIdeaTitle: selected.idea.title,
        finalVerdict,
        iterations
      }),
      "utf8"
    )
  ]);

  console.log(
    JSON.stringify(
      {
        outputDir: args.outputDir,
        selectedIdea: selected.idea.title,
        finalVerdict,
        finalIteration
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

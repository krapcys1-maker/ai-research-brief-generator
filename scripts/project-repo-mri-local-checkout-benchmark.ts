import { buildProjectResearchPlan, runProjectResearch } from "@/lib/project-research";
import type { ProjectIdeaInput, ReviewedPaper } from "@/lib/project-research";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

type BugPathCandidate = {
  path: string;
  symbol: string | null;
  score: number;
  confidence: number;
  line_range: [number, number] | null;
  evidence: string[];
  next_actions: string[];
};

type BugPathOutput = {
  candidates: BugPathCandidate[];
};

type LocalCheckoutCase = {
  id: string;
  issue: string;
  searchQuery: string;
  expectedFile: string;
  expectedSymbol: string;
};

type CaseResult = {
  id: string;
  searchHitCount: number;
  topCandidatePath: string | null;
  topCandidateSymbol: string | null;
  top1FileHit: boolean;
  top3FileHit: boolean;
  top3SymbolHit: boolean;
  evidenceComplete: boolean;
  lineRangeComplete: boolean;
  nextActionsComplete: boolean;
  passed: boolean;
};

const jsonOutputPath =
  process.env.PROJECT_REPO_MRI_LOCAL_BENCHMARK_JSON ??
  "benchmark-results/project-repo-mri-local-checkout-latest.json";
const markdownOutputPath =
  process.env.PROJECT_REPO_MRI_LOCAL_BENCHMARK_MARKDOWN ??
  "benchmark-results/project-repo-mri-local-checkout-latest.md";

const repoMriIdea: ProjectIdeaInput = {
  title: "Repo MRI",
  description:
    "Developer tool that turns a repository into an explainable code map with files, symbols, imports, calls, tests and a Bug Path mode from issue or stacktrace to likely files, symbols, tests and hypotheses.",
  constraints: [
    "do not build a generic chat with repo",
    "deterministic index and code knowledge graph before LLM summaries",
    "MVP must show evidence, line ranges, confidence and unknowns",
    "benchmark Bug Path on a real local checkout before treating the project as reliable"
  ],
  preferredDomains: ["software engineering", "static analysis", "code intelligence"],
  outputLanguage: "pl"
};

const paperCatalog = [
  {
    id: "repograph",
    title: "RepoGraph: Enhancing AI Software Engineering with Repository-level Code Graph",
    methods: ["repository-level code graph", "repository navigation", "SWE-bench"]
  },
  {
    id: "codesearchnet",
    title: "CodeSearchNet Challenge: Evaluating Semantic Code Search",
    methods: ["semantic code search", "natural language queries", "code retrieval"]
  },
  {
    id: "graphcodebert",
    title: "GraphCodeBERT: Pre-training Code Representations with Data Flow",
    methods: ["data flow", "code structure", "code search"]
  },
  {
    id: "agentless",
    title: "Agentless: Demystifying LLM-based Software Engineering Agents",
    methods: ["localization before repair", "structured workflow", "issue resolution"]
  }
] as const;

const cases: LocalCheckoutCase[] = [
  {
    id: "idea_personal_utility_score",
    expectedFile: "lib/project-ideas/ranker.ts",
    expectedSymbol: "scorePersonalUtility",
    searchQuery: "scorePersonalUtility personal build utility local tooling learning",
    issue:
      "Scoring bug in lib/project-ideas/ranker.ts: scorePersonalUtility should prioritize local tooling, learning and automation signals."
  },
  {
    id: "idea_discovery_metrics",
    expectedFile: "lib/project-ideas/runner.ts",
    expectedSymbol: "discoverProjectIdeas",
    searchQuery: "discoverProjectIdeas averagePersonalUtility metrics shortlist",
    issue:
      "Metrics bug in lib/project-ideas/runner.ts: discoverProjectIdeas must emit averagePersonalUtility after scoring shortlist ideas."
  },
  {
    id: "repo_mri_starter_pack_generation",
    expectedFile: "lib/project-pack/exporter.ts",
    expectedSymbol: "repoMriStarterCodeFiles",
    searchQuery: "repoMriStarterCodeFiles bug_path services indexer starter artifacts",
    issue:
      "Pack generation bug in lib/project-pack/exporter.ts: repoMriStarterCodeFiles should generate services/indexer and bug_path.py artifacts."
  },
  {
    id: "project_research_pack_readiness",
    expectedFile: "lib/project-research/runner.ts",
    expectedSymbol: "runProjectResearch",
    searchQuery: "runProjectResearch project_pack_readiness project_plan_judge",
    issue:
      "Research runner bug in lib/project-research/runner.ts: runProjectResearch must write project_pack_readiness.json and project_plan_judge.json."
  }
];

function reviewedPapersForRepoMri(): ReviewedPaper[] {
  const { researchPlan } = buildProjectResearchPlan(repoMriIdea);

  return researchPlan.evidenceBuckets.flatMap((bucket, bucketIndex) =>
    [0, 1].map((offset) => {
      const paper = paperCatalog[(bucketIndex + offset) % paperCatalog.length];
      return {
        paperId: `${paper.id}_${bucket.id}`,
        title: paper.title,
        year: offset === 0 ? 2025 : 2024,
        url: `https://example.com/research/${paper.id}`,
        doi: null,
        bucketIds: [bucket.id],
        fullTextStatus: "parsed",
        usefulForProject: true,
        evidenceStrength: "full_text_partial",
        keyMethods: [...paper.methods],
        limitations: ["fixture research for repeatable local-checkout benchmark"],
        implementationImplications: [
          `Use ${bucket.label} evidence to design deterministic indexing, graph-backed retrieval and Bug Path localization.`
        ],
        riskImplications: [
          `Weak ${bucket.id} evidence can make Repo MRI overclaim localization confidence.`
        ]
      } satisfies ReviewedPaper;
    })
  );
}

async function writeTextFile(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

function runPythonJson<T>(input: { cwd: string; args: string[] }) {
  const result = spawnSync("python", input.args, {
    cwd: input.cwd,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    throw new Error(
      [
        `python ${input.args.join(" ")} failed with ${result.status}`,
        result.stdout,
        result.stderr
      ].join("\n")
    );
  }

  return JSON.parse(result.stdout) as T;
}

function runPytest(cwd: string) {
  const result = spawnSync("python", ["-m", "pytest"], {
    cwd,
    encoding: "utf8"
  });

  return {
    passed: result.status === 0,
    stdout: result.stdout,
    stderr: result.stderr
  };
}

async function generateRepoMriPack(outputDir: string) {
  await runProjectResearch({
    idea: repoMriIdea,
    reviewedPapers: reviewedPapersForRepoMri(),
    generatedAt: "2026-06-04T10:20:00.000Z",
    outputDir
  });

  return join(outputDir, "project_pack", "services", "indexer");
}

function normalizePath(value: string) {
  return value.replace(/\\/g, "/");
}

function evaluateCase(input: {
  testCase: LocalCheckoutCase;
  dbPath: string;
  indexerCwd: string;
}): CaseResult {
  const searchResults = runPythonJson<unknown[]>({
    cwd: input.indexerCwd,
    args: [
      "-m",
      "repo_mri_indexer.cli",
      "search",
      input.testCase.searchQuery,
      "--db",
      input.dbPath,
      "--limit",
      "8"
    ]
  });
  const bugPath = runPythonJson<BugPathOutput>({
    cwd: input.indexerCwd,
    args: [
      "-m",
      "repo_mri_indexer.cli",
      "bug-path",
      input.testCase.issue,
      "--db",
      input.dbPath,
      "--limit",
      "8"
    ]
  });
  const candidates = bugPath.candidates ?? [];
  const top = candidates[0] ?? null;
  const top3 = candidates.slice(0, 3);
  const expectedFile = normalizePath(input.testCase.expectedFile);
  const top1FileHit = normalizePath(top?.path ?? "") === expectedFile;
  const top3FileHit = top3.some(
    (candidate) => normalizePath(candidate.path) === expectedFile
  );
  const top3SymbolHit = top3.some(
    (candidate) =>
      normalizePath(candidate.path) === expectedFile &&
      candidate.symbol === input.testCase.expectedSymbol
  );
  const evidenceComplete =
    candidates.length > 0 &&
    candidates.every((candidate) => candidate.evidence.length > 0);
  const lineRangeComplete =
    candidates.length > 0 &&
    candidates.every((candidate) => Array.isArray(candidate.line_range));
  const nextActionsComplete =
    candidates.length > 0 &&
    candidates.every((candidate) => candidate.next_actions.length >= 2);
  const passed =
    top1FileHit &&
    top3FileHit &&
    top3SymbolHit &&
    evidenceComplete &&
    lineRangeComplete &&
    nextActionsComplete;

  return {
    id: input.testCase.id,
    searchHitCount: searchResults.length,
    topCandidatePath: top?.path ?? null,
    topCandidateSymbol: top?.symbol ?? null,
    top1FileHit,
    top3FileHit,
    top3SymbolHit,
    evidenceComplete,
    lineRangeComplete,
    nextActionsComplete,
    passed
  };
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function averageBooleans(values: boolean[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.filter(Boolean).length / values.length;
}

function renderMarkdownReport(input: {
  generatedAt: string;
  repoRoot: string;
  packOutputDir: string;
  indexedFiles: number;
  indexedSymbols: number;
  indexedChunks: number;
  indexedEdges: number;
  pytestPassed: boolean;
  caseCount: number;
  passCount: number;
  top1FileAccuracy: number;
  top3FileAccuracy: number;
  top3SymbolAccuracy: number;
  evidenceCompleteness: number;
  lineRangeCompleteness: number;
  results: CaseResult[];
}) {
  const lines = [
    "# Repo MRI Local Checkout Benchmark",
    "",
    `Generated at: ${input.generatedAt}`,
    `Repo root: ${input.repoRoot}`,
    `Pack output dir: ${input.packOutputDir}`,
    `Pytest passed: ${input.pytestPassed ? "yes" : "no"}`,
    `Indexed files: ${input.indexedFiles}`,
    `Indexed symbols: ${input.indexedSymbols}`,
    `Indexed chunks: ${input.indexedChunks}`,
    `Indexed edges: ${input.indexedEdges}`,
    `Cases: ${input.passCount}/${input.caseCount}`,
    `Top-1 file accuracy: ${pct(input.top1FileAccuracy)}`,
    `Top-3 file accuracy: ${pct(input.top3FileAccuracy)}`,
    `Top-3 symbol accuracy: ${pct(input.top3SymbolAccuracy)}`,
    `Evidence completeness: ${pct(input.evidenceCompleteness)}`,
    `Line range completeness: ${pct(input.lineRangeCompleteness)}`,
    "",
    "## Cases",
    ""
  ];

  for (const result of input.results) {
    lines.push(`### ${result.passed ? "PASS" : "FAIL"} ${result.id}`);
    lines.push("");
    lines.push(`- Search hits: ${result.searchHitCount}`);
    lines.push(`- Top candidate: ${result.topCandidatePath ?? "none"} / ${result.topCandidateSymbol ?? "none"}`);
    lines.push(`- Top-1 file hit: ${result.top1FileHit ? "yes" : "no"}`);
    lines.push(`- Top-3 file hit: ${result.top3FileHit ? "yes" : "no"}`);
    lines.push(`- Top-3 symbol hit: ${result.top3SymbolHit ? "yes" : "no"}`);
    lines.push(`- Evidence complete: ${result.evidenceComplete ? "yes" : "no"}`);
    lines.push(`- Line ranges complete: ${result.lineRangeComplete ? "yes" : "no"}`);
    lines.push(`- Next actions complete: ${result.nextActionsComplete ? "yes" : "no"}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const repoRoot = resolve(
    process.env.PROJECT_REPO_MRI_LOCAL_REPO_DIR ?? process.cwd()
  );
  const root = await mkdtemp(join(tmpdir(), "repo-mri-local-checkout-benchmark-"));
  const packOutputDir =
    process.env.PROJECT_REPO_MRI_LOCAL_PACK_DIR ?? join(root, "system_output");
  const dbPath = join(root, "local_checkout.sqlite");
  const indexerCwd = await generateRepoMriPack(packOutputDir);
  const pytest = runPytest(indexerCwd);
  const indexStats = runPythonJson<Record<string, number>>({
    cwd: indexerCwd,
    args: [
      "-m",
      "repo_mri_indexer.cli",
      "index",
      repoRoot,
      "--db",
      dbPath
    ]
  });
  const results = cases.map((testCase) =>
    evaluateCase({ testCase, dbPath, indexerCwd })
  );
  const report = {
    generatedAt,
    repoRoot,
    packOutputDir,
    pytestPassed: pytest.passed,
    indexedFiles: indexStats.files ?? 0,
    indexedSymbols: indexStats.symbols ?? 0,
    indexedChunks: indexStats.chunks ?? 0,
    indexedEdges: indexStats.edges ?? 0,
    caseCount: results.length,
    passCount: results.filter((result) => result.passed).length,
    top1FileAccuracy: Number(averageBooleans(results.map((result) => result.top1FileHit)).toFixed(3)),
    top3FileAccuracy: Number(averageBooleans(results.map((result) => result.top3FileHit)).toFixed(3)),
    top3SymbolAccuracy: Number(averageBooleans(results.map((result) => result.top3SymbolHit)).toFixed(3)),
    evidenceCompleteness: Number(averageBooleans(results.map((result) => result.evidenceComplete)).toFixed(3)),
    lineRangeCompleteness: Number(averageBooleans(results.map((result) => result.lineRangeComplete)).toFixed(3)),
    results,
    pytestOutput: {
      stdout: pytest.stdout,
      stderr: pytest.stderr
    }
  };

  await writeTextFile(jsonOutputPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeTextFile(markdownOutputPath, renderMarkdownReport(report));

  console.log(
    [
      "Repo MRI local checkout benchmark",
      `Indexed files: ${report.indexedFiles}`,
      `Indexed symbols: ${report.indexedSymbols}`,
      `Cases: ${report.passCount}/${report.caseCount}`,
      `Pytest: ${report.pytestPassed ? "pass" : "fail"}`,
      `Top-1 file accuracy: ${pct(report.top1FileAccuracy)}`,
      `Top-3 file accuracy: ${pct(report.top3FileAccuracy)}`,
      `Top-3 symbol accuracy: ${pct(report.top3SymbolAccuracy)}`,
      `Evidence completeness: ${pct(report.evidenceCompleteness)}`,
      `Line range completeness: ${pct(report.lineRangeCompleteness)}`,
      `JSON: ${jsonOutputPath}`,
      `Markdown: ${markdownOutputPath}`
    ].join("\n")
  );

  if (!pytest.passed || report.passCount !== report.caseCount) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});


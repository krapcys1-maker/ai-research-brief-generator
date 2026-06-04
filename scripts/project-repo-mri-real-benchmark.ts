import { buildProjectResearchPlan, runProjectResearch } from "@/lib/project-research";
import type { ProjectIdeaInput, ReviewedPaper } from "@/lib/project-research";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

type FixtureFile = {
  path: string;
  content: string;
};

type BugPathFixture = {
  id: string;
  repoName: string;
  files: FixtureFile[];
  issue: string;
  searchQuery: string;
  expectedFile: string;
  expectedSymbol: string;
  expectedTestFile: string;
};

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

type CaseResult = {
  id: string;
  repoName: string;
  indexedFiles: number;
  indexedSymbols: number;
  indexedChunks: number;
  indexedEdges: number;
  searchHitCount: number;
  secretSearchHitCount: number;
  topCandidatePath: string | null;
  topCandidateSymbol: string | null;
  top1FileHit: boolean;
  top3FileHit: boolean;
  top3SymbolHit: boolean;
  top5TestFileHit: boolean;
  evidenceComplete: boolean;
  lineRangeComplete: boolean;
  nextActionsComplete: boolean;
  secretIgnored: boolean;
  passed: boolean;
};

const jsonOutputPath =
  process.env.PROJECT_REPO_MRI_REAL_BENCHMARK_JSON ??
  "benchmark-results/project-repo-mri-real-latest.json";
const markdownOutputPath =
  process.env.PROJECT_REPO_MRI_REAL_BENCHMARK_MARKDOWN ??
  "benchmark-results/project-repo-mri-real-latest.md";

const repoMriIdea: ProjectIdeaInput = {
  title: "Repo MRI",
  description:
    "Developer tool that turns a repository into an explainable code map with files, symbols, imports, calls, tests and a Bug Path mode from issue or stacktrace to likely files, symbols, tests and hypotheses.",
  constraints: [
    "do not build a generic chat with repo",
    "deterministic index and code knowledge graph before LLM summaries",
    "MVP must show evidence, line ranges, confidence and unknowns",
    "benchmark Bug Path on realistic repository fixtures before adding broad UI work"
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

const fixtures: BugPathFixture[] = [
  {
    id: "python_auth_empty_password",
    repoName: "auth_service",
    expectedFile: "auth.py",
    expectedSymbol: "login_user",
    expectedTestFile: "tests/test_auth.py",
    searchQuery: "login_user empty password",
    issue: "ValueError in auth.py:8 when login_user gets empty password",
    files: [
      {
        path: "auth.py",
        content: [
          "class User:",
          "    def __init__(self, email: str):",
          "        self.email = email",
          "",
          "",
          "def login_user(email: str, password: str) -> User:",
          "    validate_password(password)",
          "    return User(email)",
          "",
          "",
          "def validate_password(password: str) -> bool:",
          "    if not password:",
          "        raise ValueError('empty password')",
          "    return True"
        ].join("\n")
      },
      {
        path: "tests/test_auth.py",
        content: [
          "import pytest",
          "from auth import login_user",
          "",
          "",
          "def test_login_empty_password():",
          "    with pytest.raises(ValueError):",
          "        login_user('ada@example.com', '')"
        ].join("\n")
      },
      {
        path: ".env",
        content: "SUPER_SECRET_TOKEN=do-not-index\n"
      }
    ]
  },
  {
    id: "typescript_checkout_coupon",
    repoName: "checkout_ui",
    expectedFile: "src/cart.ts",
    expectedSymbol: "applyCoupon",
    expectedTestFile: "tests/cart.test.ts",
    searchQuery: "applyCoupon invalid coupon checkout total",
    issue: "Error in src/cart.ts:6 when applyCoupon receives an expired coupon during checkout",
    files: [
      {
        path: "src/cart.ts",
        content: [
          "export type Cart = { total: number; coupon?: string };",
          "",
          "export function applyCoupon(cart: Cart, coupon: string): Cart {",
          "  if (!coupon || coupon === 'EXPIRED') {",
          "    throw new Error('invalid coupon');",
          "  }",
          "  return { ...cart, coupon, total: cart.total * 0.9 };",
          "}",
          "",
          "export function cartTotal(cart: Cart): number {",
          "  return cart.total;",
          "}"
        ].join("\n")
      },
      {
        path: "src/checkout.ts",
        content: [
          "import { applyCoupon, Cart } from './cart';",
          "",
          "export function submitCheckout(cart: Cart, coupon: string) {",
          "  return applyCoupon(cart, coupon);",
          "}"
        ].join("\n")
      },
      {
        path: "tests/cart.test.ts",
        content: [
          "import { applyCoupon } from '../src/cart';",
          "",
          "test('rejects expired coupons', () => {",
          "  expect(() => applyCoupon({ total: 100 }, 'EXPIRED')).toThrow('invalid coupon');",
          "});"
        ].join("\n")
      },
      {
        path: ".env",
        content: "SUPER_SECRET_TOKEN=do-not-index\n"
      }
    ]
  },
  {
    id: "python_pipeline_bad_timestamp",
    repoName: "event_pipeline",
    expectedFile: "pipeline.py",
    expectedSymbol: "normalize_event",
    expectedTestFile: "tests/test_pipeline.py",
    searchQuery: "normalize_event invalid timestamp",
    issue: "ValueError in pipeline.py:8 when normalize_event parses malformed timestamp",
    files: [
      {
        path: "pipeline.py",
        content: [
          "from datetime import datetime",
          "",
          "",
          "def normalize_event(raw: dict) -> dict:",
          "    timestamp = parse_timestamp(raw['timestamp'])",
          "    return {'id': raw['id'], 'timestamp': timestamp.isoformat()}",
          "",
          "",
          "def parse_timestamp(value: str) -> datetime:",
          "    if not value.endswith('Z'):",
          "        raise ValueError('timestamp must be UTC')",
          "    return datetime.fromisoformat(value.replace('Z', '+00:00'))"
        ].join("\n")
      },
      {
        path: "tests/test_pipeline.py",
        content: [
          "import pytest",
          "from pipeline import normalize_event",
          "",
          "",
          "def test_rejects_non_utc_timestamp():",
          "    with pytest.raises(ValueError):",
          "        normalize_event({'id': 'evt_1', 'timestamp': '2026-06-04T10:00:00'})"
        ].join("\n")
      },
      {
        path: ".env",
        content: "SUPER_SECRET_TOKEN=do-not-index\n"
      }
    ]
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
        limitations: ["fixture research for repeatable Repo MRI benchmark"],
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

async function writeFixture(root: string, fixture: BugPathFixture) {
  const repoRoot = join(root, fixture.repoName);

  for (const file of fixture.files) {
    await writeTextFile(join(repoRoot, file.path), file.content);
  }

  return repoRoot;
}

function runPythonJson<T>(input: {
  cwd: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
}) {
  const result = spawnSync("python", input.args, {
    cwd: input.cwd,
    env: input.env,
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
    generatedAt: "2026-06-04T09:45:00.000Z",
    outputDir
  });

  return join(outputDir, "project_pack", "services", "indexer");
}

async function evaluateFixture(input: {
  fixture: BugPathFixture;
  fixtureRoot: string;
  indexerCwd: string;
}): Promise<CaseResult> {
  const repoRoot = await writeFixture(input.fixtureRoot, input.fixture);
  const dbPath = join(input.fixtureRoot, `${input.fixture.id}.sqlite`);
  const indexStats = runPythonJson<Record<string, number>>({
    cwd: input.indexerCwd,
    args: [
      "-m",
      "repo_mri_indexer.cli",
      "index",
      repoRoot,
      "--db",
      dbPath
    ]
  });
  const searchResults = runPythonJson<unknown[]>({
    cwd: input.indexerCwd,
    args: [
      "-m",
      "repo_mri_indexer.cli",
      "search",
      input.fixture.searchQuery,
      "--db",
      dbPath,
      "--limit",
      "5"
    ]
  });
  const secretSearchResults = runPythonJson<unknown[]>({
    cwd: input.indexerCwd,
    args: [
      "-m",
      "repo_mri_indexer.cli",
      "search",
      "SUPER_SECRET_TOKEN",
      "--db",
      dbPath,
      "--limit",
      "5"
    ]
  });
  const bugPath = runPythonJson<BugPathOutput>({
    cwd: input.indexerCwd,
    args: [
      "-m",
      "repo_mri_indexer.cli",
      "bug-path",
      input.fixture.issue,
      "--db",
      dbPath,
      "--limit",
      "8"
    ]
  });
  const candidates = bugPath.candidates ?? [];
  const top = candidates[0] ?? null;
  const top3 = candidates.slice(0, 3);
  const top5 = candidates.slice(0, 5);
  const top1FileHit = top?.path === input.fixture.expectedFile;
  const top3FileHit = top3.some((candidate) => candidate.path === input.fixture.expectedFile);
  const top3SymbolHit = top3.some(
    (candidate) =>
      candidate.path === input.fixture.expectedFile &&
      candidate.symbol === input.fixture.expectedSymbol
  );
  const top5TestFileHit = top5.some(
    (candidate) => candidate.path === input.fixture.expectedTestFile
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
  const secretIgnored = secretSearchResults.length === 0 && indexStats.files < input.fixture.files.length;
  const passed =
    top1FileHit &&
    top3FileHit &&
    top3SymbolHit &&
    top5TestFileHit &&
    evidenceComplete &&
    lineRangeComplete &&
    nextActionsComplete &&
    secretIgnored;

  return {
    id: input.fixture.id,
    repoName: input.fixture.repoName,
    indexedFiles: indexStats.files ?? 0,
    indexedSymbols: indexStats.symbols ?? 0,
    indexedChunks: indexStats.chunks ?? 0,
    indexedEdges: indexStats.edges ?? 0,
    searchHitCount: searchResults.length,
    secretSearchHitCount: secretSearchResults.length,
    topCandidatePath: top?.path ?? null,
    topCandidateSymbol: top?.symbol ?? null,
    top1FileHit,
    top3FileHit,
    top3SymbolHit,
    top5TestFileHit,
    evidenceComplete,
    lineRangeComplete,
    nextActionsComplete,
    secretIgnored,
    passed
  };
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function renderMarkdownReport(input: {
  generatedAt: string;
  packOutputDir: string;
  pytestPassed: boolean;
  caseCount: number;
  passCount: number;
  top1FileAccuracy: number;
  top3FileAccuracy: number;
  top3SymbolAccuracy: number;
  top5TestFileAccuracy: number;
  evidenceCompleteness: number;
  lineRangeCompleteness: number;
  secretIgnoreRate: number;
  results: CaseResult[];
}) {
  const lines = [
    "# Repo MRI Realistic Bug Path Benchmark",
    "",
    `Generated at: ${input.generatedAt}`,
    `Pack output dir: ${input.packOutputDir}`,
    `Pytest passed: ${input.pytestPassed ? "yes" : "no"}`,
    `Cases: ${input.passCount}/${input.caseCount}`,
    `Top-1 file accuracy: ${pct(input.top1FileAccuracy)}`,
    `Top-3 file accuracy: ${pct(input.top3FileAccuracy)}`,
    `Top-3 symbol accuracy: ${pct(input.top3SymbolAccuracy)}`,
    `Top-5 test file accuracy: ${pct(input.top5TestFileAccuracy)}`,
    `Evidence completeness: ${pct(input.evidenceCompleteness)}`,
    `Line range completeness: ${pct(input.lineRangeCompleteness)}`,
    `Secret ignore rate: ${pct(input.secretIgnoreRate)}`,
    "",
    "## Cases",
    ""
  ];

  for (const result of input.results) {
    lines.push(`### ${result.passed ? "PASS" : "FAIL"} ${result.id}`);
    lines.push("");
    lines.push(`- Repo: ${result.repoName}`);
    lines.push(`- Indexed files: ${result.indexedFiles}`);
    lines.push(`- Indexed symbols: ${result.indexedSymbols}`);
    lines.push(`- Indexed chunks: ${result.indexedChunks}`);
    lines.push(`- Indexed edges: ${result.indexedEdges}`);
    lines.push(`- Search hits: ${result.searchHitCount}`);
    lines.push(`- Secret search hits: ${result.secretSearchHitCount}`);
    lines.push(`- Top candidate: ${result.topCandidatePath ?? "none"} / ${result.topCandidateSymbol ?? "none"}`);
    lines.push(`- Top-1 file hit: ${result.top1FileHit ? "yes" : "no"}`);
    lines.push(`- Top-3 file hit: ${result.top3FileHit ? "yes" : "no"}`);
    lines.push(`- Top-3 symbol hit: ${result.top3SymbolHit ? "yes" : "no"}`);
    lines.push(`- Top-5 test file hit: ${result.top5TestFileHit ? "yes" : "no"}`);
    lines.push(`- Evidence complete: ${result.evidenceComplete ? "yes" : "no"}`);
    lines.push(`- Line ranges complete: ${result.lineRangeComplete ? "yes" : "no"}`);
    lines.push(`- Next actions complete: ${result.nextActionsComplete ? "yes" : "no"}`);
    lines.push(`- Secret ignored: ${result.secretIgnored ? "yes" : "no"}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function averageBooleans(values: boolean[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.filter(Boolean).length / values.length;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const root = await mkdtemp(join(tmpdir(), "repo-mri-real-benchmark-"));
  const packOutputDir =
    process.env.PROJECT_REPO_MRI_REAL_PACK_DIR ?? join(root, "system_output");
  const fixtureRoot = join(root, "fixtures");
  const indexerCwd = await generateRepoMriPack(packOutputDir);
  const pytest = runPytest(indexerCwd);
  const results: CaseResult[] = [];

  for (const fixture of fixtures) {
    results.push(await evaluateFixture({ fixture, fixtureRoot, indexerCwd }));
  }

  const report = {
    generatedAt,
    packOutputDir,
    pytestPassed: pytest.passed,
    caseCount: results.length,
    passCount: results.filter((result) => result.passed).length,
    top1FileAccuracy: Number(averageBooleans(results.map((result) => result.top1FileHit)).toFixed(3)),
    top3FileAccuracy: Number(averageBooleans(results.map((result) => result.top3FileHit)).toFixed(3)),
    top3SymbolAccuracy: Number(averageBooleans(results.map((result) => result.top3SymbolHit)).toFixed(3)),
    top5TestFileAccuracy: Number(averageBooleans(results.map((result) => result.top5TestFileHit)).toFixed(3)),
    evidenceCompleteness: Number(averageBooleans(results.map((result) => result.evidenceComplete)).toFixed(3)),
    lineRangeCompleteness: Number(averageBooleans(results.map((result) => result.lineRangeComplete)).toFixed(3)),
    secretIgnoreRate: Number(averageBooleans(results.map((result) => result.secretIgnored)).toFixed(3)),
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
      "Repo MRI realistic Bug Path benchmark",
      `Cases: ${report.passCount}/${report.caseCount}`,
      `Pytest: ${report.pytestPassed ? "pass" : "fail"}`,
      `Top-1 file accuracy: ${pct(report.top1FileAccuracy)}`,
      `Top-3 file accuracy: ${pct(report.top3FileAccuracy)}`,
      `Top-3 symbol accuracy: ${pct(report.top3SymbolAccuracy)}`,
      `Top-5 test file accuracy: ${pct(report.top5TestFileAccuracy)}`,
      `Evidence completeness: ${pct(report.evidenceCompleteness)}`,
      `Line range completeness: ${pct(report.lineRangeCompleteness)}`,
      `Secret ignore rate: ${pct(report.secretIgnoreRate)}`,
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

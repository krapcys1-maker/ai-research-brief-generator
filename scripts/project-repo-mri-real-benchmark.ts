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
  expectedTestFile: string | null;
  expectedMinimalTestCommand?: string;
  requiresCallGraph?: boolean;
  requiresIndirectTest?: boolean;
  expectsAmbiguousTop3?: boolean;
  expectedRootCauseFile?: string;
  expectedRootCauseSymbol?: string;
};

type BugPathCandidate = {
  path: string;
  symbol: string | null;
  score: number;
  confidence: number;
  line_range: [number, number] | null;
  evidence: string[];
  related_tests?: Array<{
    path: string;
    symbol?: string | null;
    score: number;
    line_range: [number, number] | null;
    evidence: string[];
    command: string;
  }>;
  next_actions: string[];
};

type BugPathOutput = {
  unknowns?: string[];
  why_not_other_candidates?: Array<{
    path: string;
    symbol: string | null;
    score: number;
    reason: string;
    evidence_excerpt: string[];
  }>;
  root_cause_candidates?: Array<{
    path: string;
    symbol: string | null;
    score: number;
    line_range: [number, number] | null;
    evidence: string[];
  }>;
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
  expectsDirectTest: boolean;
  requiresCallGraph: boolean;
  requiresIndirectTest: boolean;
  expectsAmbiguousTop3: boolean;
  expectsMinimalNextAction: boolean;
  topCandidatePath: string | null;
  topCandidateSymbol: string | null;
  topCandidateEvidence: string[];
  topCandidateNextActions: string[];
  topRootCausePath: string | null;
  topRootCauseSymbol: string | null;
  topRootCauseEvidence: string[];
  unknowns: string[];
  whyNotOtherCandidates: Array<{
    path: string;
    symbol: string | null;
    reason: string;
  }>;
  topCandidateRelatedTests: Array<{
    path: string;
    symbol?: string | null;
    command: string;
    evidence: string[];
  }>;
  expectedSourceRelatedTests: Array<{
    path: string;
    symbol?: string | null;
    command: string;
    evidence: string[];
  }>;
  top1FileHit: boolean;
  top1SymbolHit: boolean;
  top3FileHit: boolean;
  top3SymbolHit: boolean;
  top5TestFileHit: boolean;
  relatedTestFileHit: boolean;
  noDirectTestHonesty: boolean;
  callGraphRootCauseHit: boolean;
  indirectRelatedTestHit: boolean;
  ambiguousTop3Honesty: boolean;
  minimalNextActionHit: boolean;
  evidenceComplete: boolean;
  lineRangeComplete: boolean;
  relatedTestsComplete: boolean;
  unknownsComplete: boolean;
  whyNotComplete: boolean;
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
  },
  {
    id: "python_billing_discount_without_file_hint",
    repoName: "billing_service",
    expectedFile: "billing/discounts.py",
    expectedSymbol: "apply_loyalty_discount",
    expectedTestFile: "tests/test_discounts.py",
    searchQuery: "premium customer negative total loyalty discount sale price",
    issue:
      "Premium customers can end up with a negative total when loyalty discount stacks with an active sale price",
    files: [
      {
        path: "billing/discounts.py",
        content: [
          "def apply_loyalty_discount(total: float, customer_tier: str, sale_active: bool) -> float:",
          "    if customer_tier == 'premium' and sale_active:",
          "        return total - 150.0",
          "    if customer_tier == 'premium':",
          "        return total * 0.85",
          "    return total",
          "",
          "",
          "def apply_shipping_discount(total: float, has_coupon: bool) -> float:",
          "    if has_coupon:",
          "        return total - 5.0",
          "    return total"
        ].join("\n")
      },
      {
        path: "billing/invoices.py",
        content: [
          "from billing.discounts import apply_loyalty_discount",
          "",
          "",
          "def build_invoice(total: float, customer_tier: str, sale_active: bool) -> dict:",
          "    discounted = apply_loyalty_discount(total, customer_tier, sale_active)",
          "    return {'total': discounted}"
        ].join("\n")
      },
      {
        path: "tests/test_discounts.py",
        content: [
          "from billing.discounts import apply_loyalty_discount",
          "",
          "",
          "def test_premium_sale_discount_does_not_make_negative_total():",
          "    assert apply_loyalty_discount(100.0, 'premium', True) >= 0"
        ].join("\n")
      },
      {
        path: ".env",
        content: "SUPER_SECRET_TOKEN=do-not-index\n"
      }
    ]
  },
  {
    id: "typescript_webhook_similar_symbols",
    repoName: "webhook_service",
    expectedFile: "src/webhook.ts",
    expectedSymbol: "parseWebhookSignature",
    expectedTestFile: "tests/webhook.test.ts",
    searchQuery: "webhook signature rejects valid hex digest",
    issue:
      "Webhook signature validation rejects a valid hex digest while the payload parser still accepts the event body",
    files: [
      {
        path: "src/webhook.ts",
        content: [
          "export function parseWebhookPayload(body: string): unknown {",
          "  return JSON.parse(body);",
          "}",
          "",
          "export function parseWebhookSignature(signature: string): string {",
          "  if (!signature.startsWith('sha256=')) {",
          "    throw new Error('missing webhook signature prefix');",
          "  }",
          "  const digest = signature.slice('sha256='.length);",
          "  if (digest.length !== 64 || /[^0-9a-f]/.test(digest)) {",
          "    throw new Error('invalid webhook signature digest');",
          "  }",
          "  return digest;",
          "}"
        ].join("\n")
      },
      {
        path: "src/webhookClient.ts",
        content: [
          "import { parseWebhookPayload, parseWebhookSignature } from './webhook';",
          "",
          "export function receiveWebhook(body: string, signature: string) {",
          "  const digest = parseWebhookSignature(signature);",
          "  return { digest, payload: parseWebhookPayload(body) };",
          "}"
        ].join("\n")
      },
      {
        path: "tests/webhook.test.ts",
        content: [
          "import { parseWebhookSignature } from '../src/webhook';",
          "",
          "test('accepts valid lowercase hex webhook signature digest', () => {",
          "  const digest = 'a'.repeat(64);",
          "  expect(parseWebhookSignature(`sha256=${digest}`)).toBe(digest);",
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
    id: "python_feature_flag_no_direct_test",
    repoName: "feature_flags",
    expectedFile: "feature_flags.py",
    expectedSymbol: "is_feature_enabled",
    expectedTestFile: null,
    searchQuery: "feature flag expires rollout remains enabled",
    issue:
      "Rollout remains enabled after the feature flag expires for an account even though expired flags should be disabled",
    files: [
      {
        path: "feature_flags.py",
        content: [
          "from datetime import datetime",
          "",
          "",
          "def is_feature_enabled(flag: dict, account_id: str, now: datetime) -> bool:",
          "    if account_id not in flag.get('accounts', []):",
          "        return False",
          "    expires_at = flag.get('expires_at')",
          "    if expires_at is None:",
          "        return True",
          "    return now <= expires_at",
          "",
          "",
          "def list_enabled_flags(flags: list[dict], account_id: str, now: datetime) -> list[str]:",
          "    return [flag['name'] for flag in flags if is_feature_enabled(flag, account_id, now)]"
        ].join("\n")
      },
      {
        path: "accounts.py",
        content: [
          "def account_key(account_id: str) -> str:",
          "    return account_id.strip().lower()"
        ].join("\n")
      },
      {
        path: ".env",
        content: "SUPER_SECRET_TOKEN=do-not-index\n"
      }
    ]
  },
  {
    id: "python_checkout_call_graph_root_cause",
    repoName: "checkout_backend",
    expectedFile: "checkout.py",
    expectedSymbol: "build_checkout_summary",
    expectedTestFile: "tests/test_checkout.py",
    requiresCallGraph: true,
    expectedRootCauseFile: "pricing/tax.py",
    expectedRootCauseSymbol: "calculate_tax",
    searchQuery: "checkout exempt customer still charged tax build checkout summary",
    issue:
      "Order total is wrong in checkout.py:5 when build_checkout_summary handles a tax exempt customer; checkout still charges tax",
    files: [
      {
        path: "checkout.py",
        content: [
          "from pricing.tax import calculate_tax",
          "",
          "",
          "def build_checkout_summary(cart: dict, customer: dict) -> dict:",
          "    subtotal = cart['subtotal']",
          "    tax = calculate_tax(subtotal, customer)",
          "    return {'subtotal': subtotal, 'tax': tax, 'total': subtotal + tax}"
        ].join("\n")
      },
      {
        path: "pricing/tax.py",
        content: [
          "def calculate_tax(subtotal: float, customer: dict) -> float:",
          "    if customer.get('tax_exempt'):",
          "        return subtotal * 0.23",
          "    return subtotal * 0.23",
          "",
          "",
          "def format_tax_label(rate: float) -> str:",
          "    return f'Tax {rate:.0%}'"
        ].join("\n")
      },
      {
        path: "tests/test_checkout.py",
        content: [
          "from checkout import build_checkout_summary",
          "from pricing.tax import calculate_tax",
          "",
          "",
          "def test_tax_exempt_customer_is_not_charged_tax_in_checkout():",
          "    customer = {'tax_exempt': True}",
          "    cart = {'subtotal': 100.0}",
          "    assert calculate_tax(cart['subtotal'], customer) == 0.0",
          "    assert build_checkout_summary(cart, customer)['tax'] == 0.0"
        ].join("\n")
      },
      {
        path: ".env",
        content: "SUPER_SECRET_TOKEN=do-not-index\n"
      }
    ]
  },
  {
    id: "python_quote_api_indirect_test",
    repoName: "quote_service",
    expectedFile: "pricing/rules.py",
    expectedSymbol: "normalize_discount_code",
    expectedTestFile: "tests/test_quote_api.py",
    requiresIndirectTest: true,
    searchQuery: "quote api discount code whitespace still accepted",
    issue:
      "Quote API returns 500 when a discount code contains surrounding whitespace; discount code should be normalized before pricing",
    files: [
      {
        path: "quote_api.py",
        content: [
          "from pricing.rules import price_with_discount",
          "",
          "",
          "def apply_quote(request: dict) -> dict:",
          "    total = price_with_discount(request['subtotal'], request.get('discount_code'))",
          "    return {'total': total}"
        ].join("\n")
      },
      {
        path: "pricing/rules.py",
        content: [
          "def normalize_discount_code(code: str | None) -> str | None:",
          "    if code is None:",
          "        return None",
          "    if code != code.strip():",
          "        raise ValueError('discount code whitespace')",
          "    return code.upper()",
          "",
          "",
          "def price_with_discount(subtotal: float, discount_code: str | None) -> float:",
          "    normalized = normalize_discount_code(discount_code)",
          "    if normalized == 'SAVE10':",
          "        return subtotal * 0.9",
          "    return subtotal"
        ].join("\n")
      },
      {
        path: "tests/test_quote_api.py",
        content: [
          "from quote_api import apply_quote",
          "",
          "",
          "def test_quote_api_accepts_discount_code_with_surrounding_whitespace():",
          "    result = apply_quote({'subtotal': 100.0, 'discount_code': ' SAVE10 '})",
          "    assert result['total'] == 90.0"
        ].join("\n")
      },
      {
        path: ".env",
        content: "SUPER_SECRET_TOKEN=do-not-index\n"
      }
    ]
  },
  {
    id: "python_report_export_ambiguous_top3",
    repoName: "report_exporter",
    expectedFile: "cache/export_cache.py",
    expectedSymbol: "refresh_export_cache",
    expectedTestFile: "tests/test_report_export.py",
    expectsAmbiguousTop3: true,
    searchQuery: "report export stale cache download csv",
    issue:
      "Report export download still serves stale cached CSV while cache refresh should invalidate stale data before returning the file",
    files: [
      {
        path: "reports/export_controller.py",
        content: [
          "from cache.export_cache import refresh_export_cache",
          "",
          "",
          "def download_report_export(report_id: str, cache: dict) -> str:",
          "    cached_csv = refresh_export_cache(report_id, cache)",
          "    return cached_csv"
        ].join("\n")
      },
      {
        path: "cache/export_cache.py",
        content: [
          "def refresh_export_cache(report_id: str, cache: dict) -> str:",
          "    if cache.get('stale'):",
          "        return cache['csv']",
          "    return build_export_csv(report_id)",
          "",
          "",
          "def build_export_csv(report_id: str) -> str:",
          "    return f'id,{report_id}'"
        ].join("\n")
      },
      {
        path: "reports/audit_log.py",
        content: [
          "def log_report_export(report_id: str, user_id: str) -> None:",
          "    message = f'report export downloaded by {user_id}: {report_id}'",
          "    print(message)"
        ].join("\n")
      },
      {
        path: "tests/test_report_export.py",
        content: [
          "from reports.export_controller import download_report_export",
          "",
          "",
          "def test_report_export_refreshes_stale_cache_before_download():",
          "    cache = {'stale': True, 'csv': 'old'}",
          "    assert download_report_export('rpt_1', cache) != 'old'"
        ].join("\n")
      },
      {
        path: ".env",
        content: "SUPER_SECRET_TOKEN=do-not-index\n"
      }
    ]
  },
  {
    id: "python_payment_retry_minimal_next_action",
    repoName: "payment_worker",
    expectedFile: "payments/retry.py",
    expectedSymbol: "retry_failed_payment",
    expectedTestFile: "tests/test_payments.py",
    expectedMinimalTestCommand:
      "pytest tests/test_payments.py::test_retry_failed_payment_retries_declined_charge_once",
    searchQuery: "retry_failed_payment declined charge retried once",
    issue:
      "retry_failed_payment retries declined charges twice; it should retry a declined charge only once before returning failed",
    files: [
      {
        path: "payments/retry.py",
        content: [
          "def retry_failed_payment(charge: dict, gateway) -> dict:",
          "    attempts = 0",
          "    while attempts <= 1:",
          "        attempts += 1",
          "        result = gateway.retry(charge['id'])",
          "        if result['status'] == 'paid':",
          "            return result",
          "    return {'status': 'failed', 'attempts': attempts}",
          "",
          "",
          "def retry_refund(refund: dict, gateway) -> dict:",
          "    return gateway.retry_refund(refund['id'])"
        ].join("\n")
      },
      {
        path: "payments/gateway.py",
        content: [
          "class FakeGateway:",
          "    def __init__(self, responses):",
          "        self.responses = list(responses)",
          "        self.calls = 0",
          "",
          "    def retry(self, charge_id: str) -> dict:",
          "        self.calls += 1",
          "        return self.responses.pop(0)"
        ].join("\n")
      },
      {
        path: "tests/test_payments.py",
        content: [
          "from payments.gateway import FakeGateway",
          "from payments.retry import retry_failed_payment, retry_refund",
          "",
          "",
          "def test_retry_failed_payment_retries_declined_charge_once():",
          "    gateway = FakeGateway([{'status': 'failed'}, {'status': 'failed'}])",
          "    result = retry_failed_payment({'id': 'ch_1'}, gateway)",
          "    assert result['status'] == 'failed'",
          "    assert gateway.calls == 1",
          "",
          "",
          "def test_retry_refund_uses_refund_gateway_path():",
          "    gateway = FakeGateway([{'status': 'refunded'}])",
          "    result = retry_refund({'id': 'rf_1'}, gateway)",
          "    assert result['status'] == 'refunded'"
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
  const unknowns = bugPath.unknowns ?? [];
  const whyNotOtherCandidates = bugPath.why_not_other_candidates ?? [];
  const rootCauseCandidates = bugPath.root_cause_candidates ?? [];
  const top = candidates[0] ?? null;
  const topRootCause = rootCauseCandidates[0] ?? null;
  const top3 = candidates.slice(0, 3);
  const top5 = candidates.slice(0, 5);
  const top1FileHit = top?.path === input.fixture.expectedFile;
  const top1SymbolHit =
    top?.path === input.fixture.expectedFile &&
    top?.symbol === input.fixture.expectedSymbol;
  const top3FileHit = top3.some((candidate) => candidate.path === input.fixture.expectedFile);
  const top3SymbolHit = top3.some(
    (candidate) =>
      candidate.path === input.fixture.expectedFile &&
      candidate.symbol === input.fixture.expectedSymbol
  );
  const expectsDirectTest = input.fixture.expectedTestFile !== null;
  const requiresCallGraph = input.fixture.requiresCallGraph === true;
  const requiresIndirectTest = input.fixture.requiresIndirectTest === true;
  const expectsAmbiguousTop3 = input.fixture.expectsAmbiguousTop3 === true;
  const expectsMinimalNextAction = input.fixture.expectedMinimalTestCommand !== undefined;
  const expectedSourceCandidates = candidates.filter(
    (candidate) =>
      candidate.path === input.fixture.expectedFile &&
      candidate.symbol === input.fixture.expectedSymbol
  );
  const relatedTestForExpectedCandidateHit = expectedSourceCandidates.some((candidate) =>
    (candidate.related_tests ?? []).some(
      (relatedTest) => relatedTest.path === input.fixture.expectedTestFile
    )
  );
  const top5TestFileHit = expectsDirectTest
    ? top5.some((candidate) => candidate.path === input.fixture.expectedTestFile) ||
      relatedTestForExpectedCandidateHit
    : top5.every(
        (candidate) => !candidate.path.includes("test") && !candidate.path.includes("spec")
      );
  const topCandidateHasNoRelatedTests = (top?.related_tests ?? []).length === 0;
  const noDirectTestHonesty =
    expectsDirectTest ||
    (topCandidateHasNoRelatedTests &&
      unknowns.some((unknown) => unknown.includes("no directly matched related test")) &&
      (top?.next_actions ?? []).some((action) => action.includes("characterization test")));
  const callGraphRootCauseHit =
    !requiresCallGraph ||
    (topRootCause !== null &&
      topRootCause.path === input.fixture.expectedRootCauseFile &&
      topRootCause.symbol === input.fixture.expectedRootCauseSymbol &&
      topRootCause.evidence.some((evidence) => evidence.includes("call graph:")));
  const indirectRelatedTestHit =
    !requiresIndirectTest ||
    expectedSourceCandidates.some((candidate) =>
      (candidate.related_tests ?? []).some(
        (relatedTest) =>
          relatedTest.path === input.fixture.expectedTestFile &&
          !relatedTest.evidence.some((evidence) =>
            evidence.includes(`test content match: ${input.fixture.expectedSymbol}`)
          )
      )
    );
  const ambiguousTop3Honesty =
    !expectsAmbiguousTop3 ||
    (!top1SymbolHit &&
      top3SymbolHit &&
      unknowns.some((unknown) => unknown.includes("Top candidates are close in score")) &&
      whyNotOtherCandidates.some(
        (decision) =>
          decision.path === input.fixture.expectedFile &&
          decision.symbol === input.fixture.expectedSymbol
      ));
  const minimalNextActionHit =
    input.fixture.expectedMinimalTestCommand === undefined ||
    expectedSourceCandidates.some(
      (candidate) =>
        candidate.next_actions.some((action) => action === input.fixture.expectedMinimalTestCommand)
    );
  const relatedTestFileHit = expectsDirectTest
    ? relatedTestForExpectedCandidateHit
    : noDirectTestHonesty;
  const evidenceComplete =
    candidates.length > 0 &&
    candidates.every((candidate) => candidate.evidence.length > 0);
  const lineRangeComplete =
    candidates.length > 0 &&
    candidates.every((candidate) => Array.isArray(candidate.line_range));
  const relatedTestsComplete = expectsDirectTest
    ? candidates.length > 0 &&
      candidates.every((candidate) =>
        candidate.path.includes("test") ||
        candidate.path.includes("spec") ||
        (candidate.related_tests?.length ?? 0) > 0
      )
    : candidates.length > 0 && topCandidateHasNoRelatedTests;
  const unknownsComplete = unknowns.length >= 2 && unknowns.every((unknown) => unknown.length >= 20);
  const whyNotComplete =
    candidates.length <= 1 ||
    (whyNotOtherCandidates.length >= Math.min(2, candidates.length - 1) &&
      whyNotOtherCandidates.every(
        (decision) => decision.path.length > 0 && decision.reason.length >= 20
      ));
  const nextActionsComplete =
    candidates.length > 0 &&
    candidates.every((candidate) => candidate.next_actions.length >= 2);
  const secretIgnored = secretSearchResults.length === 0 && indexStats.files < input.fixture.files.length;
  const passed =
    (expectsAmbiguousTop3 || top1FileHit) &&
    (expectsAmbiguousTop3 || top1SymbolHit) &&
    top3FileHit &&
    top3SymbolHit &&
    top5TestFileHit &&
    relatedTestFileHit &&
    noDirectTestHonesty &&
    callGraphRootCauseHit &&
    indirectRelatedTestHit &&
    ambiguousTop3Honesty &&
    minimalNextActionHit &&
    evidenceComplete &&
    lineRangeComplete &&
    relatedTestsComplete &&
    unknownsComplete &&
    whyNotComplete &&
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
    expectsDirectTest,
    requiresCallGraph,
    requiresIndirectTest,
    expectsAmbiguousTop3,
    expectsMinimalNextAction,
    topCandidatePath: top?.path ?? null,
    topCandidateSymbol: top?.symbol ?? null,
    topCandidateEvidence: top?.evidence ?? [],
    topCandidateNextActions: top?.next_actions ?? [],
    topRootCausePath: topRootCause?.path ?? null,
    topRootCauseSymbol: topRootCause?.symbol ?? null,
    topRootCauseEvidence: topRootCause?.evidence ?? [],
    unknowns,
    whyNotOtherCandidates: whyNotOtherCandidates.map((decision) => ({
      path: decision.path,
      symbol: decision.symbol,
      reason: decision.reason
    })),
    topCandidateRelatedTests: (top?.related_tests ?? []).map((test) => ({
      path: test.path,
      symbol: test.symbol,
      command: test.command,
      evidence: test.evidence
    })),
    expectedSourceRelatedTests: expectedSourceCandidates.flatMap((candidate) =>
      (candidate.related_tests ?? []).map((test) => ({
        path: test.path,
        symbol: test.symbol,
        command: test.command,
        evidence: test.evidence
      }))
    ),
    top1FileHit,
    top1SymbolHit,
    top3FileHit,
    top3SymbolHit,
    top5TestFileHit,
    relatedTestFileHit,
    noDirectTestHonesty,
    callGraphRootCauseHit,
    indirectRelatedTestHit,
    ambiguousTop3Honesty,
    minimalNextActionHit,
    evidenceComplete,
    lineRangeComplete,
    relatedTestsComplete,
    unknownsComplete,
    whyNotComplete,
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
  top1SymbolAccuracy: number;
  top3FileAccuracy: number;
  top3SymbolAccuracy: number;
  top5TestFileAccuracy: number;
  relatedTestAccuracy: number;
  noDirectTestHonestyRate: number;
  callGraphRootCauseAccuracy: number;
  indirectRelatedTestAccuracy: number;
  ambiguousTop3HonestyRate: number;
  minimalNextActionAccuracy: number;
  evidenceCompleteness: number;
  lineRangeCompleteness: number;
  relatedTestsCompleteness: number;
  unknownsCompleteness: number;
  whyNotCompleteness: number;
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
    `Top-1 symbol accuracy: ${pct(input.top1SymbolAccuracy)}`,
    `Top-3 file accuracy: ${pct(input.top3FileAccuracy)}`,
    `Top-3 symbol accuracy: ${pct(input.top3SymbolAccuracy)}`,
    `Test file reachability: ${pct(input.top5TestFileAccuracy)}`,
    `Related test accuracy: ${pct(input.relatedTestAccuracy)}`,
    `No-direct-test honesty rate: ${pct(input.noDirectTestHonestyRate)}`,
    `Call graph root-cause accuracy: ${pct(input.callGraphRootCauseAccuracy)}`,
    `Indirect related-test accuracy: ${pct(input.indirectRelatedTestAccuracy)}`,
    `Ambiguous top-3 honesty rate: ${pct(input.ambiguousTop3HonestyRate)}`,
    `Minimal next-action accuracy: ${pct(input.minimalNextActionAccuracy)}`,
    `Evidence completeness: ${pct(input.evidenceCompleteness)}`,
    `Line range completeness: ${pct(input.lineRangeCompleteness)}`,
    `Related tests completeness: ${pct(input.relatedTestsCompleteness)}`,
    `Unknowns completeness: ${pct(input.unknownsCompleteness)}`,
    `Why-not completeness: ${pct(input.whyNotCompleteness)}`,
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
    lines.push(`- Expects direct test: ${result.expectsDirectTest ? "yes" : "no"}`);
    lines.push(`- Requires call graph: ${result.requiresCallGraph ? "yes" : "no"}`);
    lines.push(`- Requires indirect test: ${result.requiresIndirectTest ? "yes" : "no"}`);
    lines.push(`- Expects ambiguous top-3: ${result.expectsAmbiguousTop3 ? "yes" : "no"}`);
    lines.push(`- Expects minimal next action: ${result.expectsMinimalNextAction ? "yes" : "no"}`);
    lines.push(`- Top candidate: ${result.topCandidatePath ?? "none"} / ${result.topCandidateSymbol ?? "none"}`);
    lines.push(`- Top candidate evidence: ${result.topCandidateEvidence.join(" | ") || "none"}`);
    lines.push(`- Top candidate next actions: ${result.topCandidateNextActions.join(" | ") || "none"}`);
    lines.push(`- Top root cause: ${result.topRootCausePath ?? "none"} / ${result.topRootCauseSymbol ?? "none"}`);
    lines.push(`- Top root cause evidence: ${result.topRootCauseEvidence.join(" | ") || "none"}`);
    lines.push(`- Unknowns: ${result.unknowns.join(" | ") || "none"}`);
    lines.push(
      `- Why not other candidates: ${
        result.whyNotOtherCandidates
          .map((decision) => `${decision.path} / ${decision.symbol ?? "none"}: ${decision.reason}`)
          .join(" | ") || "none"
      }`
    );
    lines.push(
      `- Top candidate related tests: ${
        result.topCandidateRelatedTests
          .map((test) => `${test.path} / ${test.symbol ?? "file"} (${test.command})`)
          .join(", ") || "none"
      }`
    );
    lines.push(
      `- Expected source related tests: ${
        result.expectedSourceRelatedTests
          .map((test) => `${test.path} / ${test.symbol ?? "file"} (${test.command})`)
          .join(", ") || "none"
      }`
    );
    lines.push(`- Top-1 file hit: ${result.top1FileHit ? "yes" : "no"}`);
    lines.push(`- Top-1 symbol hit: ${result.top1SymbolHit ? "yes" : "no"}`);
    lines.push(`- Top-3 file hit: ${result.top3FileHit ? "yes" : "no"}`);
    lines.push(`- Top-3 symbol hit: ${result.top3SymbolHit ? "yes" : "no"}`);
    lines.push(`- Test file reachable: ${result.top5TestFileHit ? "yes" : "no"}`);
    lines.push(`- Related test file hit: ${result.relatedTestFileHit ? "yes" : "no"}`);
    lines.push(
      `- No-direct-test honesty: ${
        result.expectsDirectTest ? "n/a" : result.noDirectTestHonesty ? "yes" : "no"
      }`
    );
    lines.push(
      `- Call graph root cause hit: ${
        result.requiresCallGraph ? (result.callGraphRootCauseHit ? "yes" : "no") : "n/a"
      }`
    );
    lines.push(
      `- Indirect related test hit: ${
        result.requiresIndirectTest ? (result.indirectRelatedTestHit ? "yes" : "no") : "n/a"
      }`
    );
    lines.push(
      `- Ambiguous top-3 honesty: ${
        result.expectsAmbiguousTop3 ? (result.ambiguousTop3Honesty ? "yes" : "no") : "n/a"
      }`
    );
    lines.push(
      `- Minimal next action hit: ${
        result.expectsMinimalNextAction ? (result.minimalNextActionHit ? "yes" : "no") : "n/a"
      }`
    );
    lines.push(`- Evidence complete: ${result.evidenceComplete ? "yes" : "no"}`);
    lines.push(`- Line ranges complete: ${result.lineRangeComplete ? "yes" : "no"}`);
    lines.push(`- Related tests complete: ${result.relatedTestsComplete ? "yes" : "no"}`);
    lines.push(`- Unknowns complete: ${result.unknownsComplete ? "yes" : "no"}`);
    lines.push(`- Why-not complete: ${result.whyNotComplete ? "yes" : "no"}`);
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
    top1SymbolAccuracy: Number(averageBooleans(results.map((result) => result.top1SymbolHit)).toFixed(3)),
    top3FileAccuracy: Number(averageBooleans(results.map((result) => result.top3FileHit)).toFixed(3)),
    top3SymbolAccuracy: Number(averageBooleans(results.map((result) => result.top3SymbolHit)).toFixed(3)),
    top5TestFileAccuracy: Number(averageBooleans(results.map((result) => result.top5TestFileHit)).toFixed(3)),
    relatedTestAccuracy: Number(averageBooleans(results.map((result) => result.relatedTestFileHit)).toFixed(3)),
    noDirectTestHonestyRate: Number(
      averageBooleans(
        results
          .filter((result) => !result.expectsDirectTest)
          .map((result) => result.noDirectTestHonesty)
      ).toFixed(3)
    ),
    callGraphRootCauseAccuracy: Number(
      averageBooleans(
        results
          .filter((result) => result.requiresCallGraph)
          .map((result) => result.callGraphRootCauseHit)
      ).toFixed(3)
    ),
    indirectRelatedTestAccuracy: Number(
      averageBooleans(
        results
          .filter((result) => result.requiresIndirectTest)
          .map((result) => result.indirectRelatedTestHit)
      ).toFixed(3)
    ),
    ambiguousTop3HonestyRate: Number(
      averageBooleans(
        results
          .filter((result) => result.expectsAmbiguousTop3)
          .map((result) => result.ambiguousTop3Honesty)
      ).toFixed(3)
    ),
    minimalNextActionAccuracy: Number(
      averageBooleans(
        results
          .filter((result) => result.expectsMinimalNextAction)
          .map((result) => result.minimalNextActionHit)
      ).toFixed(3)
    ),
    evidenceCompleteness: Number(averageBooleans(results.map((result) => result.evidenceComplete)).toFixed(3)),
    lineRangeCompleteness: Number(averageBooleans(results.map((result) => result.lineRangeComplete)).toFixed(3)),
    relatedTestsCompleteness: Number(averageBooleans(results.map((result) => result.relatedTestsComplete)).toFixed(3)),
    unknownsCompleteness: Number(averageBooleans(results.map((result) => result.unknownsComplete)).toFixed(3)),
    whyNotCompleteness: Number(averageBooleans(results.map((result) => result.whyNotComplete)).toFixed(3)),
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
      `Top-1 symbol accuracy: ${pct(report.top1SymbolAccuracy)}`,
      `Top-3 file accuracy: ${pct(report.top3FileAccuracy)}`,
      `Top-3 symbol accuracy: ${pct(report.top3SymbolAccuracy)}`,
      `Test file reachability: ${pct(report.top5TestFileAccuracy)}`,
      `Related test accuracy: ${pct(report.relatedTestAccuracy)}`,
      `No-direct-test honesty rate: ${pct(report.noDirectTestHonestyRate)}`,
      `Call graph root-cause accuracy: ${pct(report.callGraphRootCauseAccuracy)}`,
      `Indirect related-test accuracy: ${pct(report.indirectRelatedTestAccuracy)}`,
      `Ambiguous top-3 honesty rate: ${pct(report.ambiguousTop3HonestyRate)}`,
      `Minimal next-action accuracy: ${pct(report.minimalNextActionAccuracy)}`,
      `Evidence completeness: ${pct(report.evidenceCompleteness)}`,
      `Line range completeness: ${pct(report.lineRangeCompleteness)}`,
      `Related tests completeness: ${pct(report.relatedTestsCompleteness)}`,
      `Unknowns completeness: ${pct(report.unknownsCompleteness)}`,
      `Why-not completeness: ${pct(report.whyNotCompleteness)}`,
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

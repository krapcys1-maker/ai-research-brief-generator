import type { EvidenceBucket } from "@/lib/project-research/types";

const REQUIRED_ANCHOR_TERMS_BY_BUCKET: Record<string, string[]> = {
  model_experiments: [
    "trading",
    "algorithmic trading",
    "financial",
    "portfolio",
    "stock",
    "asset",
    "returns"
  ],
  backtest_validation: [
    "backtest",
    "trading",
    "strategy",
    "portfolio",
    "market",
    "sharpe"
  ],
  data_correctness: [
    "financial",
    "market",
    "trading",
    "time series",
    "price",
    "returns",
    "asset"
  ],
  execution_market_impact: [
    "trading",
    "algorithmic trading",
    "financial",
    "portfolio",
    "stock",
    "asset",
    "market microstructure"
  ],
  risk_governance: [
    "trading",
    "pre-trade",
    "portfolio",
    "market",
    "strategy",
    "financial"
  ],
  clinical_evidence: [
    "clinical",
    "diagnostic",
    "patient",
    "medical",
    "healthcare"
  ],
  safety_validation: [
    "medical",
    "clinical",
    "patient",
    "healthcare",
    "uncertainty",
    "human oversight"
  ],
  privacy_compliance: [
    "healthcare",
    "patient",
    "medical",
    "clinical"
  ],
  workflow_integration: [
    "clinical workflow",
    "clinician",
    "doctor",
    "patient",
    "healthcare"
  ],
  legal_retrieval: [
    "legal",
    "law",
    "court",
    "case law",
    "statute"
  ],
  contract_analysis: [
    "legal",
    "law"
  ],
  compliance_risk: [
    "compliance",
    "legal",
    "regulation",
    "regulatory",
    "auditability"
  ],
  human_review: [
    "legal",
    "law",
    "contract",
    "document review",
    "legal workflow"
  ],
  cli_observability: [
    "cli",
    "command line",
    "command-line",
    "terminal",
    "developer",
    "software",
    "bug report",
    "issue report",
    "logs",
    "telemetry"
  ],
  auth_proxy_failure_modes: [
    "authentication",
    "auth",
    "proxy",
    "routing",
    "api",
    "configuration",
    "developer",
    "software",
    "terminal",
    "command"
  ],
  sandbox_preflight_checks: [
    "agent",
    "llm agent",
    "sandbox",
    "sandboxed",
    "runtime",
    "tool call",
    "execution gate"
  ],
  tool_policy_safety: [
    "agent",
    "tool",
    "tool use",
    "sandbox",
    "permission",
    "capability",
    "policy"
  ],
  runtime_observability: [
    "agent",
    "container",
    "sandbox",
    "runtime",
    "tool",
    "logs",
    "telemetry"
  ],
  release_gate_replay: [
    "agent",
    "sandbox",
    "replay",
    "fixture",
    "release gate",
    "runtime"
  ],
  self_hosted_security_controls: [
    "self-hosted",
    "self hosted",
    "secrets",
    "workspace",
    "local data"
  ],
  ai_workspace_governance: [
    "workspace",
    "tool approval",
    "policy readiness",
    "privacy",
    "ai workspace",
    "governance"
  ],
  local_first_privacy: [
    "local-first",
    "local first",
    "self-hosted",
    "self hosted",
    "local data",
    "data boundary"
  ],
  deployment_readiness_audit: [
    "deployment readiness",
    "configuration audit",
    "remediation",
    "self-hosted",
    "workspace",
    "security"
  ],
  document_structure_preservation: [
    "document",
    "pdf",
    "markdown",
    "ocr"
  ],
  rag_ingestion_quality: [
    "rag",
    "retrieval augmented generation",
    "ingestion",
    "document ingestion",
    "grounding"
  ],
  conversion_regression_fixtures: [
    "document",
    "pdf",
    "ocr",
    "fixture",
    "regression test",
    "table"
  ],
  unsafe_document_inputs: [
    "document",
    "untrusted",
    "prompt injection",
    "rag",
    "ingestion",
    "llm"
  ],
  domain_methods: [
    "artificial intelligence",
    "machine learning",
    "ai system",
    "ml system"
  ],
  data_requirements: [
    "machine learning",
    "ai system",
    "training data",
    "dataset",
    "data quality"
  ],
  evaluation_validation: [
    "artificial intelligence",
    "machine learning",
    "ai system",
    "model evaluation"
  ],
  risk_safety: [
    "artificial intelligence",
    "machine learning",
    "ai system",
    "model risk"
  ],
  implementation_operations: [
    "production ai",
    "ai system",
    "machine learning",
    "mlops",
    "model monitoring"
  ]
};

const STOP_TERMS = new Set([
  "and",
  "for",
  "from",
  "how",
  "the",
  "with",
  "system",
  "systems",
  "review",
  "survey",
  "benchmark",
  "evaluation"
]);

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenize(value: string) {
  return normalize(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length > 2 && !STOP_TERMS.has(term));
}

function phraseOrTokenMatch(text: string, keyword: string) {
  const normalizedKeyword = normalize(keyword);
  const keywordTerms = tokenize(keyword);

  if (!keywordTerms.length) {
    return false;
  }

  if (keywordTerms.length === 1) {
    return new Set(tokenize(text)).has(keywordTerms[0]);
  }

  if (text.includes(normalizedKeyword)) {
    return true;
  }

  const hitCount = keywordTerms.filter((term) => text.includes(term)).length;
  return hitCount >= Math.min(keywordTerms.length, 2);
}

export function requiredAnchorsForBucket(bucketId: string) {
  return REQUIRED_ANCHOR_TERMS_BY_BUCKET[bucketId] ?? [];
}

export function hasRequiredBucketAnchor(bucket: EvidenceBucket, text: string) {
  const anchors = requiredAnchorsForBucket(bucket.id);

  if (!anchors.length) {
    return true;
  }

  return anchors.some((anchor) => phraseOrTokenMatch(text, anchor));
}

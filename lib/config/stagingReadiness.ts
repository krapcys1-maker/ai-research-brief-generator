import { getEmbeddingConfigSummary } from "@/lib/embeddings/diagnostics";

export type StagingReadinessStatus = "pass" | "warn" | "fail";

export type StagingReadinessCheck = {
  id: string;
  label: string;
  status: StagingReadinessStatus;
  required: boolean;
  message: string;
  remediation?: string;
};

export type StagingReadinessReport = {
  ready: boolean;
  failed: number;
  warnings: number;
  checks: StagingReadinessCheck[];
  commandSequence: string[];
  rollbackProcedure: string[];
};

type EnvLike = Record<string, string | undefined>;

const trueValues = new Set(["1", "true", "yes", "on"]);
const falseValues = new Set(["0", "false", "no", "off"]);

function normalized(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function parseBoolean(value: string | undefined) {
  const parsed = normalized(value);

  if (!parsed) {
    return null;
  }

  if (trueValues.has(parsed)) {
    return true;
  }

  if (falseValues.has(parsed)) {
    return false;
  }

  return null;
}

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

function check(
  condition: boolean,
  input: Omit<StagingReadinessCheck, "status" | "message"> & {
    failMessage: string;
    passMessage: string;
  }
): StagingReadinessCheck {
  return {
    id: input.id,
    label: input.label,
    required: input.required,
    status: condition ? "pass" : "fail",
    message: condition ? input.passMessage : input.failMessage,
    remediation: condition ? undefined : input.remediation
  };
}

function warn(
  condition: boolean,
  input: Omit<StagingReadinessCheck, "status" | "required" | "message"> & {
    warnMessage: string;
    passMessage: string;
  }
): StagingReadinessCheck {
  return {
    id: input.id,
    label: input.label,
    required: false,
    status: condition ? "pass" : "warn",
    message: condition ? input.passMessage : input.warnMessage,
    remediation: condition ? undefined : input.remediation
  };
}

export function getStagingReadinessReport(
  env: EnvLike = process.env
): StagingReadinessReport {
  const databaseUrl = env.DATABASE_URL?.trim() ?? "";
  const databaseIsPostgres =
    databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("postgres://");
  const rateLimitBackend = normalized(env.RATE_LIMIT_BACKEND);
  const smokeSkipAi = parseBoolean(env.SMOKE_SKIP_AI);
  const briefJobAutorun = parseBoolean(env.BRIEF_JOB_AUTORUN);
  const documentAuthRequired = parseBoolean(env.DOCUMENT_AUTH_REQUIRED);
  const privacyNotice = parseBoolean(env.DEPLOYMENT_PRIVACY_NOTICE);
  const publicBriefHistory = parseBoolean(env.PUBLIC_BRIEF_HISTORY_ENABLED);
  const sessionUploadsEscape = parseBoolean(
    env.ALLOW_SESSION_DOCUMENT_UPLOADS_IN_PRODUCTION
  );
  const embeddingConfig = getEmbeddingConfigSummary(env);
  const missingUpstash = [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN"
  ].filter((name) => !hasValue(env[name]));

  const checks: StagingReadinessCheck[] = [
    check(normalized(env.NODE_ENV) === "production", {
      id: "runtime-production",
      label: "Production runtime",
      required: true,
      passMessage: "NODE_ENV is set to production.",
      failMessage: "NODE_ENV is not set to production.",
      remediation: "Run staging with the same production runtime mode as the final deploy."
    }),
    check(databaseIsPostgres, {
      id: "postgres-url",
      label: "PostgreSQL database",
      required: true,
      passMessage: "DATABASE_URL points to PostgreSQL.",
      failMessage: "DATABASE_URL is missing or is not a PostgreSQL URL.",
      remediation: "Set DATABASE_URL to the staging PostgreSQL connection string."
    }),
    check(parseBoolean(env.ALLOW_MEMORY_STORAGE_IN_PRODUCTION) !== true, {
      id: "storage-escape-hatch",
      label: "No memory storage escape hatch",
      required: true,
      passMessage: "ALLOW_MEMORY_STORAGE_IN_PRODUCTION is not enabled.",
      failMessage: "ALLOW_MEMORY_STORAGE_IN_PRODUCTION is enabled.",
      remediation: "Disable the memory storage escape hatch before staging/public deploy."
    }),
    check(
      rateLimitBackend === "upstash" && missingUpstash.length === 0,
      {
        id: "upstash-rate-limit",
        label: "Shared Upstash rate limiting",
        required: true,
        passMessage: "RATE_LIMIT_BACKEND=upstash and Upstash credentials are present.",
        failMessage:
          missingUpstash.length > 0
            ? `Missing Upstash configuration: ${missingUpstash.join(", ")}.`
            : "RATE_LIMIT_BACKEND is not set to upstash.",
        remediation:
          "Set RATE_LIMIT_BACKEND=upstash, UPSTASH_REDIS_REST_URL, and UPSTASH_REDIS_REST_TOKEN."
      }
    ),
    check(parseBoolean(env.ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION) !== true, {
      id: "rate-limit-escape-hatch",
      label: "No memory rate-limit escape hatch",
      required: true,
      passMessage: "ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION is not enabled.",
      failMessage: "ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION is enabled.",
      remediation: "Disable the memory rate-limit escape hatch before staging/public deploy."
    }),
    check(normalized(env.AI_PROVIDER || "deepseek") === "deepseek", {
      id: "ai-provider",
      label: "AI provider",
      required: true,
      passMessage: "AI_PROVIDER uses DeepSeek.",
      failMessage: "AI_PROVIDER is not deepseek.",
      remediation: "Use AI_PROVIDER=deepseek until another provider is implemented."
    }),
    check(hasValue(env.DEEPSEEK_API_KEY), {
      id: "deepseek-key",
      label: "DeepSeek secret",
      required: true,
      passMessage: "DEEPSEEK_API_KEY is present.",
      failMessage: "DEEPSEEK_API_KEY is missing.",
      remediation: "Add DEEPSEEK_API_KEY to the staging secret store."
    }),
    check(hasValue(env.AI_MODEL), {
      id: "ai-model",
      label: "AI model",
      required: true,
      passMessage: "AI_MODEL is explicitly configured.",
      failMessage: "AI_MODEL is not explicitly configured.",
      remediation: "Set AI_MODEL to the intended production DeepSeek model."
    }),
    warn(hasValue(env.AI_REQUEST_TIMEOUT_MS), {
      id: "ai-timeout",
      label: "AI timeout",
      passMessage: "AI_REQUEST_TIMEOUT_MS is explicitly configured.",
      warnMessage: "AI_REQUEST_TIMEOUT_MS is not explicitly configured.",
      remediation: "Set AI_REQUEST_TIMEOUT_MS for the expected staging latency."
    }),
    check(
      embeddingConfig.provider === "openai_compatible" && embeddingConfig.ready,
      {
        id: "model-grade-embeddings",
        label: "Model-grade embeddings",
        required: true,
        passMessage: "OpenAI-compatible embedding provider is configured.",
        failMessage:
          embeddingConfig.provider === "unsupported"
            ? `Unsupported EMBEDDING_PROVIDER "${embeddingConfig.configuredProvider}".`
            : embeddingConfig.provider === "local"
              ? "EMBEDDING_PROVIDER uses the local fallback."
              : `Missing embedding configuration: ${embeddingConfig.missing.join(", ")}.`,
        remediation:
          "Set EMBEDDING_PROVIDER=openai_compatible, EMBEDDING_BASE_URL, EMBEDDING_API_KEY, and EMBEDDING_MODEL."
      }
    ),
    check(briefJobAutorun === false, {
      id: "worker-split",
      label: "Worker split",
      required: true,
      passMessage: "BRIEF_JOB_AUTORUN=false is set for the web process.",
      failMessage: "BRIEF_JOB_AUTORUN is not false for the web process.",
      remediation:
        "Set BRIEF_JOB_AUTORUN=false and run npm run worker:briefs as a separate process."
    }),
    check(documentAuthRequired === true, {
      id: "document-auth",
      label: "Trusted document ownership",
      required: true,
      passMessage: "DOCUMENT_AUTH_REQUIRED=true is set.",
      failMessage: "DOCUMENT_AUTH_REQUIRED is not true.",
      remediation:
        "Require trusted user/workspace headers before public multi-user uploads."
    }),
    check(publicBriefHistory !== true, {
      id: "public-history",
      label: "Public brief history disabled",
      required: true,
      passMessage: "PUBLIC_BRIEF_HISTORY_ENABLED is not enabled.",
      failMessage: "PUBLIC_BRIEF_HISTORY_ENABLED is enabled.",
      remediation: "Keep public brief history disabled for public multi-user SaaS."
    }),
    check(sessionUploadsEscape !== true, {
      id: "session-upload-escape-hatch",
      label: "No session upload escape hatch",
      required: true,
      passMessage: "Session upload production escape hatch is not enabled.",
      failMessage: "ALLOW_SESSION_DOCUMENT_UPLOADS_IN_PRODUCTION is enabled.",
      remediation: "Disable session-scoped production uploads for public SaaS."
    }),
    check(privacyNotice !== false, {
      id: "privacy-notice",
      label: "Privacy notice",
      required: true,
      passMessage: "DEPLOYMENT_PRIVACY_NOTICE is enabled or using the production default.",
      failMessage: "DEPLOYMENT_PRIVACY_NOTICE is explicitly disabled.",
      remediation: "Enable DEPLOYMENT_PRIVACY_NOTICE or provide equivalent policy copy."
    }),
    check(hasValue(env.SMOKE_BASE_URL), {
      id: "smoke-target",
      label: "Remote smoke target",
      required: true,
      passMessage: "SMOKE_BASE_URL points to the staging deployment.",
      failMessage: "SMOKE_BASE_URL is missing.",
      remediation: "Set SMOKE_BASE_URL to the staging URL before running smoke."
    }),
    check(smokeSkipAi !== true, {
      id: "full-ai-smoke",
      label: "Full AI smoke",
      required: true,
      passMessage: "SMOKE_SKIP_AI is not enabled.",
      failMessage: "SMOKE_SKIP_AI=true would skip AI-backed smoke steps.",
      remediation: "Unset SMOKE_SKIP_AI or set SMOKE_SKIP_AI=false for final staging smoke."
    })
  ];

  const failed = checks.filter((item) => item.status === "fail").length;
  const warnings = checks.filter((item) => item.status === "warn").length;

  return {
    ready: failed === 0,
    failed,
    warnings,
    checks,
    commandSequence: [
      "npm run staging:check",
      "npx prisma migrate deploy",
      "npm run embedding:check",
      "npm run build",
      "SMOKE_BASE_URL=https://staging.example npm run smoke:deploy",
      "npm run worker:briefs"
    ],
    rollbackProcedure: [
      "Keep PostgreSQL online and preserve backups/snapshots.",
      "Roll back the app/worker release first; do not drop production tables.",
      "Stop or scale down the worker if it is processing bad jobs.",
      "Treat Prisma migrations as forward-only unless a tested manual rollback exists.",
      "Run npm run staging:check and npm run smoke:deploy again after rollback."
    ]
  };
}

export function formatStagingReadinessReport(report: StagingReadinessReport) {
  const lines = [
    "Staging readiness check",
    `Status: ${report.ready ? "ready" : "not ready"}`,
    `Failures: ${report.failed}`,
    `Warnings: ${report.warnings}`,
    "",
    "Checks:"
  ];

  for (const item of report.checks) {
    lines.push(`- [${item.status}] ${item.label}: ${item.message}`);

    if (item.remediation) {
      lines.push(`  Fix: ${item.remediation}`);
    }
  }

  lines.push("", "Required command sequence:");
  for (const command of report.commandSequence) {
    lines.push(`- ${command}`);
  }

  lines.push("", "Rollback procedure:");
  for (const step of report.rollbackProcedure) {
    lines.push(`- ${step}`);
  }

  return lines.join("\n");
}

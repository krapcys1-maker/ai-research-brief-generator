import { describe, expect, it } from "vitest";
import {
  formatStagingReadinessReport,
  getStagingReadinessReport
} from "@/lib/config/stagingReadiness";

const readyEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:pass@db.example.test:5432/app",
  RATE_LIMIT_BACKEND: "upstash",
  UPSTASH_REDIS_REST_URL: "https://upstash.example.test",
  UPSTASH_REDIS_REST_TOKEN: "upstash-token",
  AI_PROVIDER: "deepseek",
  AI_MODEL: "deepseek-v4-pro",
  DEEPSEEK_API_KEY: "deepseek-key",
  AI_REQUEST_TIMEOUT_MS: "90000",
  EMBEDDING_PROVIDER: "openai_compatible",
  EMBEDDING_BASE_URL: "https://embeddings.example.test/v1",
  EMBEDDING_API_KEY: "embedding-key",
  EMBEDDING_MODEL: "text-embedding-3-large",
  BRIEF_JOB_AUTORUN: "false",
  DOCUMENT_AUTH_REQUIRED: "true",
  PUBLIC_BRIEF_HISTORY_ENABLED: "false",
  DEPLOYMENT_PRIVACY_NOTICE: "true",
  SMOKE_BASE_URL: "https://staging.example.test",
  SMOKE_SKIP_AI: "false"
};

describe("staging readiness", () => {
  it("fails closed when staging-critical configuration is missing", () => {
    const report = getStagingReadinessReport({});

    expect(report.ready).toBe(false);
    expect(report.failed).toBeGreaterThan(0);
    expect(report.checks.find((item) => item.id === "postgres-url")?.status).toBe(
      "fail"
    );
    expect(
      report.checks.find((item) => item.id === "upstash-rate-limit")?.status
    ).toBe("fail");
    expect(report.checks.find((item) => item.id === "deepseek-key")?.status).toBe(
      "fail"
    );
    expect(
      report.checks.find((item) => item.id === "model-grade-embeddings")?.status
    ).toBe("fail");
  });

  it("passes for a complete staging configuration", () => {
    const report = getStagingReadinessReport(readyEnv);

    expect(report.ready).toBe(true);
    expect(report.failed).toBe(0);
    expect(report.warnings).toBe(0);
    expect(report.commandSequence).toContain("npx prisma migrate deploy");
    expect(report.commandSequence).toContain("npm run embedding:check");
    expect(report.rollbackProcedure.join(" ")).toContain("forward-only");
  });

  it("blocks AI-skipped smoke and web-process autorun", () => {
    const report = getStagingReadinessReport({
      ...readyEnv,
      BRIEF_JOB_AUTORUN: "true",
      SMOKE_SKIP_AI: "true"
    });

    expect(report.ready).toBe(false);
    expect(report.checks.find((item) => item.id === "worker-split")?.status).toBe(
      "fail"
    );
    expect(report.checks.find((item) => item.id === "full-ai-smoke")?.status).toBe(
      "fail"
    );
  });

  it("formats a readable operator report", () => {
    const report = getStagingReadinessReport({
      ...readyEnv,
      AI_REQUEST_TIMEOUT_MS: ""
    });
    const formatted = formatStagingReadinessReport(report);

    expect(report.ready).toBe(true);
    expect(report.warnings).toBe(1);
    expect(formatted).toContain("Staging readiness check");
    expect(formatted).toContain("[warn] AI timeout");
    expect(formatted).toContain("Rollback procedure");
  });
});

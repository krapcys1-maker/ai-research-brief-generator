import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createStructuredLogEvent,
  structuredLogger
} from "@/lib/observability/structuredLogger";

const originalNodeEnv = process.env.NODE_ENV;

function setNodeEnv(value: string) {
  Object.defineProperty(process.env, "NODE_ENV", {
    value,
    writable: true,
    configurable: true,
    enumerable: true
  });
}

describe("structured logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setNodeEnv(originalNodeEnv ?? "test");
    delete process.env.STRUCTURED_LOGS;
    delete process.env.LOG_SERVICE_NAME;
    delete process.env.LOG_INCLUDE_STACK;
  });

  it("builds structured events with service and environment metadata", () => {
    setNodeEnv("production");
    process.env.LOG_SERVICE_NAME = "brief-worker";

    const event = createStructuredLogEvent("info", "brief_worker.job_processed", {
      jobId: "job_123",
      status: "completed"
    });

    expect(event).toMatchObject({
      level: "info",
      event: "brief_worker.job_processed",
      service: "brief-worker",
      environment: "production",
      jobId: "job_123",
      status: "completed"
    });
    expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("redacts sensitive fields and normalizes errors", () => {
    const event = createStructuredLogEvent("error", "brief_api.failed", {
      authorization: "Bearer secret",
      nested: {
        apiKey: "sk-secret",
        safe: "visible"
      },
      error: new Error("Provider timed out")
    });

    expect(event.authorization).toBe("[redacted]");
    expect(event.nested).toEqual({
      apiKey: "[redacted]",
      safe: "visible"
    });
    expect(event.error).toMatchObject({
      name: "Error",
      message: "Provider timed out"
    });
    expect((event.error as { stack?: string }).stack).toBeUndefined();
  });

  it("writes JSON logs in production", () => {
    setNodeEnv("production");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    structuredLogger.info("brief_api.job_created", {
      jobId: "job_json",
      sessionToken: "private"
    });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(logSpy.mock.calls[0][0] as string);

    expect(payload).toMatchObject({
      level: "info",
      event: "brief_api.job_created",
      jobId: "job_json",
      sessionToken: "[redacted]"
    });
  });

  it("keeps readable logs outside production unless explicitly enabled", () => {
    setNodeEnv("test");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    structuredLogger.warn("brief_api.rate_limited", {
      limit: 5
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[warn] brief_api.rate_limited")
    );
  });
});

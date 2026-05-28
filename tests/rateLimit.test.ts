import { afterEach, describe, expect, it, vi } from "vitest";
import {
  checkRateLimit,
  RateLimitConfigurationError,
  resetRateLimitForTests
} from "@/lib/security/rateLimit";

describe("rate limit backend selection", () => {
  afterEach(() => {
    resetRateLimitForTests();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses in-memory limiting outside production", async () => {
    vi.stubEnv("BRIEF_RATE_LIMIT_MAX", "1");
    vi.stubEnv("BRIEF_RATE_LIMIT_WINDOW_MS", "60000");

    const first = await checkRateLimit({ key: "brief:test-memory" });
    const second = await checkRateLimit({ key: "brief:test-memory" });

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(0);
    expect(second.allowed).toBe(false);
    expect(second.remaining).toBe(0);
  });

  it("fails fast in production without shared rate limiting", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_BACKEND", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION", "");

    await expect(checkRateLimit({ key: "brief:test-prod" })).rejects.toThrow(
      RateLimitConfigurationError
    );
    await expect(checkRateLimit({ key: "brief:test-prod" })).rejects.toThrow(
      "Production requires a shared rate limit backend"
    );
  });

  it("allows explicit temporary memory limiting in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_MEMORY_RATE_LIMIT_IN_PRODUCTION", "true");
    vi.stubEnv("BRIEF_RATE_LIMIT_MAX", "1");
    vi.stubEnv("BRIEF_RATE_LIMIT_WINDOW_MS", "60000");

    const first = await checkRateLimit({ key: "brief:test-prod-memory" });
    const second = await checkRateLimit({ key: "brief:test-prod-memory" });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
  });

  it("uses Upstash REST when configured", async () => {
    vi.stubEnv("RATE_LIMIT_BACKEND", "upstash");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example-upstash.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([{ result: 2 }, { result: 1 }, { result: 120 }]),
        { status: 200 }
      )
    );

    vi.stubGlobal("fetch", fetchMock);

    const result = await checkRateLimit({
      key: "brief:test-upstash",
      limit: 5,
      windowMs: 120000
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(3);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example-upstash.test/multi-exec",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json"
        }),
        body: JSON.stringify([
          ["INCR", "brief:test-upstash"],
          ["EXPIRE", "brief:test-upstash", 120, "NX"],
          ["TTL", "brief:test-upstash"]
        ])
      })
    );
  });

  it("blocks requests when Upstash count exceeds the limit", async () => {
    vi.stubEnv("RATE_LIMIT_BACKEND", "upstash");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example-upstash.test/");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([{ result: 6 }, { result: 1 }, { result: 30 }]),
          { status: 200 }
        )
      )
    );

    const result = await checkRateLimit({
      key: "brief:test-upstash-blocked",
      limit: 5,
      windowMs: 60000
    });

    expect(result.allowed).toBe(false);

    if (!result.allowed) {
      expect(result.retryAfterSeconds).toBe(30);
      expect(result.remaining).toBe(0);
    }
  });
});

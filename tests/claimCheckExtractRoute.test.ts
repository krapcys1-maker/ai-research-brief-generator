import { afterEach, describe, expect, it, vi } from "vitest";
import { resetRateLimitForTests } from "@/lib/security/rateLimit";

function claimText() {
  return [
    "RAG reduces hallucinations in clinical AI systems.",
    "RAG does not eliminate unsupported claims in clinical AI systems."
  ].join(" ");
}

describe("POST /api/claim-check/extract", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetRateLimitForTests();
  });

  it("rate limits claim extraction requests before processing more text", async () => {
    vi.stubEnv("BRIEF_RATE_LIMIT_MAX", "1");
    vi.stubEnv("BRIEF_RATE_LIMIT_WINDOW_MS", "60000");

    function createRequest() {
      return new Request("http://localhost/api/claim-check/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "203.0.113.30"
        },
        body: JSON.stringify({ text: claimText() })
      });
    }

    const { POST } = await import("@/app/api/claim-check/extract/route");
    const firstResponse = await POST(createRequest());
    const secondResponse = await POST(createRequest());
    const payload = await secondResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(429);
    expect(secondResponse.headers.get("cache-control")).toContain("no-store");
    expect(secondResponse.headers.get("Retry-After")).toBeTruthy();
    expect(payload.error).toContain("Too many claim extraction requests");
  });
});

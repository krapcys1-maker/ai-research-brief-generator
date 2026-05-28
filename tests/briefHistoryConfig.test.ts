import { describe, expect, it } from "vitest";
import { isPublicBriefHistoryEnabled } from "@/lib/config/briefHistory";

describe("brief history visibility config", () => {
  it("is enabled by default outside production", () => {
    expect(isPublicBriefHistoryEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(isPublicBriefHistoryEnabled({ NODE_ENV: "test" })).toBe(true);
  });

  it("is disabled by default in production", () => {
    expect(isPublicBriefHistoryEnabled({ NODE_ENV: "production" })).toBe(false);
  });

  it("can be explicitly enabled or disabled", () => {
    expect(
      isPublicBriefHistoryEnabled({
        NODE_ENV: "production",
        PUBLIC_BRIEF_HISTORY_ENABLED: "true"
      })
    ).toBe(true);
    expect(
      isPublicBriefHistoryEnabled({
        NODE_ENV: "development",
        PUBLIC_BRIEF_HISTORY_ENABLED: "false"
      })
    ).toBe(false);
  });
});

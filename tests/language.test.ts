import { describe, expect, it } from "vitest";
import { detectQueryLanguage } from "@/lib/utils/language";

describe("detectQueryLanguage", () => {
  it("detects Polish queries with ASCII-only Polish words", () => {
    expect(
      detectQueryLanguage("wykrywanie halucynacji w modelach jezykowych")
    ).toBe("pl");
  });

  it("detects English queries", () => {
    expect(
      detectQueryLanguage("retrieval augmented generation in medicine")
    ).toBe("en");
  });
});

import { describe, expect, it } from "vitest";
import { generateQueryVariants } from "@/lib/ai/generateQueryVariants";

describe("generateQueryVariants", () => {
  it("keeps the original query and adds English academic variants for Polish input", () => {
    const variants = generateQueryVariants({
      query: "wykrywanie halucynacji w modelach jezykowych",
      outputLanguage: "pl"
    });

    expect(variants[0]).toBe("wykrywanie halucynacji w modelach jezykowych");
    expect(variants).toContain("detection hallucination models language");
    expect(variants.some((variant) => variant.includes("systematic review"))).toBe(
      true
    );
  });

  it("deduplicates variants for English input", () => {
    const variants = generateQueryVariants({
      query: "retrieval augmented generation",
      outputLanguage: "en"
    });

    expect(new Set(variants).size).toBe(variants.length);
    expect(variants[0]).toBe("retrieval augmented generation");
  });

  it("translates Polish biomedical treatment terms for live source search", () => {
    const variants = generateQueryVariants({
      query: "komórki macierzyste w leczeniu oparzeń",
      outputLanguage: "pl"
    });

    expect(variants).toContain("stem cells burn treatment");
    expect(variants).toContain("mesenchymal stem cells burn wound treatment");
  });
});

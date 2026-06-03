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

  it("creates academic English variants for Polish instruction tuning questions", () => {
    const variants = generateQueryVariants({
      query:
        "Wpływ fine-tuningu instrukcyjnego na jakość odpowiedzi modeli językowych",
      outputLanguage: "pl"
    });

    expect(variants).toContain(
      "instruction tuning response quality language models"
    );
    expect(variants).toContain(
      "instruction fine-tuning language models response quality"
    );
    expect(variants).toContain(
      "instruction tuning large language models evaluation"
    );
    expect(variants.some((variant) => variant.includes("wplyw fine-tuningu"))).toBe(
      false
    );
  });

  it("creates English variants for Polish breast cancer diagnosis questions", () => {
    const variants = generateQueryVariants({
      query: "zastosowanie uczenia maszynowego w diagnostyce raka piersi",
      outputLanguage: "pl"
    });

    expect(variants).toContain("machine learning breast cancer diagnosis");
    expect(variants).toContain("breast cancer diagnosis machine learning");
    expect(variants).toContain("artificial intelligence breast cancer diagnosis");
  });

  it("creates English variants for Polish transformer translation questions", () => {
    const variants = generateQueryVariants({
      query: "wpływ transformatorów na tłumaczenie maszynowe",
      outputLanguage: "pl"
    });

    expect(variants).toContain("transformer machine translation");
    expect(variants).toContain("transformer neural machine translation");
    expect(variants).toContain("Attention Is All You Need machine translation");
  });
});

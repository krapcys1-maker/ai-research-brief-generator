import { describe, expect, it } from "vitest";
import { getPaperMetadataWarnings } from "@/lib/pipeline/metadataQuality";
import { createPaper } from "@/tests/fixtures";

describe("getPaperMetadataWarnings", () => {
  it("flags suspicious metadata for known canonical papers", () => {
    const warnings = getPaperMetadataWarnings(
      createPaper({
        title: "Attention Is All You Need",
        year: 2025,
        source: "openalex",
        doi: "10.1000/unexpected",
        arxivId: null,
        sourceUrls: ["https://openalex.org/W2626778328"]
      }),
      2026
    );

    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("normally cited as a 2017 paper"),
        expect.stringContaining("expected canonical DOI/arXiv identifier")
      ])
    );
  });

  it("does not flag canonical papers with expected arXiv metadata", () => {
    const warnings = getPaperMetadataWarnings(
      createPaper({
        title: "Attention Is All You Need",
        year: 2017,
        source: "arxiv",
        doi: "10.48550/arXiv.1706.03762",
        arxivId: "1706.03762",
        sourceUrls: ["https://arxiv.org/abs/1706.03762"]
      }),
      2026
    );

    expect(warnings).toEqual([]);
  });

  it("flags future publication years", () => {
    const warnings = getPaperMetadataWarnings(
      createPaper({
        title: "Future Source Metadata",
        year: 2030,
        source: "openalex"
      }),
      2026
    );

    expect(warnings[0]).toContain("future year 2030");
  });
});

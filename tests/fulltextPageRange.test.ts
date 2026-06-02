import { describe, expect, it } from "vitest";
import { chunkPaperText } from "@/lib/fulltext/chunkText";
import { parseExtractedPdfText } from "@/lib/fulltext/parsePdf";
import { parsePageRange, selectPageTexts } from "@/lib/fulltext/pageRange";

const pageOne = [
  "Page one introduction.",
  ...Array.from({ length: 90 }, (_, index) => `intro${index}`)
].join(" ");
const pageTwo = [
  "Page two methods.",
  ...Array.from({ length: 90 }, (_, index) => `methods${index}`)
].join(" ");
const pageThree = [
  "Page three results.",
  ...Array.from({ length: 90 }, (_, index) => `results${index}`)
].join(" ");

describe("full-text page range support", () => {
  it("parses single-page and closed page ranges", () => {
    expect(parsePageRange("2")).toEqual({ startPage: 2, endPage: 2 });
    expect(parsePageRange("1-3")).toEqual({ startPage: 1, endPage: 3 });
    expect(parsePageRange(" 4 - 5 ")).toEqual({ startPage: 4, endPage: 5 });
    expect(parsePageRange("")).toBeNull();
  });

  it("rejects invalid page ranges", () => {
    expect(() => parsePageRange("0-2")).toThrow("positive integers");
    expect(() => parsePageRange("3-2")).toThrow("greater than or equal");
    expect(() => parsePageRange("intro")).toThrow("Invalid page range");
  });

  it("selects only requested extracted pages", () => {
    const selected = selectPageTexts([pageOne, pageTwo, pageThree], {
      startPage: 2,
      endPage: 3
    });

    expect(selected).toEqual({
      pageTexts: [pageTwo, pageThree],
      pageStart: 2,
      pageEnd: 3
    });
  });

  it("parses only selected page text and records the selected range", () => {
    const parsed = parseExtractedPdfText([pageOne, pageTwo, pageThree].join("\n\n"), {
      pageTexts: [pageOne, pageTwo, pageThree],
      pageRange: { startPage: 2, endPage: 2 }
    });

    expect(parsed.text).toContain("Page two methods");
    expect(parsed.text).not.toContain("Page one introduction");
    expect(parsed.text).not.toContain("Page three results");
    expect(parsed.pageStart).toBe(2);
    expect(parsed.pageEnd).toBe(2);
    expect(parsed.diagnostics.pageCount).toBe(1);
    expect(parsed.diagnostics.emptyPageCount).toBe(0);
  });

  it("stores page range metadata on generated chunks", () => {
    const chunks = chunkPaperText({
      paperId: "paper_1",
      fullTextId: "fulltext_1",
      text: `${pageTwo}\n\n${pageThree}`,
      chunkSizeTokens: 80,
      overlapTokens: 10,
      pageStart: 2,
      pageEnd: 3
    });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].pageStart).toBe(2);
    expect(chunks[0].pageEnd).toBe(3);
    expect(chunks.at(-1)?.pageStart).toBe(2);
    expect(chunks.at(-1)?.pageEnd).toBe(3);
  });
});

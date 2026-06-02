import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { chunkPaperText } from "@/lib/fulltext/chunkText";
import {
  createPdfParseDiagnostics,
  parseExtractedPdfText
} from "@/lib/fulltext/parsePdf";

function pdfFixtureText(filename: string) {
  return readFileSync(
    join(process.cwd(), "tests", "fixtures", "pdf-parser", filename),
    "utf8"
  );
}

describe("full-text PDF robustness fixtures", () => {
  it("rejects scanned or image-only PDFs when no OCR text is extracted", () => {
    const text = pdfFixtureText("scanned-no-ocr-extracted.txt");
    const diagnostics = createPdfParseDiagnostics(text, {
      pageTexts: [text, ""]
    });

    expect(diagnostics.emptyPageCount).toBe(2);
    expect(diagnostics.warnings).toEqual(
      expect.arrayContaining([
        "parser warning: 2 extracted PDF page(s) were empty.",
        "parser warning: extracted PDF text has a low word count.",
        "parser warning: extracted PDF text has a low character count."
      ])
    );
    expect(() =>
      parseExtractedPdfText(text, {
        pageTexts: [text, ""]
      })
    ).toThrow("too short or unusable");
  });

  it("keeps noisy extracted text parseable only with low-quality warnings", () => {
    const text = pdfFixtureText("noisy-corrupted-extracted.txt");
    const parsed = parseExtractedPdfText(text, {
      pageTexts: [text]
    });

    expect(parsed.text).toContain("aa ## %%");
    expect(parsed.diagnostics.wordCount).toBeGreaterThanOrEqual(80);
    expect(parsed.diagnostics.alphanumericRatio).toBeLessThan(0.45);
    expect(parsed.diagnostics.qualityScore).toBeLessThan(0.35);
    expect(parsed.diagnostics.warnings).toEqual(
      expect.arrayContaining([
        "parser warning: extracted PDF text has a low alphanumeric ratio.",
        "parser warning: extracted PDF quality score is low."
      ])
    );
  });

  it("warns on table-heavy extraction while preserving chunkable text", () => {
    const text = pdfFixtureText("table-heavy-extracted.txt");
    const parsed = parseExtractedPdfText(text, {
      pageTexts: [text]
    });
    const chunks = chunkPaperText({
      paperId: "paper_table_heavy",
      fullTextId: "fulltext_table_heavy",
      text: parsed.text,
      chunkSizeTokens: 60,
      overlapTokens: 10
    });

    expect(parsed.text).toContain("Metric | Cohort A | Cohort B");
    expect(parsed.diagnostics.warnings).toContain(
      "parser warning: extracted PDF text appears layout-heavy or table-like."
    );
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toMatchObject({
      paperId: "paper_table_heavy",
      evidenceLevel: "full_text_supported"
    });
  });

  it("rejects failed extraction artifacts that are only parser errors", () => {
    const text = pdfFixtureText("failed-extraction-extracted.txt");
    const diagnostics = createPdfParseDiagnostics(text, {
      pageTexts: [text]
    });

    expect(diagnostics.wordCount).toBeLessThan(80);
    expect(diagnostics.warnings).toEqual(
      expect.arrayContaining([
        "parser warning: extracted PDF text has a low word count.",
        "parser warning: extracted PDF text has a low character count."
      ])
    );
    expect(() =>
      parseExtractedPdfText(text, {
        pageTexts: [text]
      })
    ).toThrow("too short or unusable");
  });
});

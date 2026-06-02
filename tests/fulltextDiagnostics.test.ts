import { describe, expect, it } from "vitest";
import { getFullTextParserWarnings } from "@/lib/fulltext/diagnostics";

describe("full-text parser diagnostics", () => {
  it("reads serialized PDF parser diagnostics from paper metadata", () => {
    const warnings = getFullTextParserWarnings({
      fullTextStatus: "parsed",
      fullTextChunkCount: 2,
      fullTextQualityScore: 0.2,
      fullTextErrorMessage: JSON.stringify({
        type: "pdf_parse_diagnostics",
        parserName: "pdf-parse",
        parserVersion: "pdf-parse",
        pageCount: 3,
        emptyPageCount: 1,
        characterCount: 40,
        wordCount: 5,
        alphanumericRatio: 0.3,
        qualityScore: 0.2,
        warnings: [
          "parser warning: 1 extracted PDF page(s) were empty.",
          "parser warning: extracted PDF quality score is low."
        ]
      })
    });

    expect(warnings).toEqual([
      {
        label: "Parser warning",
        detail: "1 extracted PDF page(s) were empty."
      },
      {
        label: "Parser warning",
        detail: "extracted PDF quality score is low."
      }
    ]);
  });

  it("warns when parsed full text has a low quality score but no serialized diagnostics", () => {
    const warnings = getFullTextParserWarnings({
      fullTextStatus: "parsed",
      fullTextChunkCount: 1,
      fullTextQualityScore: 0.12,
      fullTextErrorMessage: null
    });

    expect(warnings).toEqual([
      {
        label: "Low parser quality",
        detail:
          "Extracted text quality score is 0.12. Treat full-text evidence from this PDF as weak until manually checked."
      }
    ]);
  });

  it("warns when parsing failed", () => {
    const warnings = getFullTextParserWarnings({
      fullTextStatus: "failed",
      fullTextChunkCount: 0,
      fullTextQualityScore: null,
      fullTextErrorMessage: "PDF request timed out"
    });

    expect(warnings).toEqual([
      {
        label: "Full-text extraction failed",
        detail: "PDF request timed out"
      }
    ]);
  });
});
